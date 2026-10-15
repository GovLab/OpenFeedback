import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

const TOKEN_KEY = "openfeedback.staffToken";
export const STAFF_LOGOUT_EVENT = "openfeedback:staff-logout";
// Fired when the server rejects the token (the 12 hour session has ended)
export const STAFF_SESSION_EXPIRED_EVENT = "openfeedback:staff-session-expired";

// sessionStorage can throw in private windows or when storage is blocked
export function getStaffToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStaffToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Login still works for this page view; it just won't survive a reload
  }
}

export function clearStaffToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing stored, nothing to clear
  }
  window.dispatchEvent(new Event(STAFF_LOGOUT_EVENT));
}

// The token is base64 of "staff:<expires unix seconds>:<signature>". The expiry is
// not secret, so the page can show when the session ends. Returns epoch ms or null.
export function getStaffTokenExpiry(): number | null {
  const token = getStaffToken();
  if (!token) return null;
  try {
    const decoded = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const expiresSeconds = Number(decoded.split(":")[1]);
    return Number.isFinite(expiresSeconds) ? expiresSeconds * 1000 : null;
  } catch {
    return null;
  }
}

// Keeps the token out of storage and tells the page the session ended, so
// unsaved work stays on screen while the person signs in again
function expireStaffSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing stored, nothing to clear
  }
  window.dispatchEvent(new Event(STAFF_SESSION_EXPIRED_EVENT));
}

export async function loginStaff(password: string): Promise<void> {
  const response = await axios.post(`${API_URL}/api/staff/login`, { password });
  setStaffToken(response.data.token);
}

// Shared client: attaches the staff token and reports when it expires
export const http = axios.create();

http.interceptors.request.use((config) => {
  const token = getStaffToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getStaffToken()) {
      expireStaffSession();
    }
    return Promise.reject(error);
  }
);
