import type { StatusDisplayProps, WarningStatusProps } from '../types';

/**
 * Component for displaying EEG connection status
 */
export function EegStatusDisplay({ connectionStatus, eegStatus }: Pick<StatusDisplayProps, 'connectionStatus' | 'eegStatus'>) {
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
            const errorDetail = eegStatus.includes(':') ? eegStatus.split(':')[1].trim() : 'Sprawdź konsolę Pythona.';
            text = `❌ EEG: Błąd - ${errorDetail}`;
            color = "text-red-400";
        } else {
            text = `💤 EEG: ${eegStatus}. Analizator działa w tle.`;
            color = "text-gray-400";
        }

        return { text, color, pulse };
    };

    const { text, color, pulse } = getEegStatusDisplay();

    return (
        <div className="mb-4">
            <p className={`text-sm font-medium ${color} ${pulse ? 'animate-pulse' : ''} mt-1 mb-4 p-2 rounded bg-[#161b22] border border-gray-700`}>
                {text}
            </p>
        </div>
    );
}

/**
 * Component for displaying active page status
 */
export function PageStatusDisplay({ isYouTubeActive, isPdfActive }: Pick<StatusDisplayProps, 'isYouTubeActive' | 'isPdfActive'>) {
    const getPageStatus = () => {
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
    };

    return (
        <div className="mb-4 p-2 rounded-lg bg-gray-800 border border-gray-700">
            {getPageStatus()}
        </div>
    );
}

/**
 * Component for displaying warning status when concentration is low
 */
export function WarningStatusDisplay({ 
    learningMode, 
    isConcentrating, 
    concentration, 
    isYouTubeActive, 
    isPdfActive, 
    threshold 
}: WarningStatusProps) {
    if (!learningMode || isConcentrating || concentration >= threshold) {
        return <div className="h-4 mt-2 mb-2"></div>;
    }

    const warningText = isYouTubeActive 
        ? "Wideo na YouTube zostało wstrzymane/przyciemnione."
        : isPdfActive
        ? "Ekran został przyciemniony (Alert PDF)."
        : "Aktywowano ostrzeżenie wizualne.";

    return (
        <div className="h-4 mt-2 mb-2">
            <p className="text-sm font-bold text-red-400 animate-pulse mt-1">
                ⚠️ NISKIE SKUPIENIE! {warningText}
            </p>
        </div>
    );
}