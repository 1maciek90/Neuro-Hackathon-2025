import time
import numpy as np
from scipy.signal import welch, butter, filtfilt
from brainaccess.utils import acquisition
from brainaccess.core.eeg_manager import EEGManager

# --- KONFIGURACJA ---
DEVICE_NAME = "BA MINI 046"
SFREQ = 250.0         # Hz
WINDOW_LEN = 3      # s (okno analizowane)
UPDATE_INTERVAL = 0.5 # s (jak często wypisywać wynik)
EMA_ALPHA = 0.16      # wygładzanie (mniejsze = bardziej gładkie)
BANDPASS_LOW = 1.0    # Hz
BANDPASS_HIGH = 40.0  # Hz
MICROV_MULTIPLIER = 1e6  # jeśli chcesz przeliczyć V -> µV

cap: dict = {
 0: "F3", 1: "F4", 2: "PO3", 3: "PO4", 
 4: "CP1", 5: "CP2", 6: "O1", 7: "O2",
}

EPS = 1e-12  # zabezpieczenie przed dzieleniem przez zero

# --- filtr pasmowy ---
def bandpass_filter(data, fs, low=1.0, high=40.0, order=4):
    nyq = fs / 2.0
    low_cut = low / nyq
    high_cut = high / nyq
    b, a = butter(order, [low_cut, high_cut], btype='band')
    return filtfilt(b, a, data, axis=1)

# --- obliczanie wskaźnika ---
def calculate_focus_score(eeg_data, fs, nperseg_sec=2.0):
    nperseg = int(min(int(fs * nperseg_sec), eeg_data.shape[1]))
    if nperseg < 4:
        nperseg = None

    freqs, psd = welch(eeg_data, fs=fs, nperseg=nperseg, axis=1)
    mean_psd = np.mean(psd, axis=0)

    theta_idxs = np.logical_and(freqs >= 4.0, freqs <= 8.0)
    beta_idxs  = np.logical_and(freqs >= 13.0, freqs <= 30.0)
    alpha_idxs = np.logical_and(freqs >= 8.0, freqs <= 12.0)

    theta_power = np.sum(mean_psd[theta_idxs]) + EPS
    beta_power  = np.sum(mean_psd[beta_idxs]) + EPS
    alpha_power = np.sum(mean_psd[alpha_idxs]) + EPS

    # Ratio + kombinacja
    ratio = beta_power / theta_power
    weight_alpha = 0.3
    combined = beta_power + weight_alpha * alpha_power
    ratio_combined = combined / theta_power

    scale_factor = 4.0
    score = 100.0 * np.log1p(scale_factor * ratio_combined) / np.log1p(scale_factor * 3.0)
    score = np.clip(score, 0.0, 100.0)

    return float(score), float(ratio), float(theta_power), float(beta_power), float(alpha_power)

# === GŁÓWNA PĘTLA ===
TW = []
if __name__ == "__main__":
    print("Start programu...")
    eeg = acquisition.EEG()

    with EEGManager() as mgr:
        print(f"Łączenie z {DEVICE_NAME}...")
        eeg.setup(mgr, device_name=DEVICE_NAME, cap=cap, sfreq=SFREQ)
        eeg.start_acquisition()
        print("Akwizycja rozpoczęta. Czekam na zgromadzenie bufora...")
        time.sleep(2.0)

        try:
            last_sample_count = 0
            prev_focus = None
            
            TS = []

            while True:
                loop_start = time.time()

                eeg.get_mne()
                mne_raw = eeg.data.mne_raw

                if mne_raw is not None:
                    data, times = mne_raw.get_data(return_times=True)
                    n_samples_needed = int(WINDOW_LEN * SFREQ)

                    if data.shape[1] >= n_samples_needed:
                        t0 = time.time()

                        recent_data = data[:, -n_samples_needed:].astype(np.float64)
                        recent_data = recent_data - np.mean(recent_data, axis=1, keepdims=True)

                        if np.max(np.abs(recent_data)) < 1e-3:
                            recent_data = recent_data * MICROV_MULTIPLIER

                        try:
                            recent_data = bandpass_filter(recent_data, SFREQ, BANDPASS_LOW, BANDPASS_HIGH)
                        except Exception as e:
                            print("Uwaga: filtr pasmowy nie powiódł się:", e)

                        focus, ratio, theta_power, beta_power, alpha_power = calculate_focus_score(recent_data, SFREQ, nperseg_sec=2.0)

                        # EMA wygładzenie
                        if prev_focus is None:
                            focus_smoothed = focus
                        else:
                            focus_smoothed = EMA_ALPHA * focus + (1.0 - EMA_ALPHA) * prev_focus
                        prev_focus = focus_smoothed

                        # Obliczenie concentration_score
                        concentration_score = (
                            (beta_power / theta_power) * 0.5 +
                            (beta_power / alpha_power) * 0.3 +
                            (beta_power / (alpha_power + theta_power)) * 0.2
                        )

                        processing_time = time.time() - t0

                        # inkrementalny delay
                        current_sample_count = data.shape[1]
                        delta_samples = current_sample_count - last_sample_count
                        delta_time = delta_samples / SFREQ
                        delay = max(0.0, UPDATE_INTERVAL - delta_time)
                        last_sample_count = current_sample_count

                        # przeskalowanie focus 30-70 → 0-100
                        focus_scaled = (focus_smoothed - 30.0) / (70.0 - 30.0) * 100.0
                        focus_scaled = np.clip(focus_scaled, 0.0, 100.0)
                        #return do programu to focus_scaled

                        # pasek dla focus
                        bars_focus = int(np.round(focus_scaled / 5.0))
                        bars_focus = max(0, min(20, bars_focus))
                        progress_focus = "|" + "#" * bars_focus + "-" * (20 - bars_focus) + "|"

                        # pasek dla concentration_score
                        concentration_scaled = np.clip(concentration_score, 0.0, 100.0)
                        bars_conc = max(0, min(50, int(concentration_scaled / 2)))
                        percentage = int(concentration_scaled)
                        progress_conc = f"[{'█' * bars_conc}{' ' * (50 - bars_conc)}] {percentage}%"

                        # tekstowa interpretacja
                        if concentration_score > 70:
                            conc_text = "WYSOKA"
                        elif concentration_score > 40:
                            conc_text = "ŚREDNIA"
                        else:
                            conc_text = "NISKA "

                        # print(f"Skupienie: {focus_scaled:6.2f} {progress_focus} | Konc: {concentration_scaled:3.0f}% ({conc_text}) | Proc: {processing_time*1000:6.1f} ms | Delay: {delay:5.3f} s")
                        # print(progress_conc)
                        # print(f"  (theta: {theta_power:.3e}, beta: {beta_power:.3e}, alpha: {alpha_power:.3e}, ratio: {ratio:.4f})")

                        TS.append(focus_scaled)
                        if(len(TS)  == 20 ):
                            srednia = sum(TS)/len(TS)
                            print("SKUPIENIE:", srednia)
                            TW.append(srednia)
                            TS.clear()
                        
                        
                        
                elapsed = time.time() - loop_start
                sleep_time = max(0.0, UPDATE_INTERVAL - elapsed)
                time.sleep(sleep_time)

        
        
        except KeyboardInterrupt:
            print("\nZatrzymywanie...")
        finally:
            eeg.stop_acquisition()
            mgr.disconnect()
            eeg.close()
            
            print("Rozłączono.")