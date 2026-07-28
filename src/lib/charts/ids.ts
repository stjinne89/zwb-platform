/**
 * Unieke id voor <defs>-elementen. Zonder suffix botsen twee instanties van
 * dezelfde grafiek op één pagina op hun gradient-id.
 */
export function defsId(base: string, suffix?: string) {
  return suffix ? `${base}-${suffix}` : base;
}
