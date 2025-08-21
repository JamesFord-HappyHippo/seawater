import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  upgradeSubscription: (tier: string) => Promise<{ success: boolean; error?: string }>;
  usageInfo: {
    canMake: boolean;
    remaining: number;
    limit: number;
    resetDate?: Date;
    assessmentsUsed: number;
    assessmentsLimit: number;
    daysUntilReset: number;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  const login = async (email: string, password: string) => {
    // TODO: Implement actual authentication
    setIsAuthenticated(true);
    setUser({ email });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const upgradeSubscription = async (tier: string) => {
    // TODO: Implement actual subscription upgrade
    console.log('Upgrading to:', tier);
    return { success: true };
  };

  const usageInfo = {
    canMake: true,
    remaining: 3,
    limit: 3,
    resetDate: new Date(),
    assessmentsUsed: 0,
    assessmentsLimit: 3,
    daysUntilReset: 30
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    upgradeSubscription,
    usageInfo
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
