// Admin Panel Screen - Aligned with backend API
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Badge, Button, Tabs } from '../../components/ui';
import RoleSwitcher from '../../components/RoleSwitcher';
import { adminAPI } from '../../api';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

const AdminPanelScreen = () => {
    const [dashboard, setDashboard] = useState(null);
    const [users, setUsers] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'users', label: 'Users' },
        { key: 'shops', label: 'Shops' },
    ];

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const [dashboardRes, usersRes, shopsRes] = await Promise.all([
                adminAPI.getDashboard(),
                adminAPI.getUsers(),
                adminAPI.getShops(),
            ]);
            setDashboard(dashboardRes.data);
            setUsers(usersRes.data.users || []);
            setShops(shopsRes.data.shops || []);
        } catch (error) {
            console.log('Load admin data error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load admin data. Make sure you have admin access.');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleFlagUser = async (user) => {
        Alert.alert(
            user.flagged ? 'Unflag User' : 'Flag User',
            `Are you sure you want to ${user.flagged ? 'unflag' : 'flag'} ${user.name || user.phone}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: user.flagged ? 'Unflag' : 'Flag',
                    style: user.flagged ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            await adminAPI.updateUserStatus(user.id, { flagged: !user.flagged });
                            loadData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to update user');
                        }
                    },
                },
            ]
        );
    };

    const handleVerifyUser = async (user) => {
        try {
            await adminAPI.updateUserStatus(user.id, { verified: !user.verified });
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to update user');
        }
    };

    const handleAssignAdmin = async (user) => {
        const isAdmin = user.admin_roles?.includes('admin');
        Alert.alert(
            isAdmin ? 'Remove Admin' : 'Make Admin',
            `Are you sure you want to ${isAdmin ? 'remove admin role from' : 'make'} ${user.name || user.phone} ${isAdmin ? '' : 'an admin'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isAdmin ? 'Remove' : 'Make Admin',
                    onPress: async () => {
                        try {
                            await adminAPI.assignRole(
                                user.id,
                                ['admin'],
                                isAdmin ? 'revoke' : 'grant'
                            );
                            loadData();
                        } catch (error) {
                            Alert.alert('Error', error.response?.data?.detail || 'Failed to update user role');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <RoleSwitcher />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Panel</Text>
                <Badge variant="error">Admin</Badge>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Tabs */}
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    style={styles.tabs}
                />

                {/* Tab Content */}
                <View style={styles.tabContent}>
                    {activeTab === 'overview' && dashboard && (
                        <View>
                            <View style={styles.statsGrid}>
                                <Card style={styles.statCard}>
                                    <Text style={styles.statIcon}>👥</Text>
                                    <Text style={styles.statValue}>{dashboard.total_users}</Text>
                                    <Text style={styles.statLabel}>Total Users</Text>
                                </Card>
                                <Card style={styles.statCard}>
                                    <Text style={styles.statIcon}>🏪</Text>
                                    <Text style={styles.statValue}>{dashboard.total_shops}</Text>
                                    <Text style={styles.statLabel}>Total Shops</Text>
                                </Card>
                                <Card style={styles.statCard}>
                                    <Text style={styles.statIcon}>🟢</Text>
                                    <Text style={styles.statValue}>{dashboard.active_shops}</Text>
                                    <Text style={styles.statLabel}>Active Shops</Text>
                                </Card>
                                <Card style={styles.statCard}>
                                    <Text style={styles.statIcon}>👤</Text>
                                    <Text style={styles.statValue}>{dashboard.total_customers}</Text>
                                    <Text style={styles.statLabel}>Customers</Text>
                                </Card>
                            </View>

                            {/* Daily Transactions */}
                            <Card style={styles.dailyCard}>
                                <Text style={styles.dailyTitle}>Today's Activity</Text>
                                <View style={styles.dailyStats}>
                                    <View style={styles.dailyStat}>
                                        <Text style={styles.dailyValue}>{dashboard.daily_transactions?.count || 0}</Text>
                                        <Text style={styles.dailyLabel}>Transactions</Text>
                                    </View>
                                    <View style={styles.dailyStat}>
                                        <Text style={styles.dailyValue}>
                                            {formatCurrency(dashboard.daily_transactions?.amount || 0)}
                                        </Text>
                                        <Text style={styles.dailyLabel}>Amount</Text>
                                    </View>
                                </View>
                            </Card>

                            {/* Summary */}
                            <Card style={styles.infoCard}>
                                <Ionicons name="shield-checkmark" size={32} color={colors.success} />
                                <Text style={styles.infoTitle}>Platform Summary</Text>
                                <Text style={styles.infoText}>
                                    Total transaction volume: {formatCurrency(dashboard.total_amount || 0)}
                                </Text>
                                <Text style={styles.infoText}>
                                    New users this week: {dashboard.new_users_this_week || 0}
                                </Text>
                            </Card>
                        </View>
                    )}

                    {activeTab === 'users' && (
                        <View>
                            <Text style={styles.sectionTitle}>
                                All Users ({users.length})
                            </Text>
                            {users.map((user) => (
                                <Card key={user.id} style={styles.userCard}>
                                    <View style={styles.userInfo}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>
                                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </Text>
                                        </View>
                                        <View style={styles.userDetails}>
                                            <Text style={styles.userName}>{user.name || 'Unknown'}</Text>
                                            <Text style={styles.userPhone}>+91 {user.phone}</Text>
                                            <View style={styles.userBadges}>
                                                {user.admin_roles?.includes('super_admin') && (
                                                    <Badge variant="error" size="sm">Super Admin</Badge>
                                                )}
                                                {user.admin_roles?.includes('admin') && !user.admin_roles?.includes('super_admin') && (
                                                    <Badge variant="warning" size="sm">Admin</Badge>
                                                )}
                                                {user.flagged && (
                                                    <Badge variant="error" size="sm">Flagged</Badge>
                                                )}
                                                {user.verified && (
                                                    <Badge variant="success" size="sm">Verified</Badge>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.userActions}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleVerifyUser(user)}
                                        >
                                            <Ionicons
                                                name={user.verified ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                                size={20}
                                                color={user.verified ? colors.success : colors.gray[400]}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleFlagUser(user)}
                                        >
                                            <Ionicons
                                                name={user.flagged ? 'flag' : 'flag-outline'}
                                                size={20}
                                                color={user.flagged ? colors.error : colors.gray[400]}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleAssignAdmin(user)}
                                        >
                                            <Ionicons
                                                name={user.admin_roles?.includes('admin') ? 'shield' : 'shield-outline'}
                                                size={20}
                                                color={user.admin_roles?.includes('admin') ? colors.primary.blue : colors.gray[400]}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            ))}
                        </View>
                    )}

                    {activeTab === 'shops' && (
                        <View>
                            <Text style={styles.sectionTitle}>
                                All Shops ({shops.length})
                            </Text>
                            {shops.map((shop) => (
                                <Card key={shop.id} style={styles.shopCard}>
                                    <View style={styles.shopInfo}>
                                        <Text style={styles.shopName}>{shop.name}</Text>
                                        <Text style={styles.shopCategory}>{shop.category}</Text>
                                        <Text style={styles.shopLocation}>{shop.location}</Text>
                                        <Text style={styles.shopCode}>Code: {shop.shop_code}</Text>
                                    </View>
                                    {shop.owner && (
                                        <Text style={styles.shopOwner}>
                                            Owner: {shop.owner.name || shop.owner.phone}
                                        </Text>
                                    )}
                                    <Text style={styles.shopDate}>
                                        Created: {formatDateTime(shop.created_at)}
                                    </Text>
                                </Card>
                            ))}
                        </View>
                    )}
                </View>

                <View style={{ height: spacing.xxxl }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray[50],
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[100],
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontWeight: '600',
        color: colors.gray[800],
    },
    scrollView: {
        flex: 1,
    },
    tabs: {
        margin: spacing.md,
    },
    tabContent: {
        padding: spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    statCard: {
        width: '48%',
        margin: '1%',
        alignItems: 'center',
        padding: spacing.lg,
    },
    statIcon: {
        fontSize: 32,
        marginBottom: spacing.sm,
    },
    statValue: {
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        color: colors.gray[800],
    },
    statLabel: {
        fontSize: fontSize.sm,
        color: colors.gray[500],
        marginTop: spacing.xs,
    },
    dailyCard: {
        marginTop: spacing.md,
        padding: spacing.lg,
    },
    dailyTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.gray[800],
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    dailyStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    dailyStat: {
        alignItems: 'center',
    },
    dailyValue: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.primary.blue,
    },
    dailyLabel: {
        fontSize: fontSize.sm,
        color: colors.gray[500],
        marginTop: spacing.xs,
    },
    infoCard: {
        alignItems: 'center',
        padding: spacing.xl,
        marginTop: spacing.md,
    },
    infoTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.gray[800],
        marginTop: spacing.md,
    },
    infoText: {
        fontSize: fontSize.sm,
        color: colors.gray[500],
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.gray[800],
        marginBottom: spacing.md,
    },
    userCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
        padding: spacing.md,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary.blue,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.white,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: fontSize.md,
        fontWeight: '500',
        color: colors.gray[800],
    },
    userPhone: {
        fontSize: fontSize.sm,
        color: colors.gray[500],
        marginTop: spacing.xs,
    },
    userBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.xs,
        gap: spacing.xs,
    },
    userActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: spacing.sm,
        marginLeft: spacing.xs,
    },
    shopCard: {
        marginBottom: spacing.sm,
        padding: spacing.md,
    },
    shopInfo: {
        marginBottom: spacing.sm,
    },
    shopName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.gray[800],
    },
    shopCategory: {
        fontSize: fontSize.sm,
        color: colors.primary.blue,
        textTransform: 'capitalize',
        marginTop: spacing.xs,
    },
    shopLocation: {
        fontSize: fontSize.sm,
        color: colors.gray[500],
        marginTop: spacing.xs,
    },
    shopCode: {
        fontSize: fontSize.sm,
        color: colors.gray[400],
        marginTop: spacing.xs,
    },
    shopOwner: {
        fontSize: fontSize.sm,
        color: colors.gray[600],
        marginTop: spacing.sm,
    },
    shopDate: {
        fontSize: fontSize.xs,
        color: colors.gray[400],
        marginTop: spacing.sm,
    },
});

export default AdminPanelScreen;
