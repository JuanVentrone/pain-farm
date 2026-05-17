"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "es" | "en";

export const STORAGE_KEY_LOCALE = "pain-farm-locale";

const translations = {
  es: {
    "nav.system": "Sistema",
    "nav.general.title": "Encendido / apagado general (C1→C3 según backend)",
    "nav.general.sequence": "Secuencia…",
    "nav.general.on": "General ON",
    "nav.general.off": "General OFF",
    "nav.alarms": "Alarmas subsección",
    "nav.breadcrumb.home": "Inicio",
    "nav.breadcrumb.alarms": "Alarmas",
    "nav.lights.label": "Luces",
    "nav.horn.label": "Bocina",
    "nav.active": "ACTIVO",
    "nav.inactive": "INACTIVO",
    "nav.language.group": "Idioma",

    "common.na": "N/A",

    "contactors.section": "Contactores industriales",
    "contactors.heading": "Contactores principales",
    "contactors.active": "Activo",
    "contactors.inactive": "Inactivo",

    "voltage.section": "Voltajes de fase RS485",
    "voltage.heading": "Voltaje trifásico (L1 · L2 · L3)",
    "voltage.rs485_label": "RS485:",
    "voltage.simulatedBadge": "Voltaje simulado",
    "voltage.liveInterval": "frontend 1 s",
    "voltage.staleInterval": "sin datos frescos",
    "voltage.testBadge": "Modo prueba",
    "voltage.testRs485Value": "simulación",
    "tone.optimal": "Óptimo",
    "tone.caution": "Precaución",
    "tone.alert": "Alerta",

    "charts.consumptionTitle": "Consumo — kW",
    "charts.consumptionSimulated": "Simulado",
    "charts.temperatureTitle": "Temperatura ambiental estimada — °C",
    "charts.temperatureSimulated": "Simulado (1s)",
    "charts.tooltipTemp": "Temperatura",
    "charts.legend.total": "Total",
    "charts.legend.l1": "Fase L1",
    "charts.legend.l2": "Fase L2",
    "charts.legend.l3": "Fase L3",

    "notice.banner": "Aviso",

    "footer.line":
      "Frontend Pain Farm · API Core Swicht V2 (métricas, estado, switches). Backend vía BACKEND_URL y proxy /api/backend/*.",

    "confirm.action": "Confirmar acción",
    "confirm.cancel": "Cancelar",
    "confirm.turnOn.confirm": "Sí, encender",
    "confirm.turnOff.confirm": "Sí, apagar",
    "confirm.turnOn.prompt": "¿Estás seguro de que quieres encender {target}?",
    "confirm.turnOff.prompt": "¿Estás seguro de que quieres apagar {target}?",
    "confirm.target.general": "el interruptor general del sistema",
    "confirm.target.c1": "el contactor C1",
    "confirm.target.c2": "el contactor C2",
    "confirm.target.c3": "el contactor C3",
    "confirm.target.lights": "las luces de alarma",
    "confirm.target.horn": "la bocina",

    "error.statusGeneral": "No se pudo leer /status/general",
    "error.switchGeneral": "Fallo al conmutar general",
    "error.contactor": "Fallo en {id}",
    "error.lights": "No se pudieron conmutar las luces (revisar configuración API)",
    "error.horn": "Fallo en bocina",
    "error.network": "Error de red",
    "error.multimeter":
      "Multímetro sin datos o API no disponible",
  },
  en: {
    "nav.system": "System",
    "nav.general.title": "Master on/off (C1→C3 per backend)",
    "nav.general.sequence": "Sequence…",
    "nav.general.on": "General ON",
    "nav.general.off": "General OFF",
    "nav.alarms": "Alarms subsection",
    "nav.breadcrumb.home": "Home",
    "nav.breadcrumb.alarms": "Alarms",
    "nav.lights.label": "Lights",
    "nav.horn.label": "Horn",
    "nav.active": "ON",
    "nav.inactive": "OFF",
    "nav.language.group": "Language",

    "common.na": "N/A",

    "contactors.section": "Industrial contactors",
    "contactors.heading": "Main contactors",
    "contactors.active": "Active",
    "contactors.inactive": "Inactive",

    "voltage.section": "RS485 phase voltages",
    "voltage.heading": "Three-phase voltage (L1 · L2 · L3)",
    "voltage.rs485_label": "RS485:",
    "voltage.simulatedBadge": "Simulated voltage",
    "voltage.liveInterval": "frontend 1 s",
    "voltage.staleInterval": "stale readings",
    "voltage.testBadge": "Test mode",
    "voltage.testRs485Value": "simulated",
    "tone.optimal": "Optimal",
    "tone.caution": "Caution",
    "tone.alert": "Alert",

    "charts.consumptionTitle": "Consumption — kW",
    "charts.consumptionSimulated": "Simulated",
    "charts.temperatureTitle": "Estimated ambient temperature — °C",
    "charts.temperatureSimulated": "Simulated (1s)",
    "charts.tooltipTemp": "Temperature",
    "charts.legend.total": "Total",
    "charts.legend.l1": "Phase L1",
    "charts.legend.l2": "Phase L2",
    "charts.legend.l3": "Phase L3",

    "notice.banner": "Notice",

    "footer.line":
      "Pain Farm frontend · Core Swicht V2 API (metrics, status, switches). Backend via BACKEND_URL proxy /api/backend/*.",

    "confirm.action": "Confirm action",
    "confirm.cancel": "Cancel",
    "confirm.turnOn.confirm": "Yes, turn on",
    "confirm.turnOff.confirm": "Yes, turn off",
    "confirm.turnOn.prompt": "Are you sure you want to turn on {target}?",
    "confirm.turnOff.prompt": "Are you sure you want to turn off {target}?",
    "confirm.target.general": "the system master switch",
    "confirm.target.c1": "contactor C1",
    "confirm.target.c2": "contactor C2",
    "confirm.target.c3": "contactor C3",
    "confirm.target.lights": "the alarm lights",
    "confirm.target.horn": "the horn",

    "error.statusGeneral": "Could not read /status/general",
    "error.switchGeneral": "Failed to toggle master switch",
    "error.contactor": "Failed on {id}",
    "error.lights": "Could not toggle lights (check API configuration)",
    "error.horn": "Horn toggle failed",
    "error.network": "Network error",
    "error.multimeter": "No multimeter data or API unavailable",
  },
} satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof translations)["es"];

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string>) => string;
  /** BCP 47 for date/time */
  bcp47: string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function replaceVars(template: string, vars?: Record<string, string>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY_LOCALE);
    if (stored === "en" || stored === "es") {
      setLocaleState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    globalThis.localStorage?.setItem(STORAGE_KEY_LOCALE, next);
    document.documentElement.lang = next;
  }, []);

  const bcp47 = locale === "en" ? "en-US" : "es-ES";

  const value = useMemo<LocaleContextValue>(() => {
    const table = translations[locale];
    return {
      locale,
      setLocale,
      bcp47,
      t: (key, vars) => replaceVars(table[key] ?? key, vars),
    };
  }, [locale, setLocale, bcp47]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
