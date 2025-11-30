// content.js - Ten skrypt działa w kontekście stron YouTube i PDF
console.log("BrainWave Focus Content Script załadowany.");

const FOCUS_OVERLAY_ID = 'brainwave-focus-overlay';
// Zmieniono: Usunięto rzutowanie (window as any)
window.__brainwave_blink_interval = null; // Zapewnienie, że interwał jest globalny

/**
 * Szuka głównego elementu wideo na stronie YouTube i próbuje je kontrolować.
 * @returns {HTMLVideoElement | null}
 */
function findAndControlVideo(action) {
    // 1. UŻYJ BARDZIEJ UNIWERSALNEGO SELEKTORA
    const videos = document.querySelectorAll('video');
    let mainVideo = null;

    // 2. Weryfikacja, aby znaleźć GŁÓWNE wideo (nie miniatury ani reklamy)
    for (const video of videos) {
        // Musi być widoczne i mieć minimalne wymiary (zwykle działa na głównym odtwarzaczu YT)
        if (video.offsetWidth > 100 && video.offsetHeight > 100 && video.offsetParent !== null) {
            mainVideo = video;
            break;
        }
    }

    if (mainVideo) {
        if (action === 'PAUSE' && !mainVideo.paused) {
            mainVideo.pause();
            console.log('BrainWave: Wideo YouTube ZATRZYMANE z powodu niskiego skupienia.');
            return mainVideo;
        } else if (action === 'RESUME' && mainVideo.paused) {
            console.log('BrainWave: Skupienie powróciło.');
            return mainVideo;
        }
    } else {
        // NIE znaleziono wideo - prawdopodobnie PDF lub inna strona, na której działa Content Script
        console.warn('BrainWave: Nie znaleziono głównego elementu wideo na stronie (Tryb PDF/Inny).');
    }
    return null;
}

/**
 * Tworzy lub usuwa nakładkę, dostosowując styl do Trybu (PAUSE/RESUME)
 * @param {string} action 'PAUSE' lub 'RESUME'
 */
function toggleOverlay(action) {
    let overlay = document.getElementById(FOCUS_OVERLAY_ID);
    // Używamy 'CHECK' jako akcji, która ma tylko sprawdzić istnienie wideo, bez pauzowania/wznawiania.
    const videoFound = findAndControlVideo('CHECK') !== null; 

    // ----------------------------------------------------
    // PAUSE/AKTYWACJA OSTRZEŻENIA
    // ----------------------------------------------------
    if (action === 'PAUSE') {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = FOCUS_OVERLAY_ID;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 999999999; 
                pointer-events: none; 
                opacity: 0;
                transition: opacity 0.5s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                color: black;
                text-shadow: 0 0 10px white;
                font-family: sans-serif;
                font-weight: bold;
            `;
            if (document.body) {
                document.body.appendChild(overlay);
            } else {
                console.error("BrainWave: Nie można dodać nakładki. Brak elementu <body>.");
                return;
            }
        }
        
        overlay.style.opacity = '1';

        if (videoFound) {
            // TRYB YOUTUBE: Migająca nakładka (Czerwony/Biały)
            overlay.innerHTML = '‼️ Wróć do Skupienia ‼️';
            overlay.style.color = 'white';
            
            // Logika migania
            // Zmieniono: Usunięto rzutowanie (window as any)
            if (!window.__brainwave_blink_interval) {
                window.__brainwave_blink_interval = setInterval(() => {
                    const currentOverlay = document.getElementById(FOCUS_OVERLAY_ID);
                    if (currentOverlay) {
                        const isWhite = currentOverlay.style.backgroundColor.includes('255, 255, 255');
                        currentOverlay.style.backgroundColor = isWhite 
                            ? 'rgba(255, 0, 0, 0.4)' // Czerwony (przyciemnienie wideo)
                            : 'rgba(255, 255, 255, 0.5)'; // Biały (alert)
                    } else {
                        // Zmieniono: Usunięto rzutowanie (window as any)
                        clearInterval(window.__brainwave_blink_interval);
                        window.__brainwave_blink_interval = null;
                    }
                }, 500);
            }
        } else {
            // TRYB PDF/INNY: Stała biała nakładka
            // W przypadku PDF chcemy, żeby ekran stał się bardzo jasny/biały.
            // Zmieniono: Usunięto rzutowanie (window as any)
            if (window.__brainwave_blink_interval) {
                clearInterval(window.__brainwave_blink_interval);
                window.__brainwave_blink_interval = null;
            }
            overlay.innerHTML = '‼️ Zbyt niski poziom koncentracji ‼️';
            overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'; // Prawie pełna biel
            overlay.style.color = 'black';
        }

    // ----------------------------------------------------
    // RESUME/DEZAKTYWACJA OSTRZEŻENIA
    // ----------------------------------------------------
    } else if (action === 'RESUME' && overlay) {
        // Zawsze czyścimy interwał
        // Zmieniono: Usunięto rzutowanie (window as any)
        if (window.__brainwave_blink_interval) {
            clearInterval(window.__brainwave_blink_interval);
            window.__brainwave_blink_interval = null;
        }
        
        overlay.style.opacity = '0';
        
        // Usuń element po animacji
        setTimeout(() => {
            if(overlay && overlay.parentElement) {
                overlay.parentElement.removeChild(overlay);
            }
        }, 500); 
    }
}


// Nasłuchuje wiadomości z pop-upu (Canvas App.tsx)
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "PAUSE") {
            // Jeśli znajdzie wideo, to je pauzuje, w przeciwnym razie tylko loguje.
            findAndControlVideo('PAUSE');
            // Nakładka jest kontrolowana na podstawie, czy wideo zostało znalezione wewnątrz toggleOverlay
            toggleOverlay('PAUSE');
            sendResponse({ status: "PAUSE_ACKNOWLEDGED" });
        } else if (request.action === "RESUME") {
            toggleOverlay('RESUME');
            sendResponse({ status: "RESUME_ACKNOWLEDGED" });
        }
        // Zwraca true, aby asynchronicznie wysłać odpowiedź
        return true; 
    }
);