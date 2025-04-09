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
  
// Base URL for API requests
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'; // Replace with your backend URL
