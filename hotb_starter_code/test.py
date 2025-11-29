

import matplotlib.pyplot as plt
import matplotlib
import time
import os

from brainaccess.utils import acquisition
from brainaccess.core.eeg_manager import EEGManager

matplotlib.use("TKAgg", force=True)

eeg = acquisition.EEG()

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

os.makedirs('./data', exist_ok=True)

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

    print("Preparing to plot data")
    time.sleep(2)

    eeg.get_mne()
    eeg.stop_acquisition()
    mgr.disconnect()

mne_raw = eeg.data.mne_raw
print(f"MNE Raw object: {mne_raw}")

data, times = mne_raw.get_data(return_times=True)
print(f"Data shape: {data.shape}")

eeg.data.save(f'./data/{time.strftime("%Y%m%d_%H%M")}-raw.fif')
eeg.close()
mne_raw.apply_function(lambda x: x*10**-6)
mne_raw.filter(1, 40).plot(scalings="auto", verbose=False)
plt.show()