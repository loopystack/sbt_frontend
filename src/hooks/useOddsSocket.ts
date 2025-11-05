import { useEffect } from "react";
import { getWebSocketUrl } from "../config/api";

export function useOddsSocket(onMessage?: (data: any) => void) {
  useEffect(() => {
    const url = getWebSocketUrl('/ws/odds');
    const ws = new WebSocket(url);
    ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe", matches: ["match-1"] }));
    ws.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)); } catch {}
    };
    return () => ws.close();
  }, [onMessage]);
}
