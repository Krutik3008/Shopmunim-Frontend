import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const TabButton = ({ name, icon, label, isActive, onPress }) => (
    <TouchableOpacity style={styles.tabButton} onPress={onPress}>
        <View style={[styles.tabIconContainer, isActive && styles.tabIconActive]}>
            <Ionicons
                name={isActive ? icon.replace('-outline', '') : icon}
                size={20}
                color={isActive ? '#3B82F6' : '#9CA3AF'}
            />
        </View>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
);

// import React from 'react'; // Already verified context
const ShopBottomNav = ({ activeTab = 'home', onTabPress }) => {
    const navigation = useNavigation();
    const route = useRoute();

    // Default navigation handler if none provided
    const handlePress = (tab) => {
        if (onTabPress) {
            onTabPress(tab);
            return;
        }

        // Basic navigation logic based on tab name
        // Adjust route names as per your actual navigation structure
        switch (tab) {
            case 'home':
                navigation.navigate('ShopOwnerDashboard', { tab: 'home' });
                break;
            case 'products':
                navigation.navigate('ShopOwnerDashboard', { tab: 'products' });
                break;
            case 'customers':
                // Navigate to the customers tab in Dashboard
                navigation.navigate('ShopOwnerDashboard', { tab: 'customers' });
                break;
            case 'transactions':
                navigation.navigate('ShopOwnerDashboard', { tab: 'transactions' }); // Transactions is a tab in Dashboard
                break;
            case 'account':
                navigation.navigate('ShopOwnerDashboard', { tab: 'account' }); // Account is a tab in Dashboard
                break;
            default:
                break;
        }
    };

    return (
        <View style={styles.bottomNav}>
            <TabButton
                name="home"
                icon="home-outline"
                label="Home"
                isActive={activeTab === 'home'}
                onPress={() => handlePress('home')}
            />
            <TabButton
                name="products"
                icon="cube-outline"
                label="Products"
                isActive={activeTab === 'products'}
                onPress={() => handlePress('products')}
            />
            <TabButton
                name="customers"
                icon="people-outline"
                label="Customers"
                isActive={activeTab === 'customers'}
                onPress={() => handlePress('customers')}
            />
            <TabButton
                name="transactions"
                icon="receipt-outline"
                label="Transactions"
                isActive={activeTab === 'transactions'}
                onPress={() => handlePress('transactions')}
            />
            <TabButton
                name="account"
                icon="person-outline"
                label="Account"
                isActive={activeTab === 'account'}
                onPress={() => handlePress('account')}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingBottom: 8,
        paddingTop: 8,
    },
    tabButton: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    tabIconContainer: { padding: 8, borderRadius: 20 },
    tabIconActive: { backgroundColor: '#EFF6FF' },
    tabLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
    tabLabelActive: { color: '#3B82F6', fontWeight: '500' },
});

export default ShopBottomNav;
