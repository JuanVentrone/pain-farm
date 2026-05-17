/** Voltaje nominal monofásico: verde 235–245, ámbar 220–234 o 246–255, rojo fuera */

export type VoltageTone = "optimal" | "caution" | "alert";

export function voltageTone(v: number): VoltageTone {
  if (v >= 235 && v <= 245) return "optimal";
  if ((v >= 220 && v < 235) || (v > 245 && v <= 255)) return "caution";
  return "alert";
}

export const toneClasses: Record<VoltageTone, string> = {
  optimal:
    "text-[#a6e22e] border-[#49483e] bg-[#272822]",
  caution:
    "text-[#fd971f] border-[#75604b] bg-[#3e3629]",
  alert:
    "text-[#f92672] border-[#6b3447] bg-[#3d2229]",
};

