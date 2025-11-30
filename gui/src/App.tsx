import { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react"; 

// =======================================================
// 1. Utility function: getConcentrationColor
// =======================================================
/**
 * Zwraca kolor na podstawie poziomu koncentracji.
 * @param {number} concentration Poziom koncentracji (0-100).
 * @returns {string} Kod koloru CSS.
 */
const getConcentrationColor = (concentration: number): string => {
    if (concentration >= 80) return "rgb(52, 211, 153)"; // Tailwind green-400
    if (concentration >= 60) return "rgb(251, 191, 36)"; // Tailwind yellow-400
    if (concentration >= 40) return "rgb(251, 146, 60)"; // Tailwind orange-400
    return "rgb(248, 113, 113)"; // Tailwind red-400
};

// =======================================================
// 2. Component: GlassPanel
// =======================================================
// Definicja typu dla propsów GlassPanel
interface GlassPanelProps {
    children: ReactNode; // ReactNode pozwala na przekazywanie dowolnego elementu JSX
}

// Użycie typu GlassPanelProps
const GlassPanel = ({ children }: GlassPanelProps) => {
    return (
        <div className="w-full h-full bg-[#161b22]/90 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 shadow-2xl transition-all duration-300">
            {children}
        </div>
    );
};

// =======================================================
// 3. Component: Toggle
// =======================================================
// Definicja typu dla propsów Toggle
interface ToggleProps {
    enabled: boolean;
    onChange: (value: boolean) => void;
}

// Użycie typu ToggleProps
const Toggle = ({ enabled, onChange }: ToggleProps) => {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                enabled ? 'bg-teal-600' : 'bg-gray-500'
            }`}
        >
            <span className="sr-only">Włącz/Wyłącz Tryb Nauki</span>
            <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
};


// =======================================================
// GŁÓWNY KOMPONENT APLIKACJI (App)
// =======================================================

// Definicja statusu połączenia
type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "ONLINE";

// ⚠️ WAŻNE: Adres serwera Pythona
const WS_URL = 'ws://127.0.0.1:8000/ws/focus'; 
const LOW_FOCUS_THRESHOLD = 20; // Próg do aktywacji ostrzeżenia

export default function App() {
    // Użycie typów dla useState
    const [learningMode, setLearningMode] = useState<boolean>(false);
    const [averageConcentration, setAverageConcentration] = useState<number>(0); 
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("DISCONNECTED");
    const [eegStatus, setEegStatus] = useState<string>("Nieaktywny"); 
    const [isConcentrating, setIsConcentrating] = useState<boolean>(true); // Stan do sygnalizowania ostrzeżenia
    const [isYouTubeActive, setIsYouTubeActive] = useState<boolean>(false); // Czy aktywna karta to YouTube
    const [isPdfActive, setIsPdfActive] = useState<boolean>(false); // NOWY STAN: Czy aktywna karta to PDF
    
    // Użycie typów dla useRef (WebSocket jest typu WebSocket lub null)
    const socketRef = useRef<WebSocket | null>(null);
    // Typowanie dla timeoutu (window.setTimeout zwraca number w przeglądarkach)
    const reconnectTimeoutRef = useRef<number | null>(null);

    // ----------------------------------------------------
    // 1. Logika ładowania Chrome Storage i sprawdzania aktywnej karty
    // ----------------------------------------------------
    useEffect(() => {
        const loadData = async () => {
            try {
                if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
                    // Ładowanie trybu nauki
                    chrome.storage.local.get("learningMode", (data: { learningMode?: boolean }) => {
                        if (data && data.learningMode !== undefined) {
                            setLearningMode(!!data.learningMode);
                        }
                    });

                    // Sprawdzenie, czy aktywna karta to YouTube lub PDF
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs.length > 0 && tabs[0].url) {
                            const url = tabs[0].url;
                            
                            const isYT = url.includes("youtube.com/watch");
                            const isPDF = url.toLowerCase().endsWith(".pdf"); // NOWE SPRAWDZENIE DLA PDF
                            
                            setIsYouTubeActive(isYT);
                            setIsPdfActive(isPDF);
                        } else {
                            setIsYouTubeActive(false);
                            setIsPdfActive(false);
                        }
                        setIsLoading(false); 
                    });

                } else {
                    console.warn("chrome.storage or chrome.tabs not available, using default state.");
                    setIsLoading(false);
                }
            } catch (e) {
                console.warn("Error accessing chrome APIs", e);
                setIsLoading(false);
            }
        };

        loadData();
    // Pusta tablica zależności, uruchamia się raz po załadowaniu
    }, []); 

    // ----------------------------------------------------
    // 2. Logika natywnego WebSocket i ponownego łączenia
    // ----------------------------------------------------
    useEffect(() => {
        
        const connectWebSocket = () => {
            
            if (socketRef.current && 
                (socketRef.current.readyState === WebSocket.OPEN || 
                 socketRef.current.readyState === WebSocket.CONNECTING)) {
                return;
            }

            setConnectionStatus("CONNECTING");
            
            const ws = new WebSocket(WS_URL);
            
            const scheduleReconnect = () => {
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }
                
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('WS: Próba ponownego połączenia...');
                    connectWebSocket(); 
                }, 5000) as unknown as number; 
            };


            ws.onopen = () => {
                console.log('WS: POŁĄCZONO pomyślnie z serwerem Pythona.');
                setConnectionStatus("ONLINE");
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
            };

            // Dodano typowanie dla eventu wiadomości
            ws.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.concentration !== undefined) {
                        setAverageConcentration(parseFloat(data.concentration));
                    }
                    
                    if (data.eeg_status !== undefined) {
                        setEegStatus(data.eeg_status);
                    }
                    
                } catch (error) {
                    console.error('WS: Błąd parsowania danych JSON:', error);
                }
            };

            // Dodano typowanie dla eventu zamknięcia
            ws.onclose = (event: CloseEvent) => {
                console.log(`WS: ROZŁĄCZONO. Kod: ${event.code}. Powód: ${event.reason || 'Brak'}`);
                setConnectionStatus("DISCONNECTED");
                setEegStatus("Nieaktywny");
                scheduleReconnect();
            };

            // Dodano typowanie dla eventu błędu
            ws.onerror = (error: Event) => {
                console.error('WS: BŁĄD POŁĄCZENIA:', error);
            };
            
            socketRef.current = ws;
        };
        
        connectWebSocket();

        // Funkcja czyszcząca
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            
            if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
                socketRef.current.close(1000, "Component unmounting");
            }
        };
    }, []); 

    
    // ----------------------------------------------------
    // 3. Logika ostrzegania i wysyłania wiadomości
    // ----------------------------------------------------
    useEffect(() => {
        // Ta funkcja wysyła wiadomość do aktywnej karty przeglądarki (Content Script)
        const sendWarningMessage = (action: 'PAUSE' | 'RESUME') => {
            // SPRAWDZENIE YT/PDF JEST KLUCZOWE
            if (!isYouTubeActive && !isPdfActive) {
                console.log("Ostrzeżenie: Aktywna karta nie jest ani YouTube, ani PDF. Ignorowanie PAUSE/RESUME.");
                return;
            }

            // Targetujemy YouTube lub URL kończący się na .pdf
            const targetUrl = isPdfActive ? "*://*/*.pdf" : "*://www.youtube.com/*";

            if (typeof chrome !== "undefined" && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true, url: targetUrl }, (tabs) => {
                    if (tabs.length > 0 && tabs[0].id) {
                        const tabId = tabs[0].id;
                        
                        chrome.tabs.sendMessage(tabId, { action: action }, (response) => {
                            if (chrome.runtime.lastError) {
                                // Ignorujemy błędy Content Script (często występuje, gdy strona jest odświeżana lub content script jeszcze nie załadowany)
                            } else if (response) {
                                console.log("Odebrano odpowiedź z Content Script:", response.status);
                            }
                        });
                    }
                });
            }
        };


        // Jeśli Tryb Nauki jest wyłączony, lub nie jesteśmy na YT/PDF, wysyłamy tylko RESUME i kończymy
        if (!learningMode) {
            if (!isConcentrating) {
                setIsConcentrating(true);
            }
            // ZAWSZE WYŚLIJ RESUME PRZY WYŁĄCZANIU TRYBU, aby odblokować wideo/ekran
            sendWarningMessage('RESUME');
            return; 
        }

        // Jeśli Tryb Nauki WŁĄCZONY, ale nie jesteśmy na YT ani PDF, nie robimy PAUSE
        if (learningMode && !isYouTubeActive && !isPdfActive) {
            return;
        }

        const isBelowThreshold = averageConcentration < LOW_FOCUS_THRESHOLD;

        // Warunek do AKTYWACJI ostrzeżenia
        if (isBelowThreshold && isConcentrating) {
            console.log(`POZIOM KRYTYCZNY: ${averageConcentration.toFixed(0)}%. Aktywacja ostrzeżenia.`);
            setIsConcentrating(false); // Ustawia stan rozkojarzenia
            sendWarningMessage('PAUSE'); // Wysyła sygnał do Content Script
        } 
        // Warunek do DEZAKTYWACJI ostrzeżenia
        else if (!isBelowThreshold && !isConcentrating) {
            console.log(`POWRÓT DO SKUPIENIA: ${averageConcentration.toFixed(0)}%. Dezaktywacja ostrzeżenia.`);
            setIsConcentrating(true); // Ustawia stan powrotu do skupienia
            sendWarningMessage('RESUME'); // Wysyła sygnał, aby przywrócić wideo/ekran
        }
        // Używamy dependency array, aby reagować na zmiany koncentracji i trybu.
    }, [averageConcentration, learningMode, isConcentrating, isYouTubeActive, isPdfActive]);


    // Aktualizacja stanu i Chrome Storage
    const handleLearningModeChange = (value: boolean) => {
        setLearningMode(value);

        try {
            chrome.runtime.sendMessage({
                type: "SET_LEARNING_MODE",
                value
            });

            chrome.storage.local.set({ learningMode: value });
        } catch (e) {
            console.warn("Failed to send message to background", e);
        }
    };


    if (isLoading) {
        return (
            <div className="flex w-[340px] min-h-[260px] bg-[#0d1117] text-white p-6 font-sans items-center justify-center">
                <div className="text-gray-400">Trwa ładowanie...</div>
            </div>
        );
    }

    const getEegStatusDisplay = () => {
        let text: string;
        let color: string;
        let pulse: boolean = false;

        if (connectionStatus === "DISCONNECTED") {
            text = "❌ Brak połączenia z serwerem. Uruchom uvicorn.";
            color = "text-red-400";
        } else if (connectionStatus === "CONNECTING") {
            text = "🟡 Trwa łączenie z serwerem Pythona...";
            color = "text-yellow-400";
            pulse = true;
        }
        else if (eegStatus.includes("Połączono z EEG")) {
            text = "✅ EEG: Aktywne i mierzy koncentrację.";
            color = "text-green-400";
        } else if (eegStatus.includes("Łączenie")) {
            text = "🟡 EEG: Trwa łączenie z urządzeniem...";
            color = "text-yellow-400";
            pulse = true;
        } else if (eegStatus.includes("BŁĄD")) {
            // Dodano sprawdzenie, aby uniknąć błędów, jeśli split nie znajdzie drugiego elementu
            const errorDetail = eegStatus.includes(':') ? eegStatus.split(':')[1].trim() : 'Sprawdź konsolę Pythona.';
            text = `❌ EEG: Błąd - ${errorDetail}`;
            color = "text-red-400";
        } else {
            text = `💤 EEG: ${eegStatus}. Analizator działa w tle.`;
            color = "text-gray-400";
        }

        return (
            <p className={`text-sm font-medium ${color} ${pulse ? 'animate-pulse' : ''} mt-1 mb-4 p-2 rounded bg-[#161b22] border border-gray-700`}>
                {text}
            </p>
        );
    };
    
    // Status ostrzeżenia
    const warningText = isYouTubeActive 
        ? "Wideo na YouTube zostało wstrzymane/przyciemnione."
        : isPdfActive
        ? "Ekran został przyciemniony (Alert PDF)."
        : "Aktywowano ostrzeżenie wizualne.";

    const warningStatus = learningMode && !isConcentrating && averageConcentration < LOW_FOCUS_THRESHOLD ? (
        <p className="text-sm font-bold text-red-400 animate-pulse mt-1">
            ⚠️ NISKIE SKUPIENIE! {warningText}
        </p>
    ) : null;
    
    // Status Aktywnej Strony
    const pageStatus = () => {
        if (isYouTubeActive) {
            return (
                <p className="text-sm text-green-400">
                    ✅ Aktywna strona: YouTube (kontrola wideo)
                </p>
            );
        } else if (isPdfActive) {
            return (
                <p className="text-sm text-blue-400">
                    📚 Aktywna strona: Plik PDF (białe ostrzeżenie ekranowe)
                </p>
            );
        } else {
            return (
                <p className="text-sm text-yellow-400">
                    🟡 Aktywna strona: Inna. Ostrzeżenia nie będą aktywne.
                </p>
            );
        }
    }


    return (
        <div className="flex w-[340px] min-h-[260px] bg-[#0d1117] text-white p-6 font-sans">
            <GlassPanel>
                {/* Nagłówek */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-teal-400 flex items-center justify-center text-black font-bold">
                        🧠
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-teal-300">BrainWave Focus</h1>
                </div>
                {/* Opis */}
                <p className="text-gray-300 leading-snug mb-4">
                    Zwiększ swoją koncentrację podczas nauki lub oglądania YouTube.
                </p>

                {/* Status Aktywnej Strony */}
                <div className="mb-4 p-2 rounded-lg bg-gray-800 border border-gray-700">
                    {pageStatus()}
                </div>
                
                {/* Status EEG */}
                <div className="mb-4">
                    {getEegStatusDisplay()}
                </div>
                
                {learningMode ? (
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-gray-300 text-center mb-2 text-sm">Aktualny Poziom Skupienia</div>

                        <div
                            className="text-4xl font-extrabold text-center mb-4 transition-colors duration-500"
                            style={{ color: getConcentrationColor(averageConcentration) }}
                        >
                            {averageConcentration.toFixed(0)} %
                        </div>
                        <p className="text-gray-500 text-xs">Dane przesyłane z silnika analitycznego.</p>
                        
                    </div>
                ) : (
                    <div className="mt-4 text-center p-4 rounded-xl bg-gray-800 border border-gray-700">
                        <p className="text-gray-400 font-semibold">Włącz tryb nauki, aby rozpocząć monitorowanie skupienia.</p>
                    </div>
                )}
                
                {/* Status ostrzeżenia */}
                <div className="h-4 mt-2 mb-2">
                    {warningStatus}
                </div>

                {/* Kontrola Trybu Nauki */}
                <div className="flex justify-between items-center mb-4 border-t border-gray-700 pt-4 mt-6">
                    <span className="text-lg font-medium">Tryb Nauki</span>
                    <Toggle enabled={learningMode} onChange={handleLearningModeChange} />
                </div>
                {/* Status Trybu Nauki */}
                <p className={`text-sm font-medium ${learningMode ? "text-green-400" : "text-red-400"}`}>
                    {learningMode
                        ? "🟢 Tryb nauki WŁĄCZONY — kontrola aktywności jest aktywna."
                        : "🔴 Tryb nauki WYŁĄCZONY — brak monitorowania skupienia."}
                </p>
            </GlassPanel>
        </div>
    );
}