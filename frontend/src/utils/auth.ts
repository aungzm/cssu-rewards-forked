// Check if token exists and is valid
export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem('authToken');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (!token || !expiresAt) {
      return false;
    }
    
    // Check if token is expired
    const expiryDate = new Date(expiresAt);
    return expiryDate > new Date();
  };
  
declare global {
    interface Window {
        __APP_CONFIG__?: { apiBaseUrl: string; demoMode: boolean };
    }
}

// The container supplies this before React loads. Keep Vite settings for the
// existing separate frontend/backend development setup.
export const API_BASE_URL = window.__APP_CONFIG__?.apiBaseUrl
    ?? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');
export const DEMO_MODE = window.__APP_CONFIG__?.demoMode
    ?? (import.meta.env.VITE_DEMO_MODE === 'true');
