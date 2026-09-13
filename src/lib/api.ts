// API Configuration & WebSocket URL Helper

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    // If running on local developer machine, connect to FastAPI on 8000
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000";
    }

    // If an external backend is configured (e.g. hosted FastAPI on Render/Fly/EC2) and is NOT localhost
    const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
      return configured.replace(/\/$/, "");
    }

    // On mobile devices, Vercel, or LAN IP:
    // Always use same-origin relative URLs ("") so requests go to Next.js API routes with Supabase
    return "";
  }

  return "";
};

export const getWsUrl = (clientType: string, clientId: string = "") => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";

    // If local machine with Python backend on 8000
    if (host === "localhost" || host === "127.0.0.1") {
      return `ws://${host}:8000/ws/quiz/${clientType}${query}`;
    }

    // On Vercel or cloud domain
    return `${protocol}//${window.location.host}/ws/quiz/${clientType}${query}`;
  }
  return `ws://localhost:8000/ws/quiz/${clientType}`;
};
