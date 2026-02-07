// Customer Detail Screen - With same header and bottom nav as Dashboard
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
    TextInput,
    Linking,
    Share,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { customerAPI, transactionAPI, productAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import AddTransactionModal from './AddTransactionModal';

const CustomerDetailScreen = ({ route, navigation }) => {
    const { customer: initialCustomer, shopId } = route.params;
    const { user, logout } = useAuth();
    const [customer, setCustomer] = useState(initialCustomer);
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);

    // Modal
    const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [transactionType, setTransactionType] = useState('all');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [shopId, initialCustomer?.id])
    );

    useEffect(() => {
        applyFilters();
    }, [transactions, dateFrom, dateTo, transactionType]);

    const loadData = async () => {
        setLoading(true);
        try {
            const transactionsRes = await customerAPI.getTransactions(shopId, customer.id);
            const sorted = (transactionsRes.data || []).sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(sorted);

            const productsRes = await productAPI.getAll(shopId);
            setProducts(productsRes.data?.filter(p => p.active) || []);

            try {
                const customersRes = await customerAPI.getAll(shopId);
                const updatedCustomer = customersRes.data?.find(c => c.id === customer.id);
                if (updatedCustomer) {
                    setCustomer(updatedCustomer);
                }
            } catch (e) {
                console.log('Could not refresh customer:', e);
            }
        } catch (error) {
            console.error('Load data error:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...transactions];

        if (dateFrom) {
            filtered = filtered.filter(t => new Date(t.date) >= new Date(dateFrom));
        }
        if (dateTo) {
            filtered = filtered.filter(t => new Date(t.date) <= new Date(dateTo + 'T23:59:59'));
        }
        if (transactionType !== 'all') {
            filtered = filtered.filter(t => t.type === transactionType);
        }

        setFilteredTransactions(filtered);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleTransactionSuccess = () => {
        loadData();
    };

    const calculateStats = () => {
        const credits = filteredTransactions.filter(t => t.type === 'credit');
        const payments = filteredTransactions.filter(t => t.type === 'debit' || t.type === 'payment');

        const totalCreditsAmount = credits.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalPaymentsAmount = payments.reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalItems = filteredTransactions.reduce((sum, t) => {
            const items = t.products || t.items || [];
            return sum + items.reduce((itemSum, p) => itemSum + (p.quantity || 0), 0);
        }, 0);

        return {
            totalTransactions: filteredTransactions.length,
            totalCredits: credits.length,
            totalPayments: payments.length,
            totalCreditsAmount,
            totalPaymentsAmount,
            totalItems,
            netBalance: totalPaymentsAmount - totalCreditsAmount
        };
    };

    const stats = calculateStats();

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount || 0).toFixed(2)}`;
    };

    const formatShortDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}`;
    };

    const handleSendUPILink = async () => {
        if (!customer || (customer?.balance || 0) >= 0) {
            Alert.alert('Info', 'No pending dues for this customer');
            return;
        }
        const amount = Math.abs(customer?.balance || 0);
        try {
            await Share.share({
                message: `Please pay ₹${amount.toFixed(2)} via UPI`,
                title: 'Payment Request'
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to share UPI link');
        }
    };

    const handlePaymentRequest = async () => {
        if (!customer || (customer?.balance || 0) >= 0) {
            Alert.alert('Info', 'No pending dues for this customer');
            return;
        }
        const message = `Hi ${customer?.name || 'Customer'}, your pending dues are ₹${Math.abs(customer?.balance || 0).toFixed(2)}. Please clear your dues. Thank you!`;
        try {
            await Share.share({ message });
        } catch (error) {
            Alert.alert('Error', 'Failed to send payment request');
        }
    };

    const getBalanceColor = () => {
        const balance = customer?.balance || 0;
        if (balance < 0) return '#EF4444';
        if (balance > 0) return '#10B981';
        return '#10B981';
    };

    const getBalanceLabel = () => {
        const balance = customer?.balance || 0;
        if (balance < 0) return 'Owes';
        if (balance > 0) return 'Credit';
        return 'Clear';
    };

    const getBalanceBgColor = () => {
        const balance = customer?.balance || 0;
        if (balance < 0) return '#FEE2E2';
        if (balance > 0) return '#D1FAE5';
        return '#D1FAE5';
    };

    // Header Component - Same as Dashboard
    const Header = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <Text style={styles.logo}>ShopMunim</Text>
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
        </View>
    );

    // Tab Button - Same as Dashboard
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

    const handleTabPress = (tabName) => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header - Same as Dashboard */}
            <Header />

            <View style={styles.content}>
                <ScrollView
                    style={styles.scrollView}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back Button + Title Row */}
                    <View style={styles.backRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#374151" />
                        </TouchableOpacity>
                        <View style={styles.pageTitle}>
                            <Text style={styles.pageTitleText}>Customer Details</Text>
                            <Text style={styles.pageSubtitle}>Transaction history and management</Text>
                        </View>
                    </View>

                    {/* Customer Info Card */}
                    <View style={styles.customerCard}>
                        <View style={styles.customerLeft}>
                            <Text style={styles.customerName}>{customer?.name || 'Unknown'}</Text>
                            <Text style={styles.customerPhone}>+91 {customer?.phone || 'N/A'}</Text>
                        </View>
                        <View style={styles.customerRight}>
                            <Text style={[styles.balanceAmount, { color: getBalanceColor() }]}>
                                {(customer?.balance || 0) < 0 ? '-' : (customer?.balance || 0) > 0 ? '+' : ''}₹{Math.abs(customer?.balance || 0).toFixed(2)}
                            </Text>
                            <View style={[styles.balanceBadge, { backgroundColor: getBalanceBgColor() }]}>
                                <Text style={[styles.balanceBadgeText, { color: getBalanceColor() }]}>
                                    {getBalanceLabel()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Add Transaction Button */}
                    <TouchableOpacity
                        style={styles.addTransactionBtn}
                        onPress={() => setShowAddTransactionModal(true)}
                    >
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.addTransactionText}>Add Transaction</Text>
                    </TouchableOpacity>

                    {/* Send UPI Link Button */}
                    <TouchableOpacity style={styles.sendUpiBtn} onPress={handleSendUPILink}>
                        <Ionicons name="phone-portrait-outline" size={18} color="#374151" />
                        <Text style={styles.sendUpiBtnText}>Send UPI Link</Text>
                    </TouchableOpacity>

                    {/* Payment Request Button */}
                    <TouchableOpacity style={styles.paymentRequestBtn} onPress={handlePaymentRequest}>
                        <Ionicons name="notifications-outline" size={18} color="#fff" />
                        <Text style={styles.paymentRequestText}>Payment Request</Text>
                    </TouchableOpacity>

                    {/* Loading State */}
                    {loading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#2563EB" />
                            <Text style={styles.loadingText}>Loading transactions...</Text>
                        </View>
                    )}

                    {!loading && (
                        <>
                            {/* Purchase Analytics Section */}
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="bar-chart-outline" size={18} color="#374151" />
                                    <Text style={styles.sectionTitle}>Purchase Analytics</Text>
                                </View>

                                <View style={styles.statsGrid}>
                                    <View style={[styles.statBox, { backgroundColor: '#EFF6FF' }]}>
                                        <Text style={[styles.statValue, { color: '#2563EB' }]}>{stats.totalTransactions}</Text>
                                        <Text style={styles.statLabel}>Total Transactions</Text>
                                    </View>
                                    <View style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}>
                                        <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.totalCredits}</Text>
                                        <Text style={styles.statLabel}>Credits Given</Text>
                                        <Text style={[styles.statSubValue, { color: '#EF4444' }]}>{formatCurrency(stats.totalCreditsAmount)}</Text>
                                    </View>
                                    <View style={[styles.statBox, { backgroundColor: '#D1FAE5' }]}>
                                        <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.totalPayments}</Text>
                                        <Text style={styles.statLabel}>Payments Received</Text>
                                        <Text style={[styles.statSubValue, { color: '#10B981' }]}>{formatCurrency(stats.totalPaymentsAmount)}</Text>
                                    </View>
                                    <View style={[styles.statBox, { backgroundColor: '#F3E8FF' }]}>
                                        <Text style={[styles.statValue, { color: '#7C3AED' }]}>{stats.totalItems}</Text>
                                        <Text style={styles.statLabel}>Items Purchased</Text>
                                    </View>
                                </View>

                                <View style={styles.netBalanceRow}>
                                    <Text style={styles.netBalanceLabel}>Net Transaction Balance:</Text>
                                    <View style={styles.netBalanceRight}>
                                        <Text style={[styles.netBalanceValue, { color: stats.netBalance >= 0 ? '#10B981' : '#EF4444' }]}>
                                            {formatCurrency(Math.abs(stats.netBalance))}
                                        </Text>
                                        <Text style={[styles.netBalanceStatus, { color: stats.netBalance >= 0 ? '#10B981' : '#EF4444' }]}>
                                            {stats.netBalance >= 0 ? 'Received' : 'Given'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Filters & Export Section */}
                            <View style={styles.sectionCard}>
                                <View style={styles.filterHeader}>
                                    <View style={styles.filterTitleRow}>
                                        <Ionicons name="filter-outline" size={18} color="#374151" />
                                        <Text style={styles.sectionTitle}>Filters & Export</Text>
                                    </View>
                                    <View style={styles.exportButtons}>
                                        <TouchableOpacity style={styles.pdfBtn}>
                                            <Ionicons name="document-text-outline" size={14} color="#EF4444" />
                                            <Text style={styles.pdfBtnText}>PDF</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.excelBtn}>
                                            <Ionicons name="grid-outline" size={14} color="#10B981" />
                                            <Text style={styles.excelBtnText}>Excel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.dateFiltersRow}>
                                    <View style={styles.dateFilterItem}>
                                        <Text style={styles.filterLabel}>From Date</Text>
                                        <View style={styles.dateInputContainer}>
                                            <TextInput
                                                style={styles.dateInput}
                                                placeholder="dd-mm-yyyy"
                                                placeholderTextColor="#9CA3AF"
                                                value={dateFrom}
                                                onChangeText={setDateFrom}
                                            />
                                            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                                        </View>
                                    </View>
                                    <View style={styles.dateFilterItem}>
                                        <Text style={styles.filterLabel}>To Date</Text>
                                        <View style={styles.dateInputContainer}>
                                            <TextInput
                                                style={styles.dateInput}
                                                placeholder="dd-mm-yyyy"
                                                placeholderTextColor="#9CA3AF"
                                                value={dateTo}
                                                onChangeText={setDateTo}
                                            />
                                            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.typeFilterContainer}>
                                    <Text style={styles.filterLabel}>Transaction Type</Text>
                                    <View style={styles.typeDropdown}>
                                        <Text style={styles.typeDropdownText}>
                                            {transactionType === 'all' ? 'All Transactions' : transactionType === 'credit' ? 'Credits Only' : 'Payments Only'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                                    </View>
                                </View>
                            </View>

                            {/* Detailed Transaction History */}
                            <View style={styles.historySection}>
                                <Text style={styles.historyTitle}>Detailed Transaction History</Text>
                                <Text style={styles.historyCount}>Showing {filteredTransactions.length} transactions</Text>

                                {filteredTransactions.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                                        <Text style={styles.emptyText}>No transactions found</Text>
                                    </View>
                                ) : (
                                    filteredTransactions.map((transaction) => {
                                        const isPayment = transaction.type === 'debit' || transaction.type === 'payment';
                                        const items = transaction.products || transaction.items || [];

                                        return (
                                            <View key={transaction.id} style={styles.transactionCard}>
                                                <View style={styles.txHeader}>
                                                    <View style={[styles.txBadge, { backgroundColor: isPayment ? '#000' : '#EF4444' }]}>
                                                        <Text style={styles.txBadgeText}>{isPayment ? 'Payment' : 'Purchase'}</Text>
                                                    </View>
                                                    <View style={styles.txAmountSection}>
                                                        <Text style={[styles.txAmount, { color: isPayment ? '#10B981' : '#EF4444' }]}>
                                                            {`${isPayment ? '+' : '-'}₹${parseFloat(transaction.amount || 0).toFixed(2)}`}
                                                        </Text>
                                                        <Text style={styles.txAmountLabel}>Amount {isPayment ? 'paid' : 'owed'}</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.txDateRow}>
                                                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                                                    <Text style={styles.txDate}>{formatShortDate(transaction.date)}</Text>
                                                </View>

                                                {isPayment && (
                                                    <View style={styles.txNoteBox}>
                                                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                                        <Text style={styles.txNoteText}> Payment received - Balance updated</Text>
                                                    </View>
                                                )}

                                                {items.length > 0 && (
                                                    <View style={styles.itemsSection}>
                                                        <View style={styles.itemsHeader}>
                                                            <Ionicons name="cube-outline" size={14} color="#374151" />
                                                            <Text style={styles.itemsTitle}> Items Purchased:</Text>
                                                        </View>
                                                        {items.map((item, idx) => (
                                                            <View key={idx} style={styles.itemRow}>
                                                                <View style={styles.itemInfo}>
                                                                    <Text style={styles.itemName}>{item.name || 'Item'}</Text>
                                                                    <Text style={styles.itemPrice}>@ {formatCurrency(item.price || 0)} each</Text>
                                                                </View>
                                                                <View style={styles.itemQtySection}>
                                                                    <Text style={styles.itemQty}>Qty: {item.quantity || 1}</Text>
                                                                    <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal || (item.price || 0) * (item.quantity || 1))}</Text>
                                                                </View>
                                                            </View>
                                                        ))}
                                                        <View style={styles.itemsTotalRow}>
                                                            <Text style={styles.itemsTotalLabel}>Total Items: {items.reduce((sum, i) => sum + (i.quantity || 1), 0)}</Text>
                                                            <Text style={styles.itemsTotalValue}>Subtotal: {formatCurrency(items.reduce((sum, i) => sum + (i.subtotal || (i.price || 0) * (i.quantity || 1)), 0))}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })
                                )}
                            </View>
                        </>
                    )}

                    <View style={{ height: 20 }} />
                </ScrollView>
            </View>

            {/* Bottom Navigation - Same as Dashboard */}
            <View style={styles.bottomNav}>
                <TabButton name="home" icon="home-outline" label="Home" isActive={false} onPress={() => navigation.goBack()} />
                <TabButton name="products" icon="cube-outline" label="Products" isActive={false} onPress={() => navigation.goBack()} />
                <TabButton name="customers" icon="people-outline" label="Customers" isActive={true} onPress={() => navigation.goBack()} />
                <TabButton name="transactions" icon="receipt-outline" label="Transactions" isActive={false} onPress={() => navigation.goBack()} />
                <TabButton name="account" icon="person-outline" label="Account" isActive={false} onPress={() => navigation.goBack()} />
            </View>

            {/* Add Transaction Modal */}
            <AddTransactionModal
                visible={showAddTransactionModal}
                onClose={() => setShowAddTransactionModal(false)}
                shopId={shopId}
                onSuccess={handleTransactionSuccess}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    // Header styles - Same as Dashboard
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        fontSize: 20,
        fontWeight: '700',
        color: '#3B82F6',
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
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    roleSelectorText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    headerLogout: {
        fontSize: 13,
        color: '#EF4444',
        fontWeight: '500',
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    welcomeText: {
        fontSize: 14,
        color: '#6B7280',
    },
    userName: {
        fontWeight: '600',
        color: '#111827',
    },
    phoneContainer: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    phoneText: {
        fontSize: 12,
        color: '#374151',
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    // Bottom Navigation - Same as Dashboard
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    tabIconContainer: {
        width: 40,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
    },
    tabIconActive: {
        backgroundColor: '#EBF5FF',
    },
    tabLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 2,
    },
    tabLabelActive: {
        color: '#3B82F6',
        fontWeight: '500',
    },
    // Page content styles
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 12,
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    pageTitle: {},
    pageTitleText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    pageSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
    },
    customerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    customerLeft: {},
    customerName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    customerPhone: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    customerRight: {
        alignItems: 'flex-end',
    },
    balanceAmount: {
        fontSize: 20,
        fontWeight: '700',
    },
    balanceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 4,
    },
    balanceBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    addTransactionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
    },
    addTransactionText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
        marginLeft: 6,
    },
    sendUpiBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
    },
    sendUpiBtnText: {
        color: '#374151',
        fontWeight: '500',
        fontSize: 14,
        marginLeft: 6,
    },
    paymentRequestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F97316',
        padding: 14,
        borderRadius: 10,
        marginBottom: 16,
    },
    paymentRequestText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
        marginLeft: 6,
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 6,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statBox: {
        width: '48%',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
        textAlign: 'center',
    },
    statSubValue: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    netBalanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
    },
    netBalanceLabel: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    netBalanceRight: {
        alignItems: 'flex-end',
    },
    netBalanceValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    netBalanceStatus: {
        fontSize: 11,
        fontWeight: '500',
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    filterTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exportButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    pdfBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 6,
        backgroundColor: '#FEF2F2',
    },
    pdfBtnText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#EF4444',
        marginLeft: 4,
    },
    excelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#86EFAC',
        borderRadius: 6,
        backgroundColor: '#F0FDF4',
    },
    excelBtnText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#10B981',
        marginLeft: 4,
    },
    dateFiltersRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    dateFilterItem: {
        flex: 1,
    },
    filterLabel: {
        fontSize: 12,
        color: '#374151',
        fontWeight: '500',
        marginBottom: 4,
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    dateInput: {
        flex: 1,
        fontSize: 13,
        color: '#111827',
    },
    typeFilterContainer: {
        marginTop: 4,
    },
    typeDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    typeDropdownText: {
        fontSize: 13,
        color: '#111827',
    },
    historySection: {
        marginBottom: 16,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    historyCount: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 12,
    },
    transactionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    txHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    txBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    txBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    txAmountSection: {
        alignItems: 'flex-end',
    },
    txAmount: {
        fontSize: 18,
        fontWeight: '700',
    },
    txAmountLabel: {
        fontSize: 11,
        color: '#6B7280',
    },
    txDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    txDate: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 4,
    },
    txNoteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        padding: 8,
        borderRadius: 6,
        marginTop: 10,
    },
    txNoteText: {
        fontSize: 12,
        color: '#047857',
    },
    itemsSection: {
        backgroundColor: '#EFF6FF',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    itemsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E40AF',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 6,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    itemInfo: {},
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    itemPrice: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    itemQtySection: {
        alignItems: 'flex-end',
    },
    itemQty: {
        fontSize: 11,
        color: '#374151',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    itemSubtotal: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563EB',
        marginTop: 4,
    },
    itemsTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#BFDBFE',
    },
    itemsTotalLabel: {
        fontSize: 12,
        color: '#1E40AF',
        fontWeight: '500',
    },
    itemsTotalValue: {
        fontSize: 13,
        color: '#2563EB',
        fontWeight: '700',
    },
});

export default CustomerDetailScreen;
