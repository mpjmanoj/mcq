import json
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("ws_manager")

class ConnectionManager:
    def __init__(self):
        # Active connections grouped by client category
        self.displays: Set[WebSocket] = set()
        self.admins: Set[WebSocket] = set()
        self.participants: Dict[str, Set[WebSocket]] = {}  # participant_id -> Set[WebSocket]
        self.all_sockets: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, client_type: str, client_id: str = ""):
        await websocket.accept()
        self.all_sockets.add(websocket)
        if client_type == "display":
            self.displays.add(websocket)
        elif client_type == "admin":
            self.admins.add(websocket)
        elif client_type == "participant":
            if client_id not in self.participants:
                self.participants[client_id] = set()
            self.participants[client_id].add(websocket)
        logger.info(f"WS Connected: {client_type} {client_id}. Total: {len(self.all_sockets)}")

    def disconnect(self, websocket: WebSocket, client_type: str, client_id: str = ""):
        self.all_sockets.discard(websocket)
        if client_type == "display":
            self.displays.discard(websocket)
        elif client_type == "admin":
            self.admins.discard(websocket)
        elif client_type == "participant" and client_id in self.participants:
            self.participants[client_id].discard(websocket)
            if not self.participants[client_id]:
                del self.participants[client_id]
        logger.info(f"WS Disconnected: {client_type} {client_id}. Total: {len(self.all_sockets)}")

    async def broadcast_all(self, event_type: str, payload: Any):
        """Broadcast an event to every connected client."""
        message = json.dumps({"event": event_type, "data": payload})
        dead_sockets = set()
        for ws in self.all_sockets:
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.warning(f"Error broadcasting to socket: {e}")
                dead_sockets.add(ws)
        self.all_sockets.difference_update(dead_sockets)

    async def broadcast_to_screens(self, event_type: str, payload: Any):
        """Broadcast to main displays and admins."""
        message = json.dumps({"event": event_type, "data": payload})
        targets = self.displays.union(self.admins)
        dead_sockets = set()
        for ws in targets:
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.warning(f"Error sending to screen/admin: {e}")
                dead_sockets.add(ws)
        self.displays.difference_update(dead_sockets)
        self.admins.difference_update(dead_sockets)
        self.all_sockets.difference_update(dead_sockets)

    async def send_to_participant(self, participant_id: str, event_type: str, payload: Any):
        """Send message specifically to a participant's active sockets."""
        if participant_id in self.participants:
            message = json.dumps({"event": event_type, "data": payload})
            dead_sockets = set()
            for ws in self.participants[participant_id]:
                try:
                    await ws.send_text(message)
                except Exception as e:
                    logger.warning(f"Error sending to participant {participant_id}: {e}")
                    dead_sockets.add(ws)
            self.participants[participant_id].difference_update(dead_sockets)
            self.all_sockets.difference_update(dead_sockets)

ws_manager = ConnectionManager()
