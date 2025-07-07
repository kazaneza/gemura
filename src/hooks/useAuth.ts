import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { User, AuthState, LoginCredentials, RegisterUserData, PasswordResetRequest, PasswordResetConfirm, UserActivity } from '../types/auth';
import { authAPI, usersAPI } from '../services/api';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('kitchen_user');
        const storedToken = localStorage.getItem('kitchen_token');
        
        if (storedUser && storedToken) {
          // Verify token with backend
          try {
            const user = await usersAPI.getCurrentUser();
            setAuthState({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } catch (error) {
            // Token invalid, clear storage
            localStorage.removeItem('kitchen_user');
            localStorage.removeItem('kitchen_token');
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Authentication initialization failed'
        });
      }
    };

    initializeAuth();
  }, []);

  // Log user activity
  const logActivity = useCallback((action: string, resource: string, details?: any) => {
    if (!authState.user) return;

    const activity: UserActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: authState.user.id,
      action,
      resource,
      details,
      ipAddress: '127.0.0.1', // In production, get from request
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    setUserActivities(prev => [activity, ...prev.slice(0, 99)]); // Keep last 100 activities
  }, [authState.user]);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authAPI.login(credentials);
      
      // Store token and user data
      localStorage.setItem('kitchen_token', response.access_token);
      
      // Get user profile
      const user = await usersAPI.getCurrentUser();
      localStorage.setItem('kitchen_user', JSON.stringify(user));

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      // Log login activity
      setTimeout(() => {
        logActivity('LOGIN', 'AUTH', { email: credentials.email });
      }, 100);

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed';
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage
      });
    }
  }, [logActivity]);

  // Logout function
  const logout = useCallback(() => {
    if (authState.user) {
      logActivity('LOGOUT', 'AUTH');
    }

    localStorage.removeItem('kitchen_user');
    localStorage.removeItem('kitchen_token');
    
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, [authState.user, logActivity]);

  // Register user (admin only)
  const registerUser = useCallback(async (userData: RegisterUserData): Promise<void> => {
    if (!authState.user || authState.user.role !== 'ADMIN') {
      throw new Error('Only administrators can register new users');
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const newUser = await authAPI.register(userData);

      logActivity('CREATE', 'USER', { 
        newUserId: newUser.id, 
        email: newUser.email, 
        role: newUser.role 
      });

      setAuthState(prev => ({ ...prev, isLoading: false }));

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw new Error(errorMessage);
    }
  }, [authState.user, logActivity]);

  // Request password reset
  const requestPasswordReset = useCallback(async (request: PasswordResetRequest): Promise<void> => {
    try {
      // In production, this would call the backend
      console.log(`Password reset email sent to ${request.email}`);
      
      logActivity('PASSWORD_RESET_REQUEST', 'AUTH', { email: request.email });

    } catch (error) {
      console.error('Password reset request failed:', error);
    }
  }, [logActivity]);

  // Confirm password reset
  const confirmPasswordReset = useCallback(async (data: PasswordResetConfirm): Promise<void> => {
    try {
      // In production, this would call the backend
      console.log('Password reset confirmed');
      
      logActivity('PASSWORD_RESET_CONFIRM', 'AUTH', { token: data.token });

    } catch (error) {
      throw new Error('Password reset failed');
    }
  }, [logActivity]);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!authState.user) {
      throw new Error('User not authenticated');
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const updatedUser = await usersAPI.updateProfile(updates);

      localStorage.setItem('kitchen_user', JSON.stringify(updatedUser));

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
        isLoading: false
      }));

      logActivity('UPDATE', 'PROFILE', updates);

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Profile update failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw new Error(errorMessage);
    }
  }, [authState.user, logActivity]);

  // Get all users (admin only)
  const getUsers = useCallback(async (): Promise<User[]> => {
    if (!authState.user || authState.user.role !== 'ADMIN') {
      return [];
    }
    
    try {
      return await usersAPI.getUsers();
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }
  }, [authState.user]);

  // Get user activities
  const getUserActivities = useCallback((userId?: string): UserActivity[] => {
    if (!authState.user) return [];
    
    if (authState.user.role === 'ADMIN') {
      return userId 
        ? userActivities.filter(a => a.userId === userId)
        : userActivities;
    }
    
    // Non-admin users can only see their own activities
    return userActivities.filter(a => a.userId === authState.user!.id);
  }, [authState.user, userActivities]);

  return {
    ...authState,
    login,
    logout,
    registerUser,
    requestPasswordReset,
    confirmPasswordReset,
    updateProfile,
    getUsers,
    getUserActivities,
    logActivity
  };
};

// Auth Context
export const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};