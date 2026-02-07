// Role Switcher Component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';

const RoleSwitcher = ({ onRoleChange }) => {
    const { user, switchRole, logout } = useAuth();

    const roles = [
        { key: 'customer', label: 'Customer', icon: 'person-outline' },
        { key: 'shop_owner', label: 'Shop Owner', icon: 'storefront-outline' },
    ];

    // Add admin role if user has it
    if (user?.admin_roles?.length > 0) {
        roles.push({ key: 'admin', label: 'Admin', icon: 'shield-outline' });
    }

    const handleRoleSwitch = async (role) => {
        if (role === user?.active_role) return;

        const success = await switchRole(role);
        if (success) {
            onRoleChange && onRoleChange(role);
        } else {
            Alert.alert('Error', 'Failed to switch role');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.name}>{user?.name || 'User'}</Text>
                        <Text style={styles.phone}>+91 {user?.phone}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={24} color={colors.error} />
                </TouchableOpacity>
            </View>

            <View style={styles.rolesContainer}>
                <Text style={styles.rolesLabel}>Switch Role:</Text>
                <View style={styles.roles}>
                    {roles.map((role) => (
                        <TouchableOpacity
                            key={role.key}
                            style={[
                                styles.roleButton,
                                user?.active_role === role.key && styles.roleButtonActive,
                            ]}
                            onPress={() => handleRoleSwitch(role.key)}
                        >
                            <Ionicons
                                name={role.icon}
                                size={18}
                                color={user?.active_role === role.key ? colors.white : colors.gray[600]}
                            />
                            <Text style={[
                                styles.roleText,
                                user?.active_role === role.key && styles.roleTextActive,
                            ]}>
                                {role.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[100],
        ...shadows.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary.blue,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.white,
    },
    name: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.gray[800],
    },
    phone: {
        fontSize: fontSize.sm,
        color: colors.gray[500],
    },
    logoutButton: {
        padding: spacing.sm,
    },
    rolesContainer: {
        marginTop: spacing.sm,
    },
    rolesLabel: {
        fontSize: fontSize.sm,
        color: colors.gray[500],
        marginBottom: spacing.sm,
    },
    roles: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    roleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.gray[100],
        marginRight: spacing.sm,
        marginBottom: spacing.xs,
    },
    roleButtonActive: {
        backgroundColor: colors.primary.blue,
    },
    roleText: {
        fontSize: fontSize.sm,
        color: colors.gray[600],
        marginLeft: spacing.xs,
    },
    roleTextActive: {
        color: colors.white,
        fontWeight: '500',
    },
});

export default RoleSwitcher;
