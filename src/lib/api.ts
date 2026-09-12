// API Configuration & WebSocket URL Helper

export const getApiBaseUrl = () => {
  // If explicitly configured with an external backend URL
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // In browser on Vercel or local Next.js:
  // Using relative path "" routes directly to Next.js App Router API routes over HTTPS!
  if (typeof window !== "undefined") {
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
