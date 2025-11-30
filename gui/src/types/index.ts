/**
 * TypeScript types and interfaces for the BrainWave Focus application
 */

export type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "ONLINE";

export interface GlassPanelProps {
    children: React.ReactNode;
}

export interface ToggleProps {
    enabled: boolean;
    onChange: (value: boolean) => void;
}

export interface WebSocketData {
    concentration?: number;
    eeg_status?: string;
}

export interface ChromeMessage {
    action: 'PAUSE' | 'RESUME';
}

export interface ChromeStorageData {
    learningMode?: boolean;
}

export interface ChromeBackgroundMessage {
    type: "SET_LEARNING_MODE";
    value: boolean;
}

export interface ConcentrationDisplayProps {
    concentration: number;
    isLearningMode: boolean;
}

export interface StatusDisplayProps {
    connectionStatus: ConnectionStatus;
    eegStatus: string;
    isYouTubeActive: boolean;
    isPdfActive: boolean;
}

export interface WarningStatusProps {
    learningMode: boolean;
    isConcentrating: boolean;
    concentration: number;
    isYouTubeActive: boolean;
    isPdfActive: boolean;
    threshold: number;
}