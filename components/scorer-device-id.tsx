"use client";

import { useEffect, useState } from "react";

const SCORER_DEVICE_ID_KEY = "pikesville_mbb_scorer_device_id";

function createDeviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useScorerDeviceId() {
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    const existing = window.localStorage.getItem(SCORER_DEVICE_ID_KEY);
    const resolved = existing || createDeviceId();

    if (!existing) {
      window.localStorage.setItem(SCORER_DEVICE_ID_KEY, resolved);
    }

    setDeviceId(resolved);
  }, []);

  return deviceId;
}

export function ScorerDeviceIdInput() {
  const deviceId = useScorerDeviceId();

  return <input type="hidden" name="deviceId" value={deviceId} />;
}
