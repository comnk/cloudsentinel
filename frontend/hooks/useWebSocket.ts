"use client";

import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";

export function useWebSocket<T>(topic: string) {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const brokerURL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080")
      .replace(/^http/, "ws") + "/ws";

    const client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(topic, (msg) => {
          setData(JSON.parse(msg.body) as T);
        });
      },
      onDisconnect: () => setConnected(false),
    });

    client.activate();
    return () => { client.deactivate(); };
  }, [topic]);

  return { data, connected };
}
