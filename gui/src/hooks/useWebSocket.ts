import { useRef, useEffect, useState } from 'react';
import type { ConnectionStatus, WebSocketData } from '../types';

/**
 * Custom hook for managing WebSocket connection to the Python server
 */
export function useWebSocket(url: string) {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("DISCONNECTED");
    const [eegStatus, setEegStatus] = useState<string>("Nieaktywny");
    const [averageConcentration, setAverageConcentration] = useState<number>(0);
    
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const connectWebSocket = () => {
            if (socketRef.current && 
                (socketRef.current.readyState === WebSocket.OPEN || 
                 socketRef.current.readyState === WebSocket.CONNECTING)) {
                return;
            }

            setConnectionStatus("CONNECTING");
            
            const ws = new WebSocket(url);
            
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

            ws.onmessage = (event: MessageEvent) => {
                try {
                    const data: WebSocketData = JSON.parse(event.data);
                    
                    if (data.concentration !== undefined) {
                        setAverageConcentration(parseFloat(data.concentration.toString()));
                    }
                    
                    if (data.eeg_status !== undefined) {
                        setEegStatus(data.eeg_status);
                    }
                    
                } catch (error) {
                    console.error('WS: Błąd parsowania danych JSON:', error);
                }
            };

            ws.onclose = (event: CloseEvent) => {
                console.log(`WS: ROZŁĄCZONO. Kod: ${event.code}. Powód: ${event.reason || 'Brak'}`);
                setConnectionStatus("DISCONNECTED");
                setEegStatus("Nieaktywny");
                scheduleReconnect();
            };

            ws.onerror = (error: Event) => {
                console.error('WS: BŁĄD POŁĄCZENIA:', error);
            };
            
            socketRef.current = ws;
        };
        
        connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            
            if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
                socketRef.current.close(1000, "Component unmounting");
            }
        };
    }, [url]);

    return {
        connectionStatus,
        eegStatus,
        averageConcentration
    };
}