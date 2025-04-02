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
  
  // Clear authentication data
  export const clearAuth = (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenExpiresAt');
  };
  
  // Base URL for API requests
  export const API_BASE_URL = 'http://localhost:3000'; // Change this when needed