import time
import threading
import numpy as np
import logging 
from scipy.signal import welch, butter, filtfilt
from brainaccess.utils import acquisition
from brainaccess.core.eeg_manager import EEGManager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DEVICE_NAME = "BA MINI 046"
SFREQ = 250.0
WINDOW_LEN = 3
UPDATE_INTERVAL = 0.5
EMA_ALPHA = 0.16
BANDPASS_LOW = 1.0
BANDPASS_HIGH = 40.0
MICROV_MULTIPLIER = 1e6

CAP: dict = {
 0: "F3", 1: "F4", 2: "PO3", 3: "PO4", 
 4: "CP1", 5: "CP2", 6: "O1", 7: "O2",
}

EPS = 1e-12

def bandpass_filter(data, fs, low=1.0, high=40.0, order=4):
    """Filtrowanie pasmowoprzepustowe danych EEG."""
    nyq = fs / 2.0
    low_cut = low / nyq
    high_cut = high / nyq
    b, a = butter(order, [low_cut, high_cut], btype='band')
    return filtfilt(b, a, data, axis=1)

def calculate_focus_score(eeg_data, fs, nperseg_sec=2.0):
    """Oblicza wynik skupienia."""
    nperseg = int(min(int(fs * nperseg_sec), eeg_data.shape[1]))
    if nperseg < 4:
        nperseg = None

    freqs, psd = welch(eeg_data, fs=fs, nperseg=nperseg, axis=1)
    mean_psd = np.mean(psd, axis=0)

    theta_idxs = np.logical_and(freqs >= 4.0, freqs <= 8.0)
    beta_idxs = np.logical_and(freqs >= 13.0, freqs <= 30.0)
    alpha_idxs = np.logical_and(freqs >= 8.0, freqs <= 12.0)

    theta_power = np.sum(mean_psd[theta_idxs]) + EPS
    beta_power = np.sum(mean_psd[beta_idxs]) + EPS
    alpha_power = np.sum(mean_psd[alpha_idxs]) + EPS

    weight_alpha = 0.3
    combined = beta_power + weight_alpha * alpha_power
    ratio_combined = combined / theta_power

    scale_factor = 4.0
    score = 100.0 * np.log1p(scale_factor * ratio_combined) / np.log1p(scale_factor * 3.0)
    score = np.clip(score, 0.0, 100.0)
    
    focus_scaled = (score - 30.0) / (70.0 - 30.0) * 100.0
    focus_scaled = np.clip(focus_scaled, 0.0, 100.0)

    return float(focus_scaled) 
# --------------------------------------------------------------------------------

class AnalysisEngine:
    """Silnik zarządzający akwizycją i analizą danych EEG w tle."""
    def __init__(self):
        logging.info("--- START INICJALIZACJI EEG ---")
        try:
            self.eeg = acquisition.EEG()
            logging.info("Instancja acquisition.EEG() utworzona.")
        except Exception as e:
            logging.error(f"FATALNY BŁĄD PRZY TWORZENIU OBIEKTU EEG: {e}")
            raise e
            
        self._is_running = False
        self._thread = None
        self._latest_focus_score = 0.0
        self.prev_focus = None
        self.TS = []
        self.connection_status = "Nieaktywny"
        logging.info("--- KONIEC INICJALIZACJI SILNIKA ---")

    def _analysis_loop(self):
        logging.info(f"Wątek analizy startuje. Łączenie z {DEVICE_NAME}...")
        try:
            self.connection_status = "Łączenie..." 
            
            with EEGManager() as mgr:
                self.eeg.setup(mgr, device_name=DEVICE_NAME, cap=CAP, sfreq=SFREQ)
                self.eeg.start_acquisition()
                
                self.connection_status = "Połączono z EEG" 
                logging.info("Akwizycja rozpoczęta. Czekam na bufor...")
                time.sleep(2.0) 

                while self._is_running:
                    loop_start = time.time()
                    
                    self.eeg.get_mne()
                    mne_raw = self.eeg.data.mne_raw

                    if mne_raw is not None:
                        data, _ = mne_raw.get_data(return_times=True)
                        n_samples_needed = int(WINDOW_LEN * SFREQ)

                        if data.shape[1] >= n_samples_needed:
                            recent_data = data[:, -n_samples_needed:].astype(np.float64)
                            recent_data = recent_data - np.mean(recent_data, axis=1, keepdims=True)

                            if np.max(np.abs(recent_data)) < 1e-3:
                                recent_data = recent_data * MICROV_MULTIPLIER

                            try:
                                recent_data = bandpass_filter(recent_data, SFREQ, BANDPASS_LOW, BANDPASS_HIGH)
                            except Exception:
                                pass

                            focus_score = calculate_focus_score(recent_data, SFREQ, nperseg_sec=2.0)

                            if self.prev_focus is None:
                                focus_smoothed = focus_score
                            else:
                                focus_smoothed = EMA_ALPHA * focus_score + (1.0 - EMA_ALPHA) * self.prev_focus
                            self.prev_focus = focus_smoothed

                            self.TS.append(focus_smoothed)
                            if len(self.TS) >= 2:
                                srednia = sum(self.TS) / len(self.TS)
                                final_score = np.clip(srednia, 0.0, 100.0)
                                
                                self._latest_focus_score = float(final_score)
                                logging.info(f"SKUPIENIE (Aktualna średnia): {final_score:6.2f}%")
                                self.TS.clear()

                    elapsed = time.time() - loop_start
                    sleep_time = max(0.01, UPDATE_INTERVAL - elapsed) 
                    time.sleep(sleep_time)

        except Exception as e:
            self.connection_status = f"BŁĄD POŁĄCZENIA: {e.__class__.__name__}"
            logging.critical(f"KRYTYCZNY BŁĄD WĄTKU ANALIZY (Połączenie/Akwizycja): {e}")
        finally:
            self.stop_acquisition_resources()
            self.connection_status = "Rozłączono"
            logging.info("Wątek analizy zakończył działanie.")


    def start(self):
        """Uruchamia analizę EEG w nowym wątku."""
        if not self._is_running:
            self._is_running = True
            self.connection_status = "Łączenie..."
            self._thread = threading.Thread(target=self._analysis_loop, name="EEGAnalysisThread")
            self._thread.daemon = True 
            self._thread.start()
            logging.info("Silnik analityczny uruchomiony w wątku tle.")

    def stop_acquisition_resources(self):
        """Zamyka zasoby brainaccess."""
        try:
            self.eeg.stop_acquisition()
            self.eeg.close()
            logging.info("Zasoby EEG zamknięte.")
        except Exception:
            pass

    def stop(self):
        """Zatrzymuje wątek analizy."""
        if self._is_running:
            self._is_running = False
            if self._thread and self._thread.is_alive():
                self._thread.join(timeout=2.0) 
            self.connection_status = "Nieaktywny"
            logging.info("Silnik analityczny zatrzymany.")


    def get_latest_focus_level(self) -> float:
        """Zwraca ostatni obliczony poziom skupienia."""
        return self._latest_focus_score
        
    def get_connection_status(self) -> str:
        """Zwraca aktualny status połączenia z urządzeniem EEG."""
        return self.connection_status

focus_analyzer = AnalysisEngine()