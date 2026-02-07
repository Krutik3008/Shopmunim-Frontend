// Customer Dashboard Screen - Matching reference design
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { customerDashboardAPI } from '../../api';
import { useNavigation } from '@react-navigation/native';

const CustomerDashboardScreen = () => {
    const navigation = useNavigation();
    const { user, logout, switchRole } = useAuth();
    const [activeTab, setActiveTab] = useState('ledger');
    const [ledgerData, setLedgerData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);

    useEffect(() => {
        loadLedger();
    }, []);

    const loadLedger = async () => {
        try {
            const response = await customerDashboardAPI.getLedger();
            setLedgerData(response.data || []);
        } catch (error) {
            console.log('Failed to load ledger:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadLedger();
    };

    const handleRoleSwitch = async (role) => {
        setShowRoleDropdown(false);
        if (role !== user?.active_role) {
            const success = await switchRole(role);
            if (success) {
                // Navigate to the appropriate screen
                if (role === 'shop_owner') {
                    navigation.reset({ index: 0, routes: [{ name: 'ShopOwnerDashboard' }] });
                } else if (role === 'admin') {
                    navigation.reset({ index: 0, routes: [{ name: 'AdminPanel' }] });
                }
            }
        }
    };

    const formatCurrency = (amount) => {
        return '₹' + Math.abs(amount || 0).toLocaleString('en-IN');
    };

    // Header Component
    const Header = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <Text style={styles.logo}>ShopMunim</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.roleSelector}
                        onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                    >
                        <Ionicons name="person" size={16} color="#3B82F6" />
                        <Text style={styles.roleSelectorText}>Customer</Text>
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
                        {user?.active_role === 'customer' && (
                            <Ionicons name="checkmark" size={18} color="#3B82F6" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roleOption, user?.active_role === 'shop_owner' && styles.roleOptionActive]}
                        onPress={() => handleRoleSwitch('shop_owner')}
                    >
                        <Ionicons name="storefront" size={18} color="#8B5CF6" />
                        <Text style={styles.roleOptionText}>Shop Owner</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roleOption, user?.active_role === 'admin' && styles.roleOptionActive]}
                        onPress={() => handleRoleSwitch('admin')}
                    >
                        <Ionicons name="shield" size={18} color="#F59E0B" />
                        <Text style={styles.roleOptionText}>Admin</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    // Empty State Component
    const EmptyState = () => (
        <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Welcome to ShopMunim!</Text>
            <Text style={styles.emptyDescription}>
                No shop records found. Visit shops that use{'\n'}ShopMunim to see your ledger here.
            </Text>
            <View style={styles.chartIconContainer}>
                <View style={styles.chartIcon}>
                    <View style={[styles.chartBar, { height: 30, backgroundColor: '#EC4899' }]} />
                    <View style={[styles.chartBar, { height: 45, backgroundColor: '#3B82F6' }]} />
                    <View style={[styles.chartBar, { height: 35, backgroundColor: '#10B981' }]} />
                </View>
            </View>
            <Text style={styles.emptyHint}>
                Shop owners can add you as a customer to{'\n'}track your purchases and payments.
            </Text>
        </View>
    );

    // Ledger Tab Content
    const LedgerContent = () => (
        <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {loading ? (
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
            ) : ledgerData.length === 0 ? (
                <EmptyState />
            ) : (
                <View style={styles.ledgerList}>
                    {ledgerData.map((item, index) => (
                        <View key={index} style={styles.ledgerItem}>
                            <View style={styles.ledgerInfo}>
                                <Text style={styles.shopName}>{item.shop?.name}</Text>
                                <Text style={styles.shopLocation}>{item.shop?.location}</Text>
                            </View>
                            <Text style={[
                                styles.balanceAmount,
                                { color: item.customer?.balance < 0 ? '#EF4444' : '#10B981' }
                            ]}>
                                {item.customer?.balance < 0 ? '-' : item.customer?.balance > 0 ? '+' : ''}
                                {formatCurrency(item.customer?.balance)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );

    // Payments Tab Content
    const PaymentsContent = () => (
        <ScrollView style={styles.tabContent}>
            <EmptyState />
        </ScrollView>
    );

    // History Tab Content
    const HistoryContent = () => (
        <ScrollView style={styles.tabContent}>
            <EmptyState />
        </ScrollView>
    );

    // Account Tab Content - Matching reference exactly
    const AccountContent = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.accountScrollContent}>
            {/* Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={40} color="#8B5CF6" />
                </View>
                <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                <Text style={styles.profilePhone}>+91 {user?.phone}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Customer</Text>
                </View>
            </View>

            {/* Account Settings */}
            <View style={styles.settingsCard}>
                <Text style={styles.settingsTitle}>Account Settings</Text>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingIcon}>📝</Text>
                    <Text style={styles.settingText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingIcon}>🔔</Text>
                    <Text style={styles.settingText}>Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingIcon}>🔒</Text>
                    <Text style={styles.settingText}>Privacy & Security</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]}>
                    <Text style={styles.settingIcon}>🌐</Text>
                    <Text style={styles.settingText}>Language</Text>
                </TouchableOpacity>
            </View>

            {/* Help & About Section */}
            <View style={styles.settingsCard}>
                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingIcon}>❓</Text>
                    <Text style={styles.settingText}>Help & Support</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingIcon}>ℹ️</Text>
                    <Text style={styles.settingText}>About ShopMunim</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]} onPress={logout}>
                    <Text style={styles.settingIcon}>🚪</Text>
                    <Text style={[styles.settingText, styles.logoutText]}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerBrand}>ShopMunim</Text>
                <Text style={styles.footerVersion}>Version 1.0.0</Text>
                <Text style={styles.footerTagline}>Digital Credit & Payment Ledger</Text>
            </View>
        </ScrollView>
    );

    // Render active tab content
    const renderContent = () => {
        switch (activeTab) {
            case 'ledger': return <LedgerContent />;
            case 'payments': return <PaymentsContent />;
            case 'history': return <HistoryContent />;
            case 'account': return <AccountContent />;
            default: return <LedgerContent />;
        }
    };

    // Bottom Navigation Tab
    const TabButton = ({ name, icon, label }) => (
        <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab(name)}
        >
            <View style={[styles.tabIconContainer, activeTab === name && styles.tabIconActive]}>
                <Ionicons name={icon} size={22} color={activeTab === name ? '#3B82F6' : '#666'} />
            </View>
            <Text style={[styles.tabLabel, activeTab === name && styles.tabLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header />
            <View style={styles.content}>{renderContent()}</View>
            <View style={styles.bottomNav}>
                <TabButton name="ledger" icon="book-outline" label="Ledger" />
                <TabButton name="payments" icon="card-outline" label="Payments" />
                <TabButton name="history" icon="time-outline" label="History" />
                <TabButton name="account" icon="person-outline" label="Account" />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    content: { flex: 1 },

    // Header
    header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logo: { fontSize: 20, fontWeight: 'bold', color: '#3B82F6' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    roleSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5, gap: 6 },
    roleSelectorText: { fontSize: 14, color: '#333' },
    headerLogout: { fontSize: 14, color: '#666' },
    headerBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    welcomeText: { fontSize: 14, color: '#666' },
    userName: { fontWeight: 'bold', color: '#333' },
    phoneContainer: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
    phoneText: { fontSize: 12, color: '#00000' },

    // Role Dropdown
    roleDropdown: { position: 'absolute', top: 45, right: 60, backgroundColor: '#fff', borderRadius: 8, elevation: 5, padding: 8, zIndex: 100, minWidth: 160 },
    roleOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 10 },
    roleOptionActive: { backgroundColor: '#F0F9FF', borderRadius: 6 },
    roleOptionText: { flex: 1, fontSize: 14, color: '#333' },

    // Tab Content
    tabContent: { flex: 1, padding: 16 },

    // Empty State
    emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 8 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    emptyDescription: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
    chartIconContainer: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, marginVertical: 20 },
    chartIcon: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    chartBar: { width: 20, borderRadius: 4 },
    emptyHint: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },

    // Ledger List
    ledgerList: { gap: 12 },
    ledgerItem: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ledgerInfo: { flex: 1 },
    shopName: { fontSize: 16, fontWeight: '600', color: '#333' },
    shopLocation: { fontSize: 13, color: '#666', marginTop: 2 },
    balanceAmount: { fontSize: 16, fontWeight: 'bold' },

    // Profile Card
    profileCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 16 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    profileName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    profilePhone: { fontSize: 14, color: '#666', marginTop: 4 },
    roleBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
    roleBadgeText: { fontSize: 14, color: '#666' },

    // Settings Card
    settingsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
    settingsTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    settingItemLast: { borderBottomWidth: 0 },
    settingIcon: { fontSize: 18, marginRight: 12 },
    settingText: { flex: 1, fontSize: 15, color: '#333' },
    logoutText: { color: '#EF4444' },

    // Footer
    accountScrollContent: { flexGrow: 1, paddingBottom: 30 },
    footer: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 'auto', marginBottom: 16 },
    footerBrand: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6' },
    footerVersion: { fontSize: 12, color: '#999', marginTop: 4 },
    footerTagline: { fontSize: 12, color: '#999', marginTop: 2 },

    // Bottom Navigation
    bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E5E5', paddingBottom: 4, paddingTop: 4 },
    tabButton: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    tabIconContainer: { padding: 6, borderRadius: 16 },
    tabIconActive: { backgroundColor: '#EBF5FF' },
    tabLabel: { fontSize: 10, color: '#666', marginTop: 2 },
    tabLabelActive: { color: '#3B82F6', fontWeight: '500' },
});

export default CustomerDashboardScreen;
