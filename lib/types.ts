/** Mirrors `app/schemas.py` (Core Swicht V2) */

export type SwitchRequest = { estado: boolean };

export type DeviceHealthSchema = {
  name: string;
  status: string;
  healthy: boolean;
  last_error: string;
};

export type DevicesStatusResponse = {
  devices: Record<string, DeviceHealthSchema>;
};

export type PowerMetricsData = {
  v_l1: number;
  v_l2: number;
  v_l3: number;
  a_l1: number;
  a_l2: number;
  a_l3: number;
  potencia_kw: number;
  factor_potencia: number;
  frecuencia: number;
  timestamp: string;
  source: string;
};

export type PowerMetricsResponse = {
  success: boolean;
  status: string;
  data: PowerMetricsData | null;
  error: string | null;
};

export type HeartbeatResponse = {
  status: string;
  uptime_seconds: number;
  rs485_status: string;
};

export type ContactorStatusEntry = {
  name: string;
  state: "ON" | "OFF" | "UNKNOWN";
  raw?: unknown;
  error?: string;
  config?: unknown;
};

export type GeneralStatusResponse = Record<string, ContactorStatusEntry>;

export type SwitchContactorResult = {
  success: boolean;
  name?: string;
  requested_state?: boolean;
  device_response?: unknown;
  error?: string;
};

export type GeneralSwitchResponse =
  | {
      accepted: boolean;
      message: string;
      results?: Record<string, SwitchContactorResult | { success: boolean; error: string }>;
    }
  | {
      accepted: false;
      message: string;
    };
