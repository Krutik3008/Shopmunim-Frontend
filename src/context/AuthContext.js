// Auth Context - Global authentication state management
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // START WITH TRUE (Blocking Load)
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Default to false until proven otherwise

    // Check authentication on app start
    useEffect(() => {
        // Safety timeout - if auth check takes too long, proceed anyway
        const timeout = setTimeout(() => {
            console.log('Auth check timeout - proceeding without auth');
            setLoading(false);
        }, 3000);

        checkAuth().finally(() => clearTimeout(timeout));
    }, []);

    const checkAuth = async () => {
        try {
            // 1. Get data from local storage
            console.log('Checking storage for auth...');
            const [tokenStr, userStr] = await AsyncStorage.multiGet(['token', 'user']);
            const token = tokenStr[1];
            const savedUser = userStr[1] ? JSON.parse(userStr[1]) : null;

            console.log('Storage check:', token ? 'Token found' : 'No token', savedUser ? `User found (${savedUser.active_role})` : 'No user');

            if (token && savedUser) {
                // 2. Set state for logged in user
                setUser(savedUser);
                setIsAuthenticated(true);

                // 3. Verify in background (fire and forget)
                verifyTokenInBackground(token);
            } else {
                // No token, definitely logged out
                setIsAuthenticated(false);
                setUser(null);
            }
        } catch (error) {
            console.warn('Auth check failed:', error);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            // ALWAYS unblock UI after check is done
            setLoading(false);
        }
    };

    const verifyTokenInBackground = async (token) => {
        try {
            console.log('Verifying token in background...');
            // Add timeout to prevent getting stuck
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Auth check timeout')), 5000)
            );
            const response = await Promise.race([
                authAPI.getMe(),
                timeoutPromise
            ]);
            console.log('Background verification success');
            // Update user with latest data from server
            setUser(response.data);
            await AsyncStorage.setItem('user', JSON.stringify(response.data));
        } catch (error) {
            console.warn('Background verification failed:', error.message);
            // If token is invalid (401), we must logout
            if (error.response?.status === 401) {
                console.log('Token expired, logging out...');
                await logout();
            }
            // For other errors (network/timeout), we keep the user logged in 
            // (Offline mode support basically)
        }
    };

    const login = async (token, userData) => {
        try {
            console.log('Logging in with token:', token?.substring(0, 20) + '...');
            console.log('User data:', userData);
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            setIsAuthenticated(true);
            console.log('Login successful, isAuthenticated:', true);
        } catch (error) {
            console.error('Login storage error:', error);
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
            console.log('Logged out');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const updateUser = async (userData) => {
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
    };

    const switchRole = async (role) => {
        try {
            const response = await authAPI.switchRole(role);
            console.log('Switch role response:', response.data);
            const updatedUser = response.data.user;
            if (updatedUser) {
                await updateUser(updatedUser);
            }
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.detail || error.response?.data?.message || 'Admin access not provided or switch failed';
            console.log('Switch role error:', message);
            return { success: false, message };
        }
    };

    const updateProfile = async (data) => {
        try {
            const response = await authAPI.updateProfile(data);
            console.log('Update profile response:', response.data);
            const updatedUser = response.data.user || response.data; // Handle different response formats

            // Merge with existing user data to preserve other fields
            const newUser = { ...user, ...updatedUser };
            await updateUser(newUser);
            return { success: true, message: 'Profile updated successfully' };
        } catch (error) {
            if (__DEV__) {
                console.log('Profile update failed:', error.response?.data?.detail || error.message);
            }
            return {
                success: false,
                message: error.response?.data?.detail || error.response?.data?.message || 'Failed to update profile'
            };
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        updateUser,
        updateProfile,
        switchRole,
        checkAuth,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
