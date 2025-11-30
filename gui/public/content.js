// =============================
//  YouTube Focus Controller
// =============================
console.log("CONTENT.JS IS RUNNING!!!");

console.log("BrainWave Focus: content script loaded");

// Poczekaj aż strona będzie w pełni załadowana
function waitForYouTubeReady() {
    return new Promise((resolve) => {
        const checkReady = () => {
            const player = document.querySelector("video");
            if (player || document.readyState === 'complete') {
                resolve();
            } else {
                setTimeout(checkReady, 100);
            }
        };
        checkReady();
    });
}

// Inicjalizuj gdy strona jest gotowa
waitForYouTubeReady().then(() => {
    console.log("BrainWave Focus: YouTube ready, content script initialized");
});

let overlay = document.createElement("div");
overlay.id = "brainwave-focus-overlay";
overlay.style.position = "fixed";
overlay.style.top = 0;
overlay.style.left = 0;
overlay.style.width = "100vw";
overlay.style.height = "100vh";
overlay.style.background = "rgba(0,0,0,0.7)";
overlay.style.backdropFilter = "blur(4px)";
overlay.style.zIndex = "999999";
overlay.style.display = "none";
overlay.style.color = "white";
overlay.style.fontSize = "42px";
overlay.style.fontWeight = "bold";
overlay.style.justifyContent = "center";
overlay.style.alignItems = "center";
overlay.style.textAlign = "center";
overlay.innerText = "Skup się! 😵‍💫";
document.body.appendChild(overlay);

function getYouTubePlayer() {
    const player = document.querySelector("video");
    return player;
}

function pauseVideo() {
    const player = getYouTubePlayer();
    console.log("pauseVideo() player =", player);
    
    if (player && !player.paused) {
        try {
            player.pause();
            overlay.style.display = "flex";
            console.log("BrainWave → Video PAUSED successfully");
        } catch (error) {
            console.error("BrainWave: Error pausing video:", error);
        }
    } else if (!player) {
        console.warn("BrainWave: No video element found for pause");
        // Spróbuj ponownie po krótkim czasie (YouTube może jeszcze ładować)
        setTimeout(() => {
            const retryPlayer = getYouTubePlayer();
            if (retryPlayer && !retryPlayer.paused) {
                retryPlayer.pause();
                overlay.style.display = "flex";
                console.log("BrainWave → Video PAUSED on retry");
            }
        }, 1000);
    } else {
        console.log("BrainWave → Video already paused");
    }
}

function resumeVideo() {
    const player = getYouTubePlayer();
    console.log("resumeVideo() player =", player);
    
    if (player && player.paused) {
        try {
            player.play().then(() => {
                overlay.style.display = "none";
                console.log("BrainWave → Video RESUMED successfully");
            }).catch(error => {
                console.error("BrainWave: Error resuming video:", error);
            });
        } catch (error) {
            console.error("BrainWave: Error calling play():", error);
        }
    } else if (!player) {
        console.warn("BrainWave: No video element found for resume");
        // Ukryj overlay nawet jeśli nie ma video
        overlay.style.display = "none";
    } else {
        console.log("BrainWave → Video already playing");
        overlay.style.display = "none";
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("BrainWave content.js: odebrano wiadomość:", msg);

    if (msg.action === "PING") {
        console.log("BrainWave content.js: odpowiadamy na PING");
        sendResponse({ status: "ready" });
        return true;
    }

    if (msg.action === "PAUSE") {
        console.log("BrainWave content.js: wykonuję PAUSE");
        pauseVideo();
        overlay.style.display = "flex";
        sendResponse({ status: "paused" });
        return true;
    }
    
    if (msg.action === "RESUME") {
        console.log("BrainWave content.js: wykonuję RESUME");
        resumeVideo();
        overlay.style.display = "none";
        sendResponse({ status: "resumed" });
        return true;
    }

    return false; // Nie obsługujemy tej wiadomości
});

let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        console.log("BrainWave: YT URL changed → reinit");
        lastUrl = url;

        overlay.style.display = "none";
    }
}).observe(document, { subtree: true, childList: true });

console.log("BrainWave Focus: content script initialized");
