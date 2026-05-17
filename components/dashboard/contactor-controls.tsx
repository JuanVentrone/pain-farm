"use client";

import { useLocale } from "@/lib/i18n";

type Key = "C1" | "C2" | "C3";

type ContactorControlsProps = {
  contactors: Record<Key, boolean>;
  /** En Main sin estado de API */
  statusKnown: boolean;
  onToggle: (key: Key) => void;
};

function Card({
  id,
  active,
  labels,
  naText,
  statusKnown,
  onClick,
}: {
  id: Key;
  active: boolean;
  labels: { on: string; off: string };
  naText: string;
  statusKnown: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[104px] flex-1 cursor-pointer flex-col items-center rounded-xl border px-4 py-6 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#66d9ef] ${
        !statusKnown
          ? "border-[#49483e] bg-[#3e3d32]"
          : active
            ? "border-[#557f3f] bg-[#2d4421] shadow-[inset_0_0_0_1px_rgba(166,226,46,0.25)]"
            : "border-[#6b3545] bg-[#3e222c] shadow-[inset_0_0_0_1px_rgba(249,38,114,0.2)]"
      }`}
    >
      <span className="font-mono text-xl font-bold tracking-tight">{id}</span>
      <span
        className={`mt-2 text-xs uppercase tracking-wider ${
          !statusKnown ? "text-[#75715e]" : active ? "text-[#a6e22e]" : "text-[#f92672]"
        }`}
      >
        {!statusKnown ? naText : active ? labels.on : labels.off}
      </span>
    </button>
  );
}

export function ContactorControls({ contactors, statusKnown, onToggle }: ContactorControlsProps) {
  const { t } = useLocale();
  const lbl = { on: t("contactors.active"), off: t("contactors.inactive") };
  const na = t("common.na");

  return (
    <section aria-label={t("contactors.section")}>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#75715e]">
        {t("contactors.heading")}
      </h2>
      <div className="flex flex-wrap gap-3">
        <Card
          id="C1"
          active={contactors.C1}
          labels={lbl}
          naText={na}
          statusKnown={statusKnown}
          onClick={() => onToggle("C1")}
        />
        <Card
          id="C2"
          active={contactors.C2}
          labels={lbl}
          naText={na}
          statusKnown={statusKnown}
          onClick={() => onToggle("C2")}
        />
        <Card
          id="C3"
          active={contactors.C3}
          labels={lbl}
          naText={na}
          statusKnown={statusKnown}
          onClick={() => onToggle("C3")}
        />
      </div>
    </section>
  );
}
