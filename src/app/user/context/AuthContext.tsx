"use client";
import { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter, usePathname } from "next/navigation";

// Environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api-zeal.onrender.com";
const TOKEN_REFRESH_THRESHOLD = 300; // 5 minutes before expiry
const STORAGE_KEYS = {
  TOKEN: "token",
  ROLE: "role",
  EMAIL: "email",
  USER_ID: "userId",
} as const;

// Types
interface DecodedToken {
  id: string;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
}

interface UserInfo {
  id: string;
  email: string;
  role: string;
  username?: string;
  [key: string]: any;
}

interface AuthContextType {
  isLoggedIn: boolean;
  userInfo: UserInfo | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
  hasRole: (role: string) => boolean;
}

// Utility functions
const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const currentTime = Date.now() / 1000;
    return !decoded.exp || decoded.exp < currentTime;
  } catch {
    return true;
  }
};

const shouldRefreshToken = (token: string): boolean => {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp ? decoded.exp - currentTime < TOKEN_REFRESH_THRESHOLD : false;
  } catch {
    return false;
  }
};

const validateTokenStructure = (decoded: any): decoded is DecodedToken => {
  return (
    decoded &&
    typeof decoded.id === "string" &&
    typeof decoded.email === "string" &&
    typeof decoded.role === "string" &&
    decoded.id.length > 0 &&
    decoded.email.includes("@") &&
    decoded.role.length > 0
  );
};

const clearAuthStorage = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

const setAuthStorage = (token: string, userInfo: UserInfo): void => {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.ROLE, userInfo.role);
  localStorage.setItem(STORAGE_KEYS.EMAIL, userInfo.email);
  localStorage.setItem(STORAGE_KEYS.USER_ID, userInfo.id);
};

// API functions
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP Error: ${response.status}`);
  }
  
  return response.json();
};

const fetchUserProfile = async (token: string): Promise<UserInfo | null> => {
  try {
    const userData = await apiRequest("/api/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return userData;
  } catch (error) {
    console.warn("Failed to fetch user profile:", error);
    return null;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Check if token is expired
        if (isTokenExpired(token)) {
          console.warn("Token expired, clearing auth state");
          clearAuthStorage();
          setIsLoading(false);
          return;
        }

        // Decode token and validate structure
        const decoded = jwtDecode<DecodedToken>(token);
        if (!validateTokenStructure(decoded)) {
          console.error("Invalid token structure");
          clearAuthStorage();
          setIsLoading(false);
          return;
        }

        // Try to fetch fresh user data, fallback to token data
        const userData = await fetchUserProfile(token);
        const finalUserInfo: UserInfo = userData || {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };

        setUserInfo(finalUserInfo);
        setIsLoggedIn(true);

        // Check if token needs refresh
        if (shouldRefreshToken(token)) {
          console.log("Token needs refresh");
          // Implement token refresh logic here if your API supports it
        }

      } catch (error) {
        console.error("Auth initialization error:", error);
        clearAuthStorage();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Auto-logout on token expiry
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkTokenExpiry = () => {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token || isTokenExpired(token)) {
        console.warn("Token expired, logging out");
        logout();
      }
    };

    const interval = setInterval(checkTokenExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const login = useCallback(async (token: string): Promise<void> => {
    try {
      setIsLoading(true);

      // Validate token
      if (!token || typeof token !== "string") {
        throw new Error("Token không hợp lệ");
      }

      if (isTokenExpired(token)) {
        throw new Error("Token đã hết hạn");
      }

      // Decode and validate token structure
      const decoded = jwtDecode<DecodedToken>(token);
      if (!validateTokenStructure(decoded)) {
        throw new Error("Token thiếu thông tin cần thiết");
      }

      // Try to fetch complete user data
      const userData = await fetchUserProfile(token);
      const finalUserInfo: UserInfo = userData || {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      // Store auth data
      setAuthStorage(token, finalUserInfo);
      setUserInfo(finalUserInfo);
      setIsLoggedIn(true);

      // Redirect based on role
      const redirectPath = finalUserInfo.role === "admin" 
        ? "/admin?refresh=true" 
        : "/user?refresh=true";
      
      console.log("Login successful, redirecting to:", redirectPath);
      router.push(redirectPath);

    } catch (error) {
      console.error("Login error:", error);
      clearAuthStorage();
      setIsLoggedIn(false);
      setUserInfo(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    try {
      clearAuthStorage();
      setIsLoggedIn(false);
      setUserInfo(null);
      
      // Only redirect if not already on login page
      if (!pathname.includes("/login")) {
        router.push("/user/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [router, pathname]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const currentToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!currentToken) return false;

      // Implement token refresh logic here
      // This depends on your API implementation
      const response = await apiRequest("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ token: currentToken }),
      });

      if (response.token) {
        const decoded = jwtDecode<DecodedToken>(response.token);
        if (validateTokenStructure(decoded)) {
          const newUserInfo: UserInfo = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
          };
          setAuthStorage(response.token, newUserInfo);
          setUserInfo(newUserInfo);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }, []);

  const isTokenExpiredCheck = useCallback((): boolean => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return !token || isTokenExpired(token);
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    return userInfo?.role === role;
  }, [userInfo]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isLoggedIn,
    userInfo,
    isLoading,
    login,
    logout,
    refreshToken,
    isTokenExpired: isTokenExpiredCheck,
    hasRole,
  }), [isLoggedIn, userInfo, isLoading, login, logout, refreshToken, isTokenExpiredCheck, hasRole]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Additional utility hooks
export function useRequireAuth(redirectTo: string = "/user/login") {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push(redirectTo);
    }
  }, [isLoggedIn, isLoading, router, redirectTo]);

  return { isLoggedIn, isLoading };
}

export function useRequireRole(requiredRole: string, redirectTo: string = "/unauthorized") {
  const { userInfo, isLoading, hasRole } = useAuth();
  const router = useRouter();
      
  useEffect(() => {
    if (!isLoading && userInfo && !hasRole(requiredRole)) {
      router.push(redirectTo);
    }
  }, [userInfo, isLoading, hasRole, requiredRole, router, redirectTo]);

  return { hasRequiredRole: hasRole(requiredRole), isLoading };
}