const LOCAL_AUTH_TOKEN_KEY = "vps-manager.local-auth-token";

export function getLocalAuthToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(LOCAL_AUTH_TOKEN_KEY) || "";
}

export function setLocalAuthToken(token: string) {
  if (typeof window === "undefined") return;
  const trimmed = token.trim();
  if (trimmed) {
    window.sessionStorage.setItem(LOCAL_AUTH_TOKEN_KEY, trimmed);
  } else {
    window.sessionStorage.removeItem(LOCAL_AUTH_TOKEN_KEY);
  }
}

export function clearLocalAuthToken() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LOCAL_AUTH_TOKEN_KEY);
}
