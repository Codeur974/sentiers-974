import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../services/api";

interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifie l'authentification au démarrage
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("authToken");

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(storedToken);
        if (data.user?.id) {
          await AsyncStorage.setItem("userId", data.user.id);
        }
        console.log("User reconnecté", data.user.email);
      } else {
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.removeItem("userId");
        console.log("Token invalide ou expiré");
      }
    } catch (error) {
      console.error("Erreur vérification auth", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur de connexion");
      }

      await AsyncStorage.setItem("authToken", data.token);
      if (data.user?.id) {
        await AsyncStorage.setItem("userId", data.user.id);
      }
      setToken(data.token);
      setUser(data.user);

      console.log("Connexion réussie", data.user.email);
    } catch (error: any) {
      console.error("Erreur login", error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    try {
      const deviceId = await AsyncStorage.getItem("deviceId");

      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, deviceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur d'inscription");
      }

      await AsyncStorage.setItem("authToken", data.token);
      if (data.user?.id) {
        await AsyncStorage.setItem("userId", data.user.id);
      }
      setToken(data.token);
      setUser(data.user);

      console.log("Inscription réussie", data.user.email);
      console.log("Sessions anonymes migrées si présentes");
    } catch (error: any) {
      console.error("Erreur signup", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userId");
      setToken(null);
      setUser(null);
      console.log("Déconnexion réussie");
    } catch (error) {
      console.error("Erreur logout", error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    signup,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
};
