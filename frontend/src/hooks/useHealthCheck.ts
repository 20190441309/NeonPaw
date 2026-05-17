"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HealthStatus } from "@/lib/types";
import { callHealthApi } from "@/lib/api";

const POLL_INTERVAL = 60_000;

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    const data = await callHealthApi();
    if (mountedRef.current) {
      setHealth(data);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, [check]);

  return { health, isConnected: health !== null, refresh: check };
}
