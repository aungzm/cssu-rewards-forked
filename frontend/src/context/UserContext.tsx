import React, { createContext, useState, useEffect, useContext } from 'react';
import { fetchWithAuth } from '../utils/authHelper';
import { API_BASE_URL } from '../utils/auth';
import { clearAuth } from '../utils/authHelper';

interface UserData {
  id: number;
  utorid: string;
  name: string;
  email: string;
  birthday: string;
  role: "REGULAR" | "CASHIER" | "MANAGER" | "SUPERUSER";
  points: number;
  createdAt: string;
  lastLogin: string;
  verified: boolean;
  avatarUrl?: string;
  avatar?: string;
}

interface UserContextType {
  userData: UserData | null;
  isLoading: boolean;
  error: string | null;
  signout: () => void;
  refetchUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/users/me`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      const data = await response.json();
      setUserData(data);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setIsLoading(false);
    }
  };

  const signout = () => {
    window.location.href = '/login'; // Redirect to login page on signout reload the window too
    clearAuth();
    setUserData(null);
    setError(null);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <UserContext.Provider value={{ userData, isLoading, error, refetchUser: fetchUserData, signout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};