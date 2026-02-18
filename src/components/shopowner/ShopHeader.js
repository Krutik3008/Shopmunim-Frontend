import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const ShopHeader = ({ title }) => {
    const navigation = useNavigation();
    const { user, logout, switchRole } = useAuth();
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);

    const handleRoleSwitch = async (role) => {
        setShowRoleDropdown(false);
        if (role !== user?.active_role) {
            const success = await switchRole(role);
            if (success) {
                if (role === 'customer') {
                    navigation.reset({ index: 0, routes: [{ name: 'CustomerDashboard' }] });
                } else if (role === 'admin') {
                    navigation.reset({ index: 0, routes: [{ name: 'AdminPanel' }] });
                }
            }
        }
    };

    return (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                {/* Header Image/Logo Section */}
                <View style={styles.brandingContainer}>
                    {/* Placeholder for Image Logo - uncomment and set source when available */}
                    {/* <Image source={require('../../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" /> */}

                    {/* Default Text Logo */}
                    <Text style={styles.logo}>{title || 'ShopMunim'}</Text>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.roleSelector}
                        onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                    >
                        <Ionicons name="storefront" size={16} color="#8B5CF6" />
                        <Text style={styles.roleSelectorText}>Shop Owner</Text>
                        <Ionicons name="chevron-down" size={16} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout}>
                        <Text style={styles.headerLogout}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.headerBottom}>
                <Text style={styles.welcomeText}>Welcome, <Text style={styles.userName}>{user?.name || 'User'}</Text></Text>
                <View style={styles.phoneContainer}>
                    <Text style={styles.phoneText}>+91 {user?.phone}</Text>
                </View>
            </View>

            {/* Role Dropdown */}
            {showRoleDropdown && (
                <View style={styles.roleDropdown}>
                    <TouchableOpacity
                        style={[styles.roleOption, user?.active_role === 'customer' && styles.roleOptionActive]}
                        onPress={() => handleRoleSwitch('customer')}
                    >
                        <Ionicons name="person" size={18} color="#3B82F6" />
                        <Text style={styles.roleOptionText}>Customer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roleOption, user?.active_role === 'shop_owner' && styles.roleOptionActive]}
                        onPress={() => handleRoleSwitch('shop_owner')}
                    >
                        <Ionicons name="storefront" size={18} color="#8B5CF6" />
                        <Text style={styles.roleOptionText} numberOfLines={1}>Shop Owner</Text>
                        {user?.active_role === 'shop_owner' && (
                            <Ionicons name="checkmark" size={18} color="#8B5CF6" />
                        )}
                    </TouchableOpacity>
                    {/* Admin role capability check */}
                    {user?.roles?.includes('admin') || user?.admin_roles?.length > 0 ? (
                        <TouchableOpacity
                            style={[styles.roleOption, user?.active_role === 'admin' && styles.roleOptionActive]}
                            onPress={() => handleRoleSwitch('admin')}
                        >
                            <Ionicons name="shield" size={18} color="#F59E0B" />
                            <Text style={styles.roleOptionText}>Admin</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        zIndex: 100, // Ensure dropdown comes on top
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brandingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3B82F6',
    },
    logoImage: {
        width: 30, // Adjust as needed
        height: 30, // Adjust as needed
        marginRight: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    roleSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 5,
        gap: 6,
    },
    roleSelectorText: {
        fontSize: 14,
        color: '#333',
    },
    headerLogout: {
        fontSize: 14,
        color: '#666',
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    welcomeText: {
        fontSize: 14,
        color: '#666',
    },
    userName: {
        fontWeight: 'bold',
        color: '#333',
    },
    phoneContainer: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    phoneText: {
        fontSize: 12,
        color: '#000',
    },
    // Role Dropdown
    roleDropdown: {
        position: 'absolute',
        top: 45,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 5,
        padding: 8,
        zIndex: 1000,
        minWidth: 180,
        elevation: 10, // Increased elevation for Android
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
    },
    roleOptionActive: {
        backgroundColor: '#F0F9FF',
        borderRadius: 6,
    },
    roleOptionText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
});

export default ShopHeader;
