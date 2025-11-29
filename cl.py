import mne 
import os
import glob
import matplotlib.pyplot as plt

file_folder = './images/'
done_files = []

# Znajdź najnowszy plik w folderze
fif_files = glob.glob(os.path.join(file_folder, "*-raw.fif"))
if not fif_files:
    print(f"No FIF files found in {file_folder}")
else:
    # Weź tylko najnowszy plik (sortowanie po czasie modyfikacji)
    newest_file = max(fif_files, key=os.path.getmtime)
    print(f"Processing newest file: {os.path.basename(newest_file)}")
    
    try:
        raw = mne.io.read_raw_fif(newest_file, preload=True, verbose=False)
        
        # Poprawna kolejność:
        # 1. Konwersja do mikrowoltów
        raw.apply_function(lambda x: x*10**-7)
        
        # 2. Notch filter PRZED resamplingiem (oryginalna częstotliwość 250 Hz)
        raw.notch_filter(50, verbose=False)
        
        # 3. Resampling
        raw.resample(sfreq=100, verbose=False)
        
        # 4. Bandpass filter
        raw.filter(1, 40, verbose=False)

        # ZAKOMENTOWANE WYKRESY:
        raw.plot_psd(tmin=0, tmax=60, fmin=2, fmax=50, average=True, spatial_colors=False)
        # print(raw.info)
        
        # ica 
        ica = mne.preprocessing.ICA(n_components=6, random_state=97, method="fastica", verbose=False)  # Zmniejszono do 6 komponentów
        ica.fit(raw)
        
        # ZAKOMENTOWANE WYKRESY:
        #ica.plot_components()
        
        try:
            eog_inds, scorse = ica.find_bads_eog(raw)
            ica.exclude = eog_inds
        except:
            ica.exclude = []  # Jeśli nie ma kanałów EOG, nie wykluczaj żadnych komponentów
        
        raw_c = ica.apply(raw.copy())

        # ZAKOMENTOWANE WYKRESY:
        fig = raw_c.plot(scalings="auto", show=False)
        fig.set_size_inches(15,10)
        plt.show()

        done_files.append(raw_c)
        print(f"  Successfully processed")
        
    except Exception as e:
        print(f"  Error: {e}")

    print(f"\nSuccessfully processed {len(done_files)} files")
    
    # ZAKOMENTOWANE WYKRESY:
    # if done_files:
    #     first_file = done_files[0]
    #     first_file.plot(scalings="auto", verbose=False)