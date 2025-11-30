// =============================
//  YouTube Focus Controller
// =============================
console.log("CONTENT.JS IS RUNNING!!!");

console.log("BrainWave Focus: content script loaded");

// Tworzymy overlay (ciemny ekran przy niskim skupieniu)
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

// =============================
// Funkcja: uzyskanie odtwarzacza YT
// =============================
function getYouTubePlayer() {
    const player = document.querySelector("video");
    return player;
}

// =============================
// Funkcja: pauzowanie
// =============================
function pauseVideo() {
    const player = document.querySelector("video");
    console.log("pauseVideo() player =", player);
    if (player) {
        player.pause();
        player.currentTime = player.currentTime; // wymuszenie repaint
        overlay.style.display = "flex";
        console.log("BrainWave → PAUSE wysłane do YouTube");
    } else {
        console.error("BrainWave: Nie znaleziono elementu <video>");
    }
}


// =============================
// Funkcja: wznowienie
// =============================
function resumeVideo() {
    const player = getYouTubePlayer();
    if (player) {
        player.play();
        overlay.style.display = "none";
        console.log("BrainWave → RESUME wysłane do YouTube");
    } else {
        console.error("BrainWave: Nie znaleziono elementu <video>");
    }
}

// =============================
// Nasłuchiwanie wiadomości z popupu
// =============================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("BrainWave content.js: odebrano wiadomość:", msg);

    if (msg.action === "PAUSE") {
        console.log("BrainWave content.js: wykonuję PAUSE");
        pauseVideo();
        overlay.style.display = "flex";
        sendResponse?.({ status: "paused" });
    }
    
    if (msg.action === "RESUME") {
        console.log("BrainWave content.js: wykonuję RESUME");
        resumeVideo();
        overlay.style.display = "none";
        sendResponse?.({ status: "resumed" });
    }
});



// =============================
// Obsługa zmian w SPA YouTube (zmiana filmu bez przeładowania)
// =============================
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
