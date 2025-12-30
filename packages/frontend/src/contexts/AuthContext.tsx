import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, AuthState } from '../types';
import { authApi } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User; token: string } }
  | { type: 'CLEAR_USER' }
  | { type: 'UPDATE_USER'; payload: User };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'CLEAR_USER':
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('job-finder-token');

      if (token) {
        try {
          // Verify token and get user profile
          // We pass the token explicitly to avoid race conditions with the interceptor
          const response = await authApi.getProfile(token);
          const user = response.data.data; // API returns { message, data: user }

          dispatch({
            type: 'SET_USER',
            payload: {
              user,
              token,
            },
          });
        } catch (error) {
          console.error('Failed to restore session:', error);
          // Token is invalid, remove it
          localStorage.removeItem('job-finder-token');
          dispatch({ type: 'CLEAR_USER' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await authApi.login({ email, password });
      const { user, token } = response.data.data;

      // Store token in localStorage
      localStorage.setItem('job-finder-token', token);

      dispatch({
        type: 'SET_USER',
        payload: { user, token },
      });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await authApi.register({ email, password, firstName, lastName });
      const { user, token } = response.data.data;

      // Store token in localStorage
      localStorage.setItem('job-finder-token', token);

      dispatch({
        type: 'SET_USER',
        payload: { user, token },
      });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('job-finder-token');
    dispatch({ type: 'CLEAR_USER' });
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!state.token) {
      throw new Error('No authentication token');
    }

    try {
      const response = await authApi.updateProfile(updates, state.token);
      dispatch({ type: 'UPDATE_USER', payload: response.data.data });
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
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