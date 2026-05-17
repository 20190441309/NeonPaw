"use client";

import { useState, useEffect, useCallback } from "react";
import { HealthStatus } from "@/lib/types";
import { callHealthApi } from "@/lib/api";

const POLL_INTERVAL = 60_000;

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const check = useCallback(async () => {
    const data = await callHealthApi();
    setHealth(data);
    setIsConnected(data !== null);
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [check]);

  return { health, isConnected, refresh: check };
}
