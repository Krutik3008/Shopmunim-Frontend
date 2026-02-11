// App Navigator - Main navigation configuration with proper auth handling
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ShopOwnerDashboard from '../screens/shopowner/DashboardScreen';
import CustomerDetailScreen from '../screens/shopowner/CustomerDetailScreen';
import ProductsScreen from '../screens/shopowner/ProductsScreen';
import QRCodeScreen from '../screens/shopowner/QRCodeScreen';
import QRShareScreen from '../screens/shopowner/QRShareScreen';
import CustomerDashboardScreen from '../screens/customer/DashboardScreen';
import AdminPanelScreen from '../screens/admin/AdminPanelScreen';
import AdminCustomerDetailScreen from '../screens/admin/AdminCustomerDetailScreen';
import CreateShopScreen from '../screens/CreateShopScreen';

const Stack = createNativeStackNavigator();

// Loading Screen
const LoadingScreen = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.blue} />
        <Text style={styles.loadingText}>Loading...</Text>
    </View>
);

// Auth Navigator (for non-authenticated users)
const AuthNavigator = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
);

// Main App Navigator (for authenticated users)
const MainNavigator = ({ initialRoute }) => (
    <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
    >
        {/* Shop Owner Dashboard - Has its own built-in bottom tabs */}
        <Stack.Screen name="ShopOwnerDashboard" component={ShopOwnerDashboard} />

        {/* Shop Owner Additional Screens */}
        <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
        <Stack.Screen name="Products" component={ProductsScreen} />
        <Stack.Screen name="QRCode" component={QRCodeScreen} />
        <Stack.Screen name="QRShare" component={QRShareScreen} />
        <Stack.Screen name="CreateShop" component={CreateShopScreen} />

        {/* Customer Dashboard - Has its own built-in bottom tabs */}
        <Stack.Screen name="CustomerDashboard" component={CustomerDashboardScreen} />

        {/* Admin Screens */}
        <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        <Stack.Screen name="AdminCustomerDetail" component={AdminCustomerDetailScreen} />
    </Stack.Navigator>
);

// Root Navigator
const AppNavigator = () => {
    const { isAuthenticated, user, loading } = useAuth();

    console.log('AppNavigator render:', { isAuthenticated, userId: user?.id, loading });

    if (loading) {
        return <LoadingScreen />;
    }

    const getInitialRoute = () => {
        if (user?.active_role === 'admin') return 'AdminPanel';
        if (user?.active_role === 'shop_owner') return 'ShopOwnerDashboard';
        return 'CustomerDashboard';
    };

    return (
        <NavigationContainer>
            {isAuthenticated ? (
                <MainNavigator initialRoute={getInitialRoute()} />
            ) : (
                <AuthNavigator />
            )}
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.gray[50],
    },
    loadingText: {
        marginTop: 10,
        color: colors.gray[600],
    },
});

export default AppNavigator;
