import { useEffect, useState } from "react";

// Imported components
import GlassPanel from './components/GlassPanel';
import Toggle from './components/Toggle';
import ConcentrationDisplay from './components/ConcentrationDisplay';
import { EegStatusDisplay, PageStatusDisplay, WarningStatusDisplay } from './components/StatusDisplay';

// Imported hooks and utilities
import { useWebSocket } from './hooks/useWebSocket';
import { loadLearningMode, checkActiveTabType, sendWarningMessage, updateLearningMode } from './utils/chromeExtension';

// ⚠️ WAŻNE: Adres serwera Pythona
const WS_URL = 'ws://127.0.0.1:8000/ws/focus'; 
const LOW_FOCUS_THRESHOLD = 20; // Próg do aktywacji ostrzeżenia

export default function App() {
    // State management
    const [learningMode, setLearningMode] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isConcentrating, setIsConcentrating] = useState<boolean>(true);
    const [isYouTubeActive, setIsYouTubeActive] = useState<boolean>(false);
    const [isPdfActive, setIsPdfActive] = useState<boolean>(false);
    
    // WebSocket hook
    const { connectionStatus, eegStatus, averageConcentration } = useWebSocket(WS_URL);

    // Load initial data from Chrome extension
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load learning mode from storage
                const learningModeValue = await loadLearningMode();
                setLearningMode(learningModeValue);

                // Check active tab type
                const { isYouTube, isPdf } = await checkActiveTabType();
                setIsYouTubeActive(isYouTube);
                setIsPdfActive(isPdf);

                setIsLoading(false);
            } catch (e) {
                console.warn("Error loading initial data", e);
                setIsLoading(false);
            }
        };

        loadData();
    }, []); 

    // Warning logic and message sending
    useEffect(() => {
        // If learning mode is disabled, send RESUME and return
        if (!learningMode) {
            if (!isConcentrating) {
                setIsConcentrating(true);
            }
            sendWarningMessage('RESUME', isYouTubeActive, isPdfActive);
            return; 
        }

        // If learning mode is ON but we're not on YT or PDF, don't do PAUSE
        if (learningMode && !isYouTubeActive && !isPdfActive) {
            return;
        }

        const isBelowThreshold = averageConcentration < LOW_FOCUS_THRESHOLD;

        // Activate warning
        if (isBelowThreshold && isConcentrating) {
            console.log(`POZIOM KRYTYCZNY: ${averageConcentration.toFixed(0)}%. Aktywacja ostrzeżenia.`);
            setIsConcentrating(false);
            sendWarningMessage('PAUSE', isYouTubeActive, isPdfActive);
        } 
        // Deactivate warning
        else if (!isBelowThreshold && !isConcentrating) {
            console.log(`POWRÓT DO SKUPIENIA: ${averageConcentration.toFixed(0)}%. Dezaktywacja ostrzeżenia.`);
            setIsConcentrating(true);
            sendWarningMessage('RESUME', isYouTubeActive, isPdfActive);
        }
    }, [averageConcentration, learningMode, isConcentrating, isYouTubeActive, isPdfActive]);


    // Handle learning mode change
    const handleLearningModeChange = (value: boolean) => {
        setLearningMode(value);
        updateLearningMode(value);
    };


    if (isLoading) {
        return (
            <div className="flex w-[340px] min-h-[260px] bg-[#0d1117] text-white p-6 font-sans items-center justify-center">
                <div className="text-gray-400">Trwa ładowanie...</div>
            </div>
        );
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
                <PageStatusDisplay 
                    isYouTubeActive={isYouTubeActive} 
                    isPdfActive={isPdfActive} 
                />
                
                {/* Status EEG */}
                <EegStatusDisplay 
                    connectionStatus={connectionStatus} 
                    eegStatus={eegStatus} 
                />
                
                {/* Concentration Display */}
                <ConcentrationDisplay 
                    concentration={averageConcentration} 
                    isLearningMode={learningMode} 
                />
                
                {/* Status ostrzeżenia */}
                <WarningStatusDisplay 
                    learningMode={learningMode}
                    isConcentrating={isConcentrating}
                    concentration={averageConcentration}
                    isYouTubeActive={isYouTubeActive}
                    isPdfActive={isPdfActive}
                    threshold={LOW_FOCUS_THRESHOLD}
                />

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