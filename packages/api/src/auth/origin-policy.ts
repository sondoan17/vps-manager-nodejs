export type OriginPolicyInput = {
  origin?: string;
  host?: string;
  configuredOrigin?: string;
};

/** Legacy HTTP policy: preserves same-host behavior for existing routes. */
export const isExactAllowedOrigin = isHttpOriginAllowed;

export function isHttpOriginAllowed({ origin, host, configuredOrigin }: OriginPolicyInput): boolean {
  if (!origin) return false;
  if (configuredOrigin && origin === configuredOrigin) return true;
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export type WebSocketOriginInput = {
  origin?: string;
  configuredOrigin?: string;
  expectedOrigin?: string;
};

/** Strict WebSocket policy; expectedOrigin is an explicit trusted server value. */
export function isWebSocketOriginAllowed({ origin, configuredOrigin, expectedOrigin }: WebSocketOriginInput): boolean {
  if (!origin || origin === "null" || origin.includes(",")) return false;
  const expected = configuredOrigin ?? expectedOrigin;
  if (!expected || expected.includes(",")) return false;
  const parseCanonical = (value: string): URL | undefined => {
    try {
      const url = new URL(value);
      if (!(url.protocol === "http:" || url.protocol === "https:") || !url.host || url.username || url.password) return undefined;
      if (url.pathname !== "/" || url.search || url.hash) return undefined;
      return url;
    } catch { return undefined; }
  };
  const actual = parseCanonical(origin);
  const allowed = parseCanonical(expected);
  return !!actual && !!allowed && allowed.origin === actual.origin;
}
