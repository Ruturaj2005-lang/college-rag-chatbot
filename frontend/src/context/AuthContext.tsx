import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  quickLogin: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize token and user from localStorage to eliminate any refresh flash/delay
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('college_rag_token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('college_rag_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Optional background profile validation
    const savedToken = localStorage.getItem('college_rag_token');
    if (savedToken) {
      api.auth.getMe()
        .then((verifiedUser) => {
          setUser(verifiedUser);
          localStorage.setItem('college_rag_user', JSON.stringify(verifiedUser));
        })
        .catch((err) => {
          // If token explicitly rejected as invalid (401), logout
          if (err.message?.includes('401') || err.message?.includes('Could not validate')) {
            logout();
          }
        });
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('college_rag_token', res.access_token);
    localStorage.setItem('college_rag_user', JSON.stringify(res.user));
  };

  const register = async (email: string, password: string, fullName = '', role: UserRole = 'student') => {
    const res = await api.auth.register(email, password, fullName, role);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('college_rag_token', res.access_token);
    localStorage.setItem('college_rag_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('college_rag_token');
    localStorage.removeItem('college_rag_user');
  };

  const quickLogin = async (role: UserRole) => {
    if (role === 'admin') {
      await login('admin@college.edu', 'Admin@123456');
    } else {
      await login('student@college.edu', 'Student@123456');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin',
    isLoading,
    login,
    register,
    logout,
    quickLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
