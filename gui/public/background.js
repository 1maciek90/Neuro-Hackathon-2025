
let learningMode = false;          // czy tryb nauki jest włączony
let concentration = 100;           // ostatni poziom skupienia
let isConcentrating = true;        // czy jesteśmy "powyżej progu"
const LOW_FOCUS_THRESHOLD = 20;    // próg skupienia (0–100)

let ws = null;                     // WebSocket do serwera Pythona


function connectWS() {
    console.log("BrainWave BG: Connecting to WS...");

    try {
        ws = new WebSocket("ws://127.0.0.1:8000/ws/focus");
    } catch (err) {
        console.error("BrainWave BG: WS create error:", err);
        setTimeout(connectWS, 3000);
        return;
    }

    ws.onopen = () => {
        console.log("BrainWave BG: WS connected");
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.concentration !== undefined) {
                concentration = Number(data.concentration);
                chrome.storage.local.set({ concentration });
                checkFocus(concentration);
            }

            if (data.eeg_status !== undefined) {
                chrome.storage.local.set({ eeg_status: data.eeg_status });
            }
        } catch (e) {
            console.warn("BrainWave BG: bad WS data", e);
        }
    };

    ws.onclose = () => {
        console.log("BrainWave BG: WS disconnected. Reconnecting...");
        setTimeout(connectWS, 3000);
    };

    ws.onerror = (err) => {
        console.warn("BrainWave BG: WS error:", err);
    };
}

connectWS();

function checkFocus(value) {
    if (!learningMode) return; 

    const below = value < LOW_FOCUS_THRESHOLD;

    if (below && isConcentrating) {
        isConcentrating = false;
        console.log("BrainWave BG: focus LOW -> PAUSE");
        sendToActiveTab("PAUSE");
    }

    if (!below && !isConcentrating) {
        isConcentrating = true;
        console.log("BrainWave BG: focus OK -> RESUME");
        sendToActiveTab("RESUME");
    }
}

function sendToActiveTab(action) {
    chrome.tabs.query(
        {
            url: [
                "*://*.youtube.com/*",
                "*://youtube.com/*"
            ]
        },
        (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.warn("BrainWave BG: No YouTube tabs found");
                return;
            }

            for (let tab of tabs) {
                if (!tab.id) continue;

                // Najpierw spróbuj wysłać PING żeby sprawdzić czy content script odpowiada
                chrome.tabs.sendMessage(tab.id, { action: "PING" }, (response) => {
                    const pingError = chrome.runtime.lastError;
                    
                    if (pingError) {
                        console.warn(`BrainWave BG: PING failed for tab ${tab.id}, injecting content script:`, pingError.message);
                        injectContentScript(tab.id);
                        
                        // Po wstrzyknięciu, poczekaj chwilę i wyślij akcję
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tab.id, { action }, (response) => {
                                const err = chrome.runtime.lastError;
                                if (err) {
                                    console.warn(`BrainWave BG: sendMessage error after injection for tab ${tab.id}:`, err.message);
                                } else {
                                    console.log(`BrainWave BG: ${action} sent successfully after injection to tab ${tab.id}`);
                                }
                            });
                        }, 1000);
                    } else {
                        // Content script odpowiedział na PING, można wysłać akcję
                        chrome.tabs.sendMessage(tab.id, { action }, (response) => {
                            const err = chrome.runtime.lastError;
                            if (err) {
                                console.warn(`BrainWave BG: sendMessage error for tab ${tab.id}:`, err.message);
                            } else {
                                console.log(`BrainWave BG: ${action} sent successfully to tab ${tab.id}`);
                            }
                        });
                    }
                });
                break; // Obsłuż tylko pierwszą kartę YouTube
            }
        }
    );
}

function injectContentScript(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
    }).catch(error => {
        console.error("BrainWave BG: Failed to inject content script:", error);
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "SET_LEARNING_MODE") {
        learningMode = Boolean(msg.value);
        chrome.storage.local.set({ learningMode });

        console.log("BrainWave BG: learningMode =", learningMode);

        if (!learningMode) {
            isConcentrating = true;
            sendToActiveTab("RESUME");
        }

        sendResponse?.({ ok: true });
    }

});
