import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

const TOKEN_KEY = "openfeedback.staffToken";
export const STAFF_LOGOUT_EVENT = "openfeedback:staff-logout";

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

export async function loginStaff(password: string): Promise<void> {
  const response = await axios.post(`${API_URL}/api/staff/login`, { password });
  setStaffToken(response.data.token);
}

// Shared client: attaches the staff token and logs out when it expires
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
      clearStaffToken();
    }
    return Promise.reject(error);
  }
);
