import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Set

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketDisconnect

from analysys_engine import focus_analyzer 

active_connections: Set[WebSocket] = set()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Zarządza cyklem życia aplikacji FastAPI.
    Analizator EEG jest uruchamiany RAZ i działa przez cały czas życia serwera, 
    aby uniknąć błędu dostępu przy ciągłym zamykaniu i otwieraniu wątku EEG.
    """
    logging.warning("SERWER: Uruchamiam analizator EEG w wątku tła (przetrwa wszystkie WS).")
    focus_analyzer.start() 
    yield
    focus_analyzer.stop()
    logging.warning("SERWER: Zamknięcie aplikacji. Zatrzymano analizator EEG.")

app = FastAPI(lifespan=lifespan)

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/focus")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    
    current_connections = len(active_connections)
    logging.info(f"WS: NOWE POŁĄCZENIE. Aktywne klienty: {current_connections}")


    try:
        while True:
            await asyncio.sleep(0.5) 
            
            concentration_value = focus_analyzer.get_latest_focus_level()
            eeg_status = focus_analyzer.get_connection_status()

            data_to_send = {
                "concentration": concentration_value,
                "eeg_status": eeg_status 
            }            
            await websocket.send_json(data_to_send)

    except WebSocketDisconnect:
        logging.info("WS: Klient WebSocket rozłączony (normalne rozłączenie).")
    except Exception as e:
        logging.error(f"WS: Wyjątek w połączeniu WebSocket: {e.__class__.__name__}")
    finally:
        active_connections.remove(websocket)
        remaining_connections = len(active_connections)
        logging.info(f"WS: ROZŁĄCZENIE. Pozostało klientów: {remaining_connections}")
        
