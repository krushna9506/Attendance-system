import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'student';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'student';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser(response.data.data.user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, {
        email,
        password
      });

      const { token: newToken, user: userData } = response.data.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const register = async (userData: RegisterData) => {
    try {
      setError(null);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/register`, userData);
      const { token: newToken, user: newUser } = response.data.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    register
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 