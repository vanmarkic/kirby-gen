import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiClient } from '../api/client';

export interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize token from localStorage synchronously (lazy initialization)
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ success: boolean; token?: string }>('/auth/login', {
        password,
      });

      if (response.data.success && response.data.token) {
        const newToken = response.data.token;
        setToken(newToken);
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
      } else {
        throw new Error('Login failed: Invalid response from server');
      }
    } catch (error) {
      // Clear any existing auth state on error
      setToken(null);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  };

  const value: AuthContextType = {
    isAuthenticated: token !== null,
    token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
