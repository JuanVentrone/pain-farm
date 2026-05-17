import type {
  DevicesStatusResponse,
  GeneralStatusResponse,
  GeneralSwitchResponse,
  HeartbeatResponse,
  PowerMetricsResponse,
  SwitchContactorResult,
  SwitchRequest,
} from "./types";

const PREFIX = "/api/backend";

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data: T | null; status: number; error?: string }> {
  try {
    const res = await fetch(`${PREFIX}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const text = await res.text();
    let data: T | null = null;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      return {
        ok: false,
        data,
        status: res.status,
        error: text || res.statusText,
      };
    }
    return { ok: true, data, status: res.status };
  } catch (e) {
    return {
      ok: false,
      data: null,
      status: 0,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export function getPowerMetrics() {
  return apiFetch<PowerMetricsResponse>("/metrics/power");
}

export function getHeartbeat() {
  return apiFetch<HeartbeatResponse>("/heartbeat");
}

export function getDevicesStatus() {
  return apiFetch<DevicesStatusResponse>("/devices/status");
}

export function getGeneralStatus() {
  return apiFetch<GeneralStatusResponse>("/status/general");
}

export function postGeneralSwitch(payload: SwitchRequest) {
  return apiFetch<GeneralSwitchResponse>("/switch/general", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postContactorSwitch(
  id: "C1" | "C2" | "C3",
  payload: SwitchRequest,
) {
  return apiFetch<SwitchContactorResult>(`/switch/${id}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postLuces(payload: SwitchRequest) {
  return apiFetch<{
    success: boolean;
    requested_state?: boolean;
    results?: Record<string, SwitchContactorResult>;
  }>("/switch/luces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postBocina(payload: SwitchRequest) {
  return apiFetch<SwitchContactorResult>("/switch/bocina", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
