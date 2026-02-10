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
    const [expandedItems, setExpandedItems] = useState({});

    const toggleExpand = (index) => {
        setExpandedItems(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

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

    const formatCurrency = (amount, type) => {
        const value = Math.abs(amount || 0).toFixed(2);
        const prefix = type === 'debit' ? '-' : '+';
        return `${prefix}₹${value}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        return `${day} ${month}, ${time}`;
    };

    // Calculate summary stats
    const getSummaryStats = () => {
        const totalShops = ledgerData.length;
        let totalOwed = 0;
        let netBalance = 0;

        ledgerData.forEach(item => {
            const balance = item.customer?.balance || 0;
            if (balance < 0) {
                totalOwed += Math.abs(balance);
            }
            netBalance += balance;
        });

        return { totalShops, totalOwed, netBalance };
    };

    const stats = getSummaryStats();

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

    // Summary Stats Cards for Ledger Tab
    const SummaryStatsCards = () => (
        <View style={styles.statsContainer}>
            <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🏪</Text>
                <Text style={styles.statValue}>{stats.totalShops}</Text>
                <Text style={styles.statLabel}>Shops</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={styles.statEmoji}>💰</Text>
                <Text style={[styles.statValue, styles.statValueRed]}>₹{Math.abs(stats.totalOwed || 0).toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Owed</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={styles.statEmoji}>📊</Text>
                <Text style={styles.statValue}>
                    {stats.netBalance < 0 ? '-' : ''}₹{Math.abs(stats.netBalance || 0).toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Net Balance</Text>
            </View>
        </View>
    );

    // Empty State Component for Ledger
    const LedgerEmptyState = () => (
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
            contentContainerStyle={{ paddingBottom: 30 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {loading ? (
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
            ) : ledgerData.length === 0 ? (
                <LedgerEmptyState />
            ) : (
                <>
                    <SummaryStatsCards />
                    <View style={styles.ledgerList}>
                        {ledgerData.map((item, index) => (
                            <View key={index} style={styles.ledgerItemContainer}>
                                <View style={styles.ledgerItemHeader}>
                                    <View style={styles.ledgerInfo}>
                                        <Text style={styles.shopName}>{item.shop?.name}</Text>
                                        <Text style={styles.shopLocation}>{item.shop?.location}</Text>
                                    </View>

                                    {(() => {
                                        const balance = item.customer?.balance || 0;
                                        let badgeStyle = styles.badgeClear;
                                        let textStyle = styles.badgeClearText;
                                        let iconColor = "#666";
                                        let label = "Clear";

                                        if (balance < 0) {
                                            badgeStyle = styles.badgeOwe;
                                            textStyle = styles.badgeOweText;
                                            iconColor = "#fff";
                                            label = "Owe";
                                        } else if (balance > 0) {
                                            badgeStyle = styles.badgeCredit;
                                            textStyle = styles.badgeCreditText;
                                            iconColor = "#fff";
                                            label = "Credit";
                                        }

                                        return (
                                            <TouchableOpacity
                                                style={[styles.ledgerBadge, badgeStyle]}
                                                onPress={() => toggleExpand(index)}
                                            >
                                                <Text style={[styles.ledgerBadgeText, textStyle]}>
                                                    {label} ₹{Math.abs(balance).toFixed(2)}
                                                </Text>
                                                <Ionicons
                                                    name={expandedItems[index] ? "chevron-up" : "chevron-down"}
                                                    size={16}
                                                    color={iconColor}
                                                />
                                            </TouchableOpacity>
                                        );
                                    })()}
                                </View>

                                {expandedItems[index] && (
                                    <View style={styles.transactionsSection}>
                                        {/* Pending Amount Card - Only show if balance is negative (Owe) */}
                                        {(item.customer?.balance || 0) < 0 && (
                                            <View style={styles.pendingCard}>
                                                <View>
                                                    <Text style={styles.pendingTitle}>Pending Payment</Text>
                                                    <Text style={styles.pendingSubtitle}>
                                                        You owe ₹{Math.abs(item.customer?.balance || 0).toFixed(2)}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity style={styles.payNowButton}>
                                                    <Text style={styles.payNowButtonText}>Pay Now</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        <Text style={styles.transactionsTitle}>Recent Transactions</Text>
                                        {item.transactions && item.transactions.length > 0 ? (
                                            item.transactions.map((tx, i) => (
                                                <View key={i} style={styles.transactionRowContainer}>
                                                    <View style={styles.transactionRowTop}>
                                                        <View style={styles.badgeContainer}>
                                                            <View style={[styles.typeBadge, tx.type === 'debit' ? styles.badgeBlack : styles.badgeRed]}>
                                                                <Text style={styles.badgeText}>
                                                                    {tx.type === 'debit' ? 'Payment' : 'Credit'}
                                                                </Text>
                                                            </View>
                                                            <Text style={styles.transactionDate}>{formatDate(tx.date)}</Text>
                                                        </View>
                                                        <Text style={[
                                                            styles.transactionAmount,
                                                            tx.type === 'debit' ? styles.textGreen : styles.textRed
                                                        ]}>
                                                            {formatCurrency(tx.amount, tx.type)}
                                                        </Text>
                                                    </View>

                                                    {tx.products && tx.products.length > 0 && (
                                                        <Text style={styles.transactionItems}>
                                                            {tx.products.map(p => `${p.product?.name || p.name || 'Item'} x${p.quantity}`).join(', ')}
                                                        </Text>
                                                    )}
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={styles.noTransactionsText}>No transactions yet</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </>
            )}
        </ScrollView>
    );

    // Payments Tab Content - Matching reference design
    const PaymentsContent = () => {
        if (loading) {
            return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />;
        }

        if (ledgerData.length === 0) {
            return (
                <View style={styles.tabContent}>
                    <LedgerEmptyState />
                </View>
            );
        }

        const pendingPayments = ledgerData.filter(item => (item.customer?.balance || 0) < 0);

        return (
            <ScrollView style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Payment Center</Text>
                <Text style={styles.sectionSubtitle}>Pending Payments</Text>

                {pendingPayments.length > 0 ? (
                    <View style={styles.pendingList}>
                        {pendingPayments.map((item, index) => (
                            <View key={index} style={styles.paymentCard}>
                                <View style={styles.paymentCardContent}>
                                    <View style={styles.paymentInfo}>
                                        <Text style={styles.paymentShopName}>{item.shop?.name}</Text>
                                        <Text style={styles.paymentShopLocation}>{item.shop?.location}</Text>
                                        <Text style={styles.paymentOweText}>Owe: ₹{Math.abs(item.customer?.balance || 0).toFixed(2)}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.paymentPayBtn}>
                                        <Text style={styles.paymentPayBtnText}>Pay Now</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.pendingPaymentsCard}>
                        <View style={styles.checkmarkCircle}>
                            <Ionicons name="checkmark" size={40} color="#fff" />
                        </View>
                        <Text style={styles.pendingPaymentsText}>No pending payments</Text>
                        <Text style={styles.pendingPaymentsSubtext}>All dues are cleared!</Text>
                    </View>
                )}

                {/* Quick Actions Section */}
                <View style={styles.quickActionsOuterCard}>
                    <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsContainer}>
                        <TouchableOpacity style={styles.quickActionCard}>
                            <Text style={styles.quickActionEmoji}>🔔</Text>
                            <Text style={styles.quickActionText}>Payment Reminders</Text>
                        </TouchableOpacity>
                        <View style={{ width: 12 }} />
                        <TouchableOpacity style={styles.quickActionCard}>
                            <Text style={styles.quickActionEmoji}>📊</Text>
                            <Text style={styles.quickActionText}>Download Report</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        );
    };

    // History Tab Content - Matching reference design
    const HistoryContent = () => {

        if (loading) {
            return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />;
        }

        if (ledgerData.length === 0) {
            return (
                <View style={styles.tabContent}>
                    <LedgerEmptyState />
                </View>
            );
        }

        // Flatten and sort transactions
        const allTransactions = ledgerData.reduce((acc, shop) => {
            if (shop.transactions) {
                const shopTx = shop.transactions.map(tx => ({ ...tx, shopName: shop.shop?.name }));
                return [...acc, ...shopTx];
            }
            return acc;
        }, []).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allTransactions.length === 0) {
            return (
                <View style={styles.tabContent}>
                    <View style={styles.historyEmptyCard}>
                        <Text style={styles.historyEmoji}>📋</Text>
                        <Text style={styles.historyEmptyTitle}>No transaction history</Text>
                        <Text style={styles.historyEmptySubtext}>Your transactions will appear here</Text>
                    </View>
                </View>
            );
        }

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                <View style={styles.historyList}>
                    {allTransactions.map((tx, index) => (
                        <View key={index} style={styles.historyCard}>
                            <View style={styles.historyTopRow}>
                                {/* Left Column: Name and Date */}
                                <View style={styles.historyLeftCol}>
                                    <Text style={styles.historyShopName}>{tx.shopName}</Text>
                                    <Text style={styles.historyDate}>{formatDate(tx.date)}</Text>
                                </View>

                                {/* Right Column: Amount and Badge */}
                                <View style={styles.historyRightCol}>
                                    <Text style={[
                                        styles.historyAmount,
                                        tx.type === 'debit' ? styles.textGreen : styles.textRed
                                    ]}>
                                        {formatCurrency(tx.amount, tx.type)}
                                    </Text>
                                    <View style={[styles.historyBadge, tx.type === 'debit' ? styles.badgeBlack : styles.badgeRed]}>
                                        <Text style={styles.historyBadgeText}>
                                            {tx.type === 'debit' ? 'Payment Made' : 'Credit Taken'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Items Section (Gray Box) */}
                            {tx.products && tx.products.length > 0 && (
                                <View style={styles.historyItemsContainer}>
                                    <Text style={styles.historyLabel}>Items: </Text>
                                    <Text style={styles.historyValue}>
                                        {tx.products.map(p => `${p.product?.name || p.name || 'Item'} x${p.quantity} (₹${p.price || 0})`).join(', ')}
                                    </Text>
                                </View>
                            )}

                            {/* Note Section (Text on Card) */}
                            {tx.note ? (
                                <View style={styles.historyNoteRow}>
                                    <Text style={styles.historyLabel}>Note: </Text>
                                    <Text style={styles.historyValue}>{tx.note}</Text>
                                </View>
                            ) : null}
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

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

    console.log('Rendering CustomerDashboard', { activeTab, ledgerDataLength: ledgerData.length });

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
    container: { flex: 1, backgroundColor: '#fff' }, // Changed background to white as per screenshot often implies cleaner look, but let's keep it clean
    content: { flex: 1, backgroundColor: '#F9FAFB' }, // Content background

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
    phoneText: { fontSize: 12, color: '#000' },

    // Role Dropdown
    roleDropdown: { position: 'absolute', top: 45, right: 60, backgroundColor: '#fff', borderRadius: 8, elevation: 5, padding: 8, zIndex: 100, minWidth: 160 },
    roleOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 10 },
    roleOptionActive: { backgroundColor: '#F0F9FF', borderRadius: 6 },
    roleOptionText: { flex: 1, fontSize: 14, color: '#333' },

    // Tab Content
    tabContent: { flex: 1, padding: 16 },

    // Summary Stats Cards
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
    statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E5' },
    statEmoji: { fontSize: 24, marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    statValueRed: { color: '#EF4444' },
    statLabel: { fontSize: 12, color: '#666', marginTop: 2 },

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
    ledgerItemContainer: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5E5', overflow: 'hidden' },
    ledgerItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    ledgerInfo: { flex: 1 },
    shopName: { fontSize: 16, fontWeight: '600', color: '#333' },
    shopLocation: { fontSize: 13, color: '#666', marginTop: 2 },

    // Ledger Badges
    ledgerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    ledgerBadgeText: { fontSize: 13, fontWeight: '600' },

    badgeClear: { backgroundColor: '#F3F4F6' },
    badgeClearText: { color: '#374151' },

    badgeCredit: { backgroundColor: '#111827' },
    badgeCreditText: { color: '#fff' },

    badgeOwe: { backgroundColor: '#EF4444' },
    badgeOweText: { color: '#fff' },

    // Transactions Section
    transactionsSection: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff' },

    // Pending Payment Card
    pendingCard: { backgroundColor: '#FFF5F5', borderRadius: 8, padding: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
    pendingTitle: { fontSize: 13, fontWeight: '700', color: '#7F1D1D', marginBottom: 2 },
    pendingSubtitle: { fontSize: 12, color: '#EF4444' },
    payNowButton: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    payNowButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    transactionsTitle: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 12 },
    noTransactionsText: { fontSize: 13, color: '#999', fontStyle: 'italic', marginBottom: 12 },

    transactionRowContainer: { marginBottom: 12, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12 },
    transactionRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeRed: { backgroundColor: '#EF4444' },
    badgeBlack: { backgroundColor: '#111827' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    transactionDate: { fontSize: 12, color: '#6B7280' },
    transactionAmount: { fontSize: 14, fontWeight: '700' },
    transactionItems: { fontSize: 13, color: '#374151', marginLeft: 2 },
    textRed: { color: '#EF4444' },
    textGreen: { color: '#10B981' },

    // History List
    historyList: { gap: 16, paddingBottom: 20 },
    historyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E5E5', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },

    // History Top Row
    historyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    historyLeftCol: { flex: 1 },
    historyRightCol: { alignItems: 'flex-end' },

    // History Text Styles
    historyShopName: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    historyDate: { fontSize: 13, color: '#6B7280' },
    historyAmount: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },

    // History Badge
    historyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    historyBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

    // History Items Box
    historyItemsContainer: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginTop: 12 },

    // History Note Row
    historyNoteRow: { flexDirection: 'row', marginTop: 12, paddingHorizontal: 4 },

    historyLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
    historyValue: { fontSize: 13, color: '#4B5563', flex: 1 },

    // Section Titles
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 }, // Added generic margin
    sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },

    // Pending Payments Card
    pendingPaymentsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#E5E5E5' },
    checkmarkCircle: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    pendingPaymentsText: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
    pendingPaymentsSubtext: { fontSize: 14, color: '#666' },

    // Payment Card (New)
    pendingList: { marginBottom: 20 },
    paymentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5E5' },
    paymentCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    paymentInfo: { flex: 1 },
    paymentShopName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
    paymentShopLocation: { fontSize: 13, color: '#666', marginBottom: 8 },
    paymentOweText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
    paymentPayBtn: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    paymentPayBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    // Quick Actions
    quickActionsOuterCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E5E5', marginBottom: 20 },
    quickActionsTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    quickActionsContainer: { flexDirection: 'row' },
    quickActionCard: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
    quickActionEmoji: { fontSize: 20, marginBottom: 8 },
    quickActionText: { fontSize: 12, color: '#333', textAlign: 'center', fontWeight: '500' },

    // History Empty State
    historyEmptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 48, alignItems: 'center', marginTop: 24 },
    historyEmoji: { fontSize: 48, marginBottom: 16 },
    historyEmptyTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
    historyEmptySubtext: { fontSize: 14, color: '#666' },

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
