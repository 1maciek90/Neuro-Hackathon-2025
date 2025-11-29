
import matplotlib.pyplot as plt
import matplotlib
import time
import os
import subprocess
import sys

from brainaccess.utils import acquisition
from brainaccess.core.eeg_manager import EEGManager

matplotlib.use("TKAgg", force=True)


halo: dict = {
    0: "Fp1",
    1: "Fp2",
    2: "O1",
    3: "O2",
}

cap: dict = {
 0: "F3",
 1: "F4",
 2: "C3",
 3: "C4",
 4: "P3",
 5: "P4",
 6: "O1",
 7: "O2",
}


device_name = "BA MINI 046"
os.makedirs('./images', exist_ok=True)


n_measurements = 1  

for measurement_num in range(1, n_measurements + 1):
    print(f"\n=== Starting measurement {measurement_num}/{n_measurements} ===")
    
    eeg = acquisition.EEG()
   
   
    with EEGManager() as mgr:
        eeg.setup(mgr, device_name=device_name, cap=cap, sfreq=250)

      
        eeg.start_acquisition()
        print("Acquisition started")
        time.sleep(3)
        start_time = time.time()
        annotation = 1
        while time.time() - start_time < 5:
            time.sleep(1)
            print(f"Sending annotation {annotation} to the device")
            eeg.annotate(str(annotation))
            annotation += 1

        print("tu byl plot")
        time.sleep(2)
        eeg.get_mne()
        eeg.stop_acquisition()
        mgr.disconnect()

    mne_raw = eeg.data.mne_raw
    print(f"MNE Raw object: {mne_raw}")

    data, times = mne_raw.get_data(return_times=True)
    print(f"Data shape: {data.shape}")

    filename = f'./images/{time.strftime("%Y%m%d_%H%M%S")}-raw.fif'
    eeg.data.save(filename)
  
    eeg.close()
    
    print(f"Saved: {filename}")
    
    print("Running data processing...")
    result = subprocess.run([sys.executable, "cl.py"], capture_output=True, text=True)
    
    if result.stdout:
        print("cl.py output:")
        print(result.stdout)
    if result.stderr:
        print("cl.py errors:")
        print(result.stderr)
    
    print(f"=== Measurement {measurement_num}/{n_measurements} completed ===")
    
    if measurement_num < n_measurements:
        print("Waiting 5 seconds before next measurement...")
       

print(f"\n=== All {n_measurements} measurements completed ===")