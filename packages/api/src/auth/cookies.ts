/**
 * Session cookie name for dashboard auth.
 */
export const SESSION_COOKIE_NAME = "vps_dashboard_sid";

/**
 * Parse a named cookie from the Cookie header value.
 * Simple no-dependency parser — splits on "; " and then on first "=".
 */
export function parseCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split("; ")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    if (pair.slice(0, eqIdx).trim() === name) {
      return pair.slice(eqIdx + 1);
    }
  }
  return undefined;
}
