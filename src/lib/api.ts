// API Configuration & WebSocket URL Helper

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // If testing on a local network or custom host
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return `http://${host}:8000`;
  }
  return "http://localhost:8000";
};

export const getWsUrl = (clientType: string, clientId: string = "") => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
    return `${protocol}//${host}:8000/ws/quiz/${clientType}${query}`;
  }
  return `ws://localhost:8000/ws/quiz/${clientType}`;
};
