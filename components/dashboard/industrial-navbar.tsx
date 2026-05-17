"use client";

import { useLocale, type Locale } from "@/lib/i18n";

type ContactorUi = Record<"C1" | "C2" | "C3", boolean>;

type IndustrialNavbarProps = {
  /** En Main: false si la API de estado no respondió o no hay datos */
  statusKnown: boolean;
  generalOn: boolean;
  generalBusy?: boolean;
  lightsOn: boolean;
  hornOn: boolean;
  contactors: ContactorUi;
  onGeneralClick: () => void;
  onLightsClick: () => void;
  onHornClick: () => void;
};

function StatusPill({
  label,
  state,
  naText,
}: {
  label: string;
  state: "on" | "off" | "na";
  naText: string;
}) {
  if (state === "na") {
    return (
      <span className="inline-flex items-center rounded-full border border-[#49483e] bg-[#3e3d32] px-2.5 py-0.5 text-xs font-medium text-[#75715e]">
        {label} {naText}
      </span>
    );
  }
  const active = state === "on";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? "bg-[#1a2e12] text-[#a6e22e]" : "bg-[#2e121f] text-[#f92672]"
      }`}
    >
      {label}
    </span>
  );
}

export function IndustrialNavbar({
  statusKnown,
  generalOn,
  generalBusy,
  lightsOn,
  hornOn,
  contactors,
  onGeneralClick,
  onLightsClick,
  onHornClick,
}: IndustrialNavbarProps) {
  const { locale, setLocale, t } = useLocale();
  const na = t("common.na");

  const c1: "on" | "off" | "na" = !statusKnown ? "na" : contactors.C1 ? "on" : "off";
  const c2: "on" | "off" | "na" = !statusKnown ? "na" : contactors.C2 ? "on" : "off";
  const c3: "on" | "off" | "na" = !statusKnown ? "na" : contactors.C3 ? "on" : "off";

  function LangButton({ code, label }: { code: Locale; label: string }) {
    const active = locale === code;
    return (
      <button
        type="button"
        onClick={() => setLocale(code)}
        aria-pressed={active}
        className={`cursor-pointer rounded px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#66d9ef] ${
          active ? "bg-[#49483e] text-[#f8f8f2]" : "text-[#75715e] hover:text-[#cfd0c9]"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <header className="border-b border-[#49483e] bg-[#272822]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-[0.2em] text-[#75715e]">
            {t("nav.system")}
          </span>
          <button
            type="button"
            onClick={onGeneralClick}
            title={t("nav.general.title")}
            className={`cursor-pointer rounded-lg px-5 py-2.5 font-semibold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#66d9ef] ${
              generalOn ? "bg-[#2d4a21] text-[#a6e22e]" : "bg-[#4a212c] text-[#f92672]"
            }`}
          >
            {generalBusy && !generalOn
              ? t("nav.general.sequence")
              : generalOn
                ? t("nav.general.on")
                : t("nav.general.off")}
          </button>
          <div className="hidden h-6 w-px bg-[#49483e] sm:block" aria-hidden />
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#cfd0c9]">
            <StatusPill label="C1" state={c1} naText={na} />
            <StatusPill label="C2" state={c2} naText={na} />
            <StatusPill label="C3" state={c3} naText={na} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap">
          <nav
            className="flex flex-wrap items-center gap-2 rounded-lg border border-[#49483e] bg-[#3e3d32]/50 px-3 py-2"
            aria-label={t("nav.alarms")}
          >
            <span className="text-[#75715e]">
              {t("nav.breadcrumb.home")}
              <span className="mx-2 text-[#49483e]">/</span>
            </span>
            <span className="font-medium text-[#e6db74]">{t("nav.breadcrumb.alarms")}</span>
            <span className="text-[#49483e]">/</span>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase text-[#75715e]">{t("nav.lights.label")}</span>
              <button
                type="button"
                onClick={onLightsClick}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#66d9ef] ${
                  lightsOn
                    ? "bg-[#1a3b2f] text-[#a6e22e]"
                    : "bg-[#3e2229] text-[#f92672]"
                }`}
              >
                {lightsOn ? t("nav.active") : t("nav.inactive")}
              </button>
            </div>

            <span className="text-[#49483e]" aria-hidden>
              —
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase text-[#75715e]">{t("nav.horn.label")}</span>
              <button
                type="button"
                onClick={onHornClick}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#66d9ef] ${
                  hornOn
                    ? "bg-[#1a3b2f] text-[#a6e22e]"
                    : "bg-[#3e2229] text-[#f92672]"
                }`}
              >
                {hornOn ? t("nav.active") : t("nav.inactive")}
              </button>
            </div>
          </nav>

          <div
            className="flex items-center gap-1 rounded-lg border border-[#49483e] bg-[#272822] p-0.5"
            role="group"
            aria-label={t("nav.language.group")}
          >
            <LangButton code="es" label="ES" />
            <LangButton code="en" label="EN" />
          </div>
        </div>
      </div>
    </header>
  );
}
