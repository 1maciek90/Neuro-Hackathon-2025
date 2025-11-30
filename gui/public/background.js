// ===========================
//  BrainWave – BACKGROUND WORKER
//  działa nawet gdy popup jest zamknięty
// ===========================

let learningMode = false;          // czy tryb nauki jest włączony
let concentration = 100;           // ostatni poziom skupienia
let isConcentrating = true;        // czy jesteśmy "powyżej progu"
const LOW_FOCUS_THRESHOLD = 20;    // próg skupienia (0–100)

let ws = null;                     // WebSocket do serwera Pythona

// ===========================
// 1. WebSocket do serwera Pythona
// ===========================
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

// od razu startujemy po załadowaniu service workera
connectWS();


// ===========================
// 2. Logika fokusu – działa 24/7
// ===========================
function checkFocus(value) {
    if (!learningMode) return; // jeśli tryb nauki wyłączony – nic nie rób

    const below = value < LOW_FOCUS_THRESHOLD;

    // Spadek poniżej progu -> PAUSE
    if (below && isConcentrating) {
        isConcentrating = false;
        console.log("BrainWave BG: focus LOW -> PAUSE");
        sendToActiveTab("PAUSE");
    }

    // Powrót powyżej progu -> RESUME
    if (!below && !isConcentrating) {
        isConcentrating = true;
        console.log("BrainWave BG: focus OK -> RESUME");
        sendToActiveTab("RESUME");
    }
}


// ===========================
// 3. Wysyłanie akcji do content.js
// ===========================
function sendToActiveTab(action) {
    chrome.tabs.query(
        {
            url: ["*://www.youtube.com/*"]
        },
        (tabs) => {
            if (!tabs || tabs.length === 0) return;

            // bierzemy po prostu pierwszą kartę z YouTube
            const tabId = tabs[0].id;
            if (!tabId) return;

            chrome.tabs.sendMessage(tabId, { action }, () => {
                const err = chrome.runtime.lastError;
                if (err) {
                    console.warn("BrainWave BG: sendMessage error:", err.message);
                }
            });
        }
    );
}



// ===========================
// 4. Odbieranie wiadomości z popupu (React)
// ===========================

// popup wysyła:
// chrome.runtime.sendMessage({ type: "SET_LEARNING_MODE", value: true/false })
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "SET_LEARNING_MODE") {
        learningMode = Boolean(msg.value);
        chrome.storage.local.set({ learningMode });

        console.log("BrainWave BG: learningMode =", learningMode);

        // jeżeli ktoś wyłączy tryb nauki, to od razu RESUME, żeby odblokować wideo
        if (!learningMode) {
            isConcentrating = true;
            sendToActiveTab("RESUME");
        }

        sendResponse?.({ ok: true });
    }

    // ważne w MV3: jeśli mamy async, możemy zwrócić true, ale tu nie musimy
});
