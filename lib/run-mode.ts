export type RunMode = "test" | "main";

/**
 * Fijado **solo al arrancar** Next (`NEXT_PUBLIC_BOOT_RUN_MODE=test|main`).
 * Sin variable (o valor distinto de `test`) → `main`.
 * No hay cambio en caliente: para otro modo hay que parar el proceso y volver a lanzar el script correspondiente.
 */
export function getBootRunMode(): RunMode {
  return process.env.NEXT_PUBLIC_BOOT_RUN_MODE === "test" ? "test" : "main";
}
