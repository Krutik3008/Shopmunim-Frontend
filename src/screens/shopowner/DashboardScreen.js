// Shop Owner Dashboard Screen - Matching reference design exactly
import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Share,
    Switch,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { shopAPI, getAPIErrorMessage, customerAPI, productAPI, transactionAPI } from '../../api';
import { useNavigation } from '@react-navigation/native';
import AddTransactionModal from './AddTransactionModal';


const TransactionCard = ({ transaction, showNote = true }) => {
    const isCredit = transaction.type === 'credit';
    const isDebit = transaction.type === 'debit';
    const amountColor = isCredit ? '#10B981' : '#EF4444'; // Green for credit (taking), Red for debit (giving)? No wait.
    // Logic from image:
    // "Payment" (Black Badge) -> Green Amount (+40.00) -> This means money RECEIVED.
    // "Credit" (Red Badge) -> Red Amount (-20.00) -> This means money GIVEN (Udhaar).
    // So:
    // Debit (Take Payment) -> Payment Badge, Green Amount
    // Credit (Give Udhaar) -> Credit Badge, Red Amount

    const isPayment = isDebit; // Debit in our system = Take Payment
    const isUdhaar = isCredit; // Credit in our system = Give Udhaar

    const badgeLabel = isPayment ? 'Payment' : 'Credit';
    const badgeColor = isPayment ? '#000' : '#EF4444'; // Black vs Red
    const amountStyle = { color: isPayment ? '#10B981' : '#EF4444' };
    const sign = isPayment ? '+' : '-';

    const date = new Date(transaction.date);
    const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const items = transaction.products || transaction.items || [];

    return (
        <View style={styles.transactionCard}>
            <View style={styles.tCardTop}>
                <View>
                    <Text style={styles.tCardName}>{transaction.customer_name || 'Customer'}</Text>
                    <Text style={styles.tCardDate}>{dateStr}, {timeStr}</Text>
                </View>
                <View style={styles.tCardRight}>
                    <Text style={[styles.tCardAmount, amountStyle]}>{sign}₹{parseFloat(transaction.amount).toFixed(2)}</Text>
                    <View style={[styles.tCardBadge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.tCardBadgeText}>{badgeLabel}</Text>
                    </View>
                </View>
            </View>

            {items.length > 0 && (
                <View style={styles.tCardItems}>
                    <Text style={styles.tCardLabel}>Items:</Text>
                    <Text style={styles.tCardItemText}>
                        {items.map(i => `${i.name || 'Item'} (×${i.quantity})`).join('\n')}
                    </Text>
                </View>
            )}

            {showNote && transaction.note ? (
                <View style={styles.tCardNote}>
                    <Text style={styles.tCardLabel}>Note: <Text style={styles.tCardNoteText}>{transaction.note}</Text></Text>
                </View>
            ) : null}
        </View>
    );
};



const ShopOwnerDashboardScreen = () => {
    const navigation = useNavigation();
    const { user, logout, switchRole } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);
    const [shopName, setShopName] = useState('');
    const [shopCategory, setShopCategory] = useState('');
    const [shopLocation, setShopLocation] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [creating, setCreating] = useState(false);
    const [isShareExpanded, setIsShareExpanded] = useState(false);
    const [dashboardStats, setDashboardStats] = useState(null);

    // Add Customer State
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [addingCustomer, setAddingCustomer] = useState(false);

    // Add Transaction State
    const [transactions, setTransactions] = useState([]);
    const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);

    // Add Product State
    const [products, setProducts] = useState([]);
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [addingProduct, setAddingProduct] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Customer Detail View State
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerTransactions, setCustomerTransactions] = useState([]);
    const [loadingCustomerData, setLoadingCustomerData] = useState(false);
    const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);

    // Payment Request Modal State
    const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
    const [paymentRequestTab, setPaymentRequestTab] = useState('sendNow');
    const [requestType, setRequestType] = useState('Payment Due Reminder');
    const [sendVia, setSendVia] = useState('Push Notification');
    const [reminderMessage, setReminderMessage] = useState('');
    const [showRequestTypeDropdown, setShowRequestTypeDropdown] = useState(false);
    const [showSendViaDropdown, setShowSendViaDropdown] = useState(false);
    const [scheduleDate, setScheduleDate] = useState(null);
    const [scheduleTime, setScheduleTime] = useState(null);
    const [showScheduleDatePicker, setShowScheduleDatePicker] = useState(false);
    const [showScheduleTimePicker, setShowScheduleTimePicker] = useState(false);
    const [isAutoReminderEnabled, setIsAutoReminderEnabled] = useState(false);
    const [autoReminderDelay, setAutoReminderDelay] = useState('3 days overdue');
    const [showAutoReminderDelayDropdown, setShowAutoReminderDelayDropdown] = useState(false);
    const [autoReminderFrequency, setAutoReminderFrequency] = useState('Daily until paid');
    const [showAutoReminderFrequencyDropdown, setShowAutoReminderFrequencyDropdown] = useState(false);
    const [autoReminderMethod, setAutoReminderMethod] = useState('Push Notification');
    const [showAutoReminderMethodDropdown, setShowAutoReminderMethodDropdown] = useState(false);

    const viewShotRef = useRef();


    const SHOP_CATEGORIES = [
        'Grocery',
        'Restaurant/Food',
        'Electronics',
        'Clothing',
        'Medical/Pharmacy',
        'Other'
    ];

    const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;
    const formatShortDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}`;
    };

    useEffect(() => {
        loadShops();
    }, []);

    const loadDashboardStats = async (shopId) => {
        try {
            if (!shopId) return;
            const response = await shopAPI.getDashboard(shopId);
            setDashboardStats(response.data);
        } catch (error) {
            console.log('Failed to load dashboard stats:', error);
        }
    };

    // Load customers/products/transactions when switching tabs
    useEffect(() => {
        const currentShopId = user?.shop_id || (shops.length > 0 ? shops[0].id : null);

        if (currentShopId) {
            if (activeTab === 'customers') {
                loadCustomers(currentShopId);
            } else if (activeTab === 'products') {
                loadProducts(currentShopId);
            } else if (activeTab === 'transactions') {
                loadTransactions(currentShopId);
            }
        }
    }, [activeTab, user?.shop_id, shops]);

    const loadProducts = async (shopId) => {
        try {
            if (!shopId) return;
            const response = await productAPI.getAll(shopId);
            setProducts(response.data || []);
        } catch (error) {
            console.log('Failed to load products:', error);
        }
    };

    const openAddProductModal = () => {
        setEditingProduct(null);
        setNewProductName('');
        setNewProductPrice('');
        setShowAddProductModal(true);
    };

    const openEditProductModal = (product) => {
        setEditingProduct(product);
        setNewProductName(product.name);
        setNewProductPrice(String(product.price));
        setShowAddProductModal(true);
    };

    const handleAddProduct = async () => {
        if (!newProductName.trim()) {
            Alert.alert('Error', 'Please enter product name');
            return;
        }
        if (!newProductPrice.trim()) {
            Alert.alert('Error', 'Please enter product price');
            return;
        }

        setAddingProduct(true);
        try {
            const shopId = user?.shop_id || (shops.length > 0 ? shops[0].id : null);
            if (!shopId) {
                Alert.alert('Error', 'No shop found. Please create a shop first.');
                return;
            }

            if (editingProduct) {
                // UPDATE existing product
                await productAPI.update(shopId, editingProduct.id, {
                    name: newProductName.trim(),
                    price: parseFloat(newProductPrice)
                });
                Alert.alert('Success', 'Product updated successfully');
            } else {
                // CREATE new product
                await productAPI.create(shopId, {
                    name: newProductName.trim(),
                    price: parseFloat(newProductPrice)
                });
                Alert.alert('Success', 'Product added successfully');
            }

            setShowAddProductModal(false);
            setEditingProduct(null);
            setNewProductName('');
            setNewProductPrice('');
            loadProducts(shopId);
            loadDashboardStats(shopId); // Update stats (product count)
        } catch (error) {
            console.log('Failed to save product:', error);
            Alert.alert('Error', getAPIErrorMessage(error));
        } finally {
            setAddingProduct(false);
        }
    };

    const handleDeleteProduct = (product) => {
        Alert.alert(
            'Delete Product',
            `Are you sure you want to delete ${product.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const shopId = user?.shop_id || (shops.length > 0 ? shops[0].id : null);
                            if (shopId) {
                                await productAPI.delete(shopId, product.id);
                                loadProducts(shopId);
                                loadDashboardStats(shopId); // Refresh home stats
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete product');
                        }
                    }
                }
            ]
        );
    };

    const loadCustomers = async (shopId) => {
        try {
            // Check if shopId is valid before making request
            if (!shopId) return;

            const response = await customerAPI.getAll(shopId);
            setCustomers(response.data || []);
        } catch (error) {
            console.log('Failed to load customers:', error);
            // Don't show alert for background loads, maybe just log
        }
    };

    const loadTransactions = async (shopId) => {
        try {
            if (!shopId) return;
            const response = await transactionAPI.getAll(shopId);
            // Sort by date descending
            const sorted = (response.data || []).sort((a, b) => new Date(b.date) - new Date(a.date));

            console.log('Transactions loaded count:', sorted.length);
            if (sorted.length > 0) {
                console.log('Sample Transaction Keys:', Object.keys(sorted[0]));
                console.log('Sample Transaction Items (products):', JSON.stringify(sorted[0].products));
                console.log('Sample Transaction Items (items):', JSON.stringify(sorted[0].items));
            }

            // Enrich with customer names if possible, but Dashboard usually gets full data or we map it
            // Assuming API returns customer_name or we map it from customers list
            const enriched = sorted.map(t => {
                const customer = customers.find(c => c.id === t.customer_id);
                return { ...t, customer_name: customer?.name || t.customer_name || 'Unknown' };
            });
            setTransactions(enriched);
        } catch (error) {
            console.log('Failed to load transactions:', error);
        }
    };

    // New function that accepts customers list as parameter (avoids race condition)
    const loadTransactionsWithCustomers = async (shopId, customersList) => {
        try {
            if (!shopId) return;
            const response = await transactionAPI.getAll(shopId);
            const sorted = (response.data || []).sort((a, b) => new Date(b.date) - new Date(a.date));

            const enriched = sorted.map(t => {
                const customer = customersList.find(c => c.id === t.customer_id);
                return { ...t, customer_name: customer?.name || t.customer_name || 'Unknown' };
            });
            setTransactions(enriched);
        } catch (error) {
            console.log('Failed to load transactions:', error);
        }
    };

    const handleAddCustomer = async () => {
        if (!newCustomerName.trim()) {
            Alert.alert('Error', 'Please enter customer name');
            return;
        }
        if (!newCustomerPhone.trim() || newCustomerPhone.length !== 10) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number');
            return;
        }

        setAddingCustomer(true);
        try {
            const shopId = user?.shop_id || (shops.length > 0 ? shops[0].id : null);
            if (!shopId) {
                Alert.alert('Error', 'No shop found. Please create a shop first.');
                return;
            }

            await customerAPI.create(shopId, {
                name: newCustomerName.trim(),
                phone: newCustomerPhone.trim()
            });

            Alert.alert('Success', 'Customer added successfully');
            setShowAddCustomerModal(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
            loadCustomers(shopId); // Refresh list
            loadDashboardStats(shopId); // Refresh home stats
        } catch (error) {
            console.log('Failed to add customer:', error);
            Alert.alert('Error', getAPIErrorMessage(error));
        } finally {
            setAddingCustomer(false);
        }
    };

    const loadShops = async () => {
        try {
            const response = await shopAPI.getAll();
            const shopList = response.data || [];
            setShops(shopList);

            if (shopList.length > 0) {
                const shopId = shopList[0].id;
                loadDashboardStats(shopId);
                // Load customers first, then transactions (transactions need customer names)
                const customersRes = await customerAPI.getAll(shopId);
                const customersList = customersRes.data || [];
                setCustomers(customersList);
                // Now load transactions with customer names
                loadTransactionsWithCustomers(shopId, customersList);
            }
        } catch (error) {
            console.log('Failed to load shops:', error);
            if (!refreshing) { // Don't alert on pull-to-refresh, just log
                Alert.alert('Error', getAPIErrorMessage(error));
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadShops();
        // If we have a current shop, refresh its stats and data explicitly too
        if (user?.shop_id || (shops.length > 0 && shops[0].id)) {
            const shopId = user?.shop_id || shops[0].id;
            loadDashboardStats(shopId);
            if (activeTab === 'customers') loadCustomers(shopId);
            if (activeTab === 'products') loadProducts(shopId);
            if (activeTab === 'home') loadTransactions(shopId);
        }
    };

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

    const handleCreateShop = async () => {
        if (!shopName.trim()) {
            Alert.alert('Error', 'Please enter shop name');
            return;
        }
        if (!shopCategory) {
            Alert.alert('Error', 'Please select a category');
            return;
        }
        if (!shopLocation.trim()) {
            Alert.alert('Error', 'Please enter shop location');
            return;
        }
        setCreating(true);
        try {
            await shopAPI.create({
                name: shopName.trim(),
                category: shopCategory,
                location: shopLocation.trim()
            });
            setShowCreateModal(false);
            setShopName('');
            setShopCategory('');
            setShopLocation('');
            Alert.alert('Success', 'Shop created successfully!');
            loadShops();
        } catch (error) {
            console.log('Failed to create shop:', error);
            Alert.alert('Error', getAPIErrorMessage(error));
        } finally {
            setCreating(false);
        }
    };




    const handleShareQr = async () => {
        try {
            if (viewShotRef.current) {
                const uri = await viewShotRef.current.capture();
                if (uri) {
                    await Sharing.shareAsync(uri);
                }
            }
        } catch (error) {
            console.log('Share error:', error);
            Alert.alert('Error', 'Failed to share QR code');
        }
    };

    const handleDownloadQr = () => {
        // Reusing share for now as it provides save options
        handleShareQr();
    };

    const copyToClipboard = async () => {
        const link = `https://shopmunim.com/shop/${user?.shop_id || 'demo'}`;
        await Clipboard.setStringAsync(link);
        Alert.alert('Success', 'Link copied to clipboard!');
    };

    const handleShareLink = async (type) => {
        const link = `https://shopmunim.com/shop/${user?.shop_id || 'demo'}`;
        const message = `Check out my shop on ShopMunim: ${link}`;
        try {
            if (type === 'whatsapp') {
                await Share.share({ message });
            } else {
                await Share.share({ message });
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to share link');
        }
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

    // Empty State Card - Matching reference exactly
    const EmptyStateCard = () => (
        <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Welcome to ShopMunim!</Text>
            <Text style={styles.emptyDescription}>Create your first shop to get started</Text>
            <TouchableOpacity style={styles.createShopButton} onPress={() => setShowCreateModal(true)}>
                <Text style={styles.createShopText}>+ Create Your Shop</Text>
            </TouchableOpacity>
        </View>
    );

    // Home Tab Content
    const renderHomeContent = () => {
        const hasShops = shops.length > 0;

        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            );
        }

        if (!hasShops) {
            return (
                <ScrollView
                    style={styles.tabContent}
                    contentContainerStyle={styles.tabContentContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <EmptyStateCard />
                </ScrollView>
            );
        }

        // Dashboard with stats when shop exists
        return (
            <ScrollView
                style={styles.tabContent}
                contentContainerStyle={styles.dashboardContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Stats Cards Row 1 */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="people-outline" size={28} color="#6366F1" />
                        <Text style={styles.statNumber}>{dashboardStats?.total_customers || customers.length || 0}</Text>
                        <Text style={styles.statLabel}>Customers</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="cube-outline" size={28} color="#3B82F6" />
                        <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{dashboardStats?.total_products || products.length || 0}</Text>
                        <Text style={styles.statLabel}>Products</Text>
                    </View>
                </View>

                {/* Stats Cards Row 2 */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.rupeeCircle, { backgroundColor: '#EF4444' }]}>
                            <Text style={[styles.rupeeIcon, { color: '#fff' }]}>₹</Text>
                        </View>
                        <Text style={[styles.statNumber, { color: '#EF4444' }]}>
                            ₹{Math.abs(customers.reduce((acc, c) => acc + (c.balance < 0 ? c.balance : 0), 0)).toFixed(2)}
                        </Text>
                        <Text style={styles.statLabel}>Pending Dues</Text>

                        <TouchableOpacity
                            style={styles.transactionsButton}
                            onPress={() => setActiveTab('transactions')}
                        >
                            <Ionicons name="receipt-outline" size={14} color="#fff" />
                            <Text style={styles.transactionsButtonText}>Transactions</Text>
                        </TouchableOpacity>

                    </View>
                    <View style={styles.statCard}>
                        {/* With Dues - Orange Warning */}
                        <Ionicons name="warning-outline" size={28} color="#F59E0B" style={{ marginBottom: 4 }} />
                        <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
                            {customers.filter(c => c.balance < 0).length}
                        </Text>
                        <Text style={styles.statLabel}>With Dues</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsRow}>
                    <TouchableOpacity
                        style={styles.quickActionBlue}
                        onPress={() => setShowAddCustomerModal(true)}
                    >
                        <Ionicons name="person-add-outline" size={20} color="#fff" />
                        <Text style={styles.quickActionText}>Add Customer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickActionGreen}
                        onPress={() => setShowAddTransactionModal(true)}
                    >
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.quickActionText}>Add Transaction</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Activity */}
                <View style={styles.recentActivityCard}>
                    <Text style={styles.recentActivityTitle}>Recent Activity</Text>
                    {transactions.length === 0 ? (
                        <Text style={styles.recentActivityEmpty}>No transactions yet</Text>
                    ) : (
                        <View style={styles.transactionsList}>
                            {transactions.slice(0, 5).map((t) => (
                                <TransactionCard key={t.id} transaction={t} showNote={false} />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        );
    };

    // Products Tab Content
    const renderProductsContent = () => {
        const hasShops = shops.length > 0;

        if (!hasShops) {
            return (
                <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
                    <EmptyStateCard />
                </ScrollView>
            );
        }

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPadding}>
                {/* Products Parent Card */}
                <View style={styles.productsCard}>
                    {/* Header Row */}
                    <View style={styles.productsCardHeader}>
                        <View style={styles.tabHeaderLeft}>
                            <Text style={styles.tabHeaderTitle}>Products</Text>
                            <Text style={styles.tabHeaderSubtitle}>Manage your shop's products and pricing</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButtonBlue}
                            onPress={openAddProductModal}
                        >
                            <Text style={styles.addButtonText}>+ Add Product</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Products List or Empty State */}
                    {products.length === 0 ? (
                        <View style={styles.productsEmptyState}>
                            <Text style={styles.tabEmptyText}>No products added yet.</Text>
                            <Text style={styles.tabEmptySubtext}>Add your first product to get started!</Text>
                        </View>
                    ) : (
                        <View style={styles.productsList}>
                            {products.map((product) => (
                                <View key={product.id} style={styles.productItem}>
                                    <View style={styles.productInfoRow}>
                                        <Text style={styles.productName}>{product.name}</Text>
                                        <View style={styles.priceBadge}>
                                            <Text style={styles.priceText}>₹{parseFloat(product.price).toFixed(2)}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.productActionsRow}>
                                        <TouchableOpacity
                                            style={styles.actionButtonOutline}
                                            onPress={() => openEditProductModal(product)}
                                        >
                                            <Text style={styles.actionButtonTextOutline}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionButtonRed}
                                            onPress={() => handleDeleteProduct(product)}
                                        >
                                            <Text style={styles.actionButtonTextRed}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Spacer for bottom nav */}
                <View style={{ height: 60 }} />
            </ScrollView>
        );
    };

    // Customers Tab Content
    const renderCustomersContent = () => {
        const hasShops = shops.length > 0;

        // Filter customers based on search query
        const filteredCustomers = customers.filter(customer =>
            customer && (
                customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.phone?.includes(searchQuery)
            )
        );

        if (!hasShops) {
            return (
                <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
                    <EmptyStateCard />
                </ScrollView>
            );
        }

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPadding}>
                {/* Customers Header */}
                <View style={styles.customersHeader}>
                    <Text style={styles.customersTitle}>Customers</Text>
                    <View style={styles.customersHeaderRight}>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{filteredCustomers.length}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButtonBlue}
                            onPress={() => setShowAddCustomerModal(true)}
                        >
                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                            <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or phone number..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Empty State or List */}
                {filteredCustomers.length === 0 && searchQuery ? (
                    <View style={styles.customersEmptyState}>
                        <Text style={styles.tabEmptyText}>No matching customers found</Text>
                    </View>
                ) : filteredCustomers.length === 0 ? (
                    <View style={styles.customersEmptyState}>
                        <Ionicons name="people" size={48} color="#6366F1" />
                        <Text style={styles.tabEmptyText}>No customers yet</Text>
                        <Text style={styles.tabEmptySubtext}>Add your first customer to get started</Text>
                    </View>
                ) : (
                    <View style={styles.customersList}>
                        {filteredCustomers.map((customer) => (
                            <View key={customer.id} style={styles.customerItem}>
                                <View style={styles.customerAvatar}>
                                    <Text style={styles.customerAvatarText}>
                                        {customer.name?.charAt(0)?.toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.customerInfo}>
                                    <Text style={styles.customerName}>{customer.name}</Text>
                                    <Text style={styles.customerPhone}>+91 {customer.phone}</Text>
                                </View>
                                <View style={styles.customerRightSide}>
                                    <View style={styles.customerBalance}>
                                        <View style={[
                                            styles.statusBadge,
                                            (customer.balance || 0) == 0 ? styles.statusBadgeClear :
                                                (customer.balance || 0) < 0 ? styles.statusBadgeDue : styles.statusBadgeAdvance
                                        ]}>
                                            <Text style={[
                                                styles.statusBadgeText,
                                                (customer.balance || 0) == 0 ? styles.statusBadgeTextClear :
                                                    (customer.balance || 0) < 0 ? styles.statusBadgeTextDue : styles.statusBadgeTextAdvance
                                            ]}>
                                                {(customer.balance || 0) == 0 ? 'Clear' : (customer.balance || 0) < 0 ? 'Owes' : 'Credit'}
                                            </Text>
                                        </View>
                                        <Text style={[
                                            styles.balanceAmount,
                                            (customer.balance || 0) == 0 ? { color: '#6B7280' } :
                                                (customer.balance || 0) < 0 ? { color: '#EF4444' } : { color: '#10B981' }
                                        ]}>
                                            {(customer.balance || 0) == 0 ? '' : (customer.balance || 0) > 0 ? '+' : '-'}₹{Math.abs(customer.balance || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.arrowButton}
                                        onPress={() => handleCustomerSelect(customer)}
                                    >
                                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    };

    // Transactions Tab Content
    const renderTransactionsContent = () => {
        const hasShops = shops.length > 0;

        if (!hasShops) {
            return (
                <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
                    <EmptyStateCard />
                </ScrollView>
            );
        }

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.dashboardContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Transactions Header */}
                <View style={styles.transactionsHeader}>
                    <Text style={styles.transactionsTitle}>All Transactions</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{transactions.length}</Text>
                    </View>
                </View>

                {/* Transactions List */}
                {transactions.length === 0 ? (
                    <View style={styles.transactionsEmptyState}>
                        <Text style={styles.moneyBagEmoji}>💰</Text>
                        <Text style={styles.tabEmptyText}>No transactions yet</Text>
                        <Text style={styles.tabEmptySubtext}>Record your first transaction!</Text>
                    </View>
                ) : (
                    <View style={styles.transactionsList}>
                        {transactions.map((t) => (
                            <TransactionCard key={t.id} transaction={t} />
                        ))}
                    </View>
                )}

                {/* Spacer */}
                <View style={{ height: 60 }} />
            </ScrollView>
        );
    };



    // Account Tab Content - Matching reference exactly
    const renderAccountContent = () => {
        const currentShop = shops.find(s => s.id === user?.shop_id) || shops[0];

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.accountScrollContent}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={40} color="#8B5CF6" />
                    </View>
                    <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                    <Text style={styles.profilePhone}>+91 {user?.phone || '1234567890'}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Shop Owner</Text>
                    </View>
                </View>



                {/* Share Your Shop Card */}
                <View style={styles.shareCard}>
                    <View style={styles.shareHeader}>
                        <View style={styles.shareIconContainer}>
                            <Ionicons name="storefront" size={24} color="#8B5CF6" />
                        </View>
                        <View style={styles.shareTitleContainer}>
                            <Text style={styles.shareTitle}>Share Your Shop</Text>
                            {!isShareExpanded && (
                                <Text style={styles.shareSubtitle}>
                                    Generate QR code and shareable link for customers to connect
                                </Text>
                            )}
                        </View>
                    </View>

                    {isShareExpanded ? (
                        <View style={styles.shareExpandedContent}>
                            <View style={styles.shareBlueHeader}>
                                <TouchableOpacity
                                    style={styles.collapseButton}
                                    onPress={() => setIsShareExpanded(false)}
                                >
                                    <Ionicons name="chevron-up" size={20} color="#fff" />
                                    <Text style={styles.collapseButtonText}>Hide QR Code & Share Options</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Card 1: Shop Info Card */}
                            <View style={styles.shopInfoCard}>
                                <View style={styles.cardHeaderRow}>
                                    <Ionicons name="qr-code-outline" size={20} color="#000" />
                                    <Text style={styles.cardTitle}>Shop QR Code & Share Link</Text>
                                </View>

                                <View style={styles.shopDetailsContent}>
                                    <Text style={styles.shopNameLarge}>{currentShop?.name || 'Shop Name'}</Text>

                                    <View style={styles.locationCodeRow}>
                                        <Text style={styles.shopLocationText}>{currentShop?.location || 'Location'}</Text>
                                        <View style={styles.shopCodeBadge}>
                                            <Text style={styles.shopCodeText}>Code: {currentShop?.shop_code || '...'}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.categoryBadgeSmall}>
                                        <Text style={styles.categoryBadgeTextSmall}>{currentShop?.category || 'Category'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Card 2: QR Code Card */}
                            <View style={styles.qrCodeCard}>
                                <Text style={styles.qrCardTitle}>QR Code</Text>
                                <Text style={styles.qrCardSubtitle}>Customers can scan this code to connect to your shop instantly</Text>

                                <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
                                    <View style={styles.qrContainer}>
                                        <QRCode
                                            value={`https://shopmunim.com/shop/${user?.shop_id || 'demo'}`}
                                            size={200}
                                            backgroundColor="white"
                                            color="black"
                                        />
                                    </View>
                                </ViewShot>

                                <View style={styles.qrActionsRow}>
                                    <TouchableOpacity style={styles.qrActionButton} onPress={handleDownloadQr}>
                                        <Ionicons name="download-outline" size={18} color="#374151" />
                                        <Text style={styles.qrActionText}>Download</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.qrActionButton} onPress={handleShareQr}>
                                        <Ionicons name="print-outline" size={18} color="#374151" />
                                        <Text style={styles.qrActionText}>Print</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.qrFooter}>
                                    <Text style={styles.qrFooterEmoji}>📱</Text>
                                    <Text style={styles.qrFooterText}>Customers scan this with any QR scanner or camera app</Text>
                                </View>
                            </View>

                            {/* Share Link Section */}
                            <View style={styles.linkSection}>
                                <Text style={styles.sectionHeader}>Shareable Link</Text>
                                <Text style={styles.sectionSubHeader}>Share this link via WhatsApp, SMS, or social media</Text>

                                <View style={styles.linkBox}>
                                    <Ionicons name="link-outline" size={20} color="#6B7280" />
                                    <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="tail">
                                        https://shopmunim.com/shop/{user?.shop_id || 'demo'}
                                    </Text>
                                </View>

                                <TouchableOpacity style={styles.copyLinkButton} onPress={copyToClipboard}>
                                    <Ionicons name="copy-outline" size={18} color="#374151" />
                                    <Text style={styles.copyLinkText}>Copy Link</Text>
                                </TouchableOpacity>

                                <View style={styles.shareButtonsRow}>
                                    <TouchableOpacity style={styles.whatsappButton} onPress={() => handleShareLink('whatsapp')}>
                                        <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                                        <Text style={styles.whatsappButtonText}>WhatsApp</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.nativeShareButton} onPress={() => handleShareLink('native')}>
                                        <Ionicons name="share-outline" size={18} color="#374151" />
                                        <Text style={styles.nativeShareText}>Share</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Blue Info Box */}
                                <View style={styles.infoBoxBlue}>
                                    <Text style={styles.infoBoxTitle}>✨ Benefits</Text>
                                    <Text style={styles.infoBoxItem}>• Customers can see your shop & items</Text>
                                    <Text style={styles.infoBoxItem}>• They join your list automatically</Text>
                                    <Text style={styles.infoBoxItem}>• Chat and request items/payments</Text>
                                    <Text style={styles.infoBoxItem}>• No manual customer add required!</Text>
                                </View>
                            </View>

                            {/* Marketing Tips */}
                            <View style={styles.marketingSection}>
                                <Text style={styles.marketingTitle}>Marketing Tips</Text>

                                <View style={[styles.marketingCard, { backgroundColor: '#FFFBEB' }]}>
                                    <Text style={[styles.marketingCardTitle, { color: '#B45309' }]}>🏠 In Your Shop</Text>
                                    <Text style={styles.marketingCardText}>Print the QR code and display it at your counter or entrance for easy customer registration.</Text>
                                </View>

                                <View style={[styles.marketingCard, { backgroundColor: '#ECFDF5' }]}>
                                    <Text style={[styles.marketingCardTitle, { color: '#047857' }]}>📱 Social Media</Text>
                                    <Text style={styles.marketingCardText}>Share the link on WhatsApp status, Facebook, or Instagram to reach more customers.</Text>
                                </View>

                                <View style={[styles.marketingCard, { backgroundColor: '#EFF6FF' }]}>
                                    <Text style={[styles.marketingCardTitle, { color: '#1D4ED8' }]}>💳 Digital Payments</Text>
                                    <Text style={styles.marketingCardText}>Include the link in your UPI payment confirmation SMS to connect customers.</Text>
                                </View>
                            </View>

                        </View>
                    ) : (
                        currentShop ? (
                            <TouchableOpacity
                                style={styles.showQrButton}
                                onPress={() => setIsShareExpanded(true)}
                            >
                                <Ionicons name="qr-code-outline" size={20} color="#fff" />
                                <Text style={styles.showQrButtonText}>Show QR Code & Share Options</Text>
                            </TouchableOpacity>
                        ) : (
                            // No Shop Found - Render text directly inside this card since header is already above
                            <View style={styles.noShopMessageContainer}>
                                <Text style={styles.noShopMessageText}>No shops found. Create a shop first to generate QR code.</Text>
                            </View>
                        )
                    )}
                </View>
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

                    <TouchableOpacity style={styles.settingItem}>
                        <Text style={styles.settingIcon}>🌐</Text>
                        <Text style={styles.settingText}>Language</Text>
                    </TouchableOpacity>

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
                        <Text style={[styles.settingText, styles.logoutTextRed]}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerBrand}>ShopMunim</Text>
                    <Text style={styles.footerVersion}>Version 1.0.0</Text>
                    <Text style={styles.footerTagline}>Digital Credit & Payment Ledger</Text>
                </View>
            </ScrollView >
        );
    };

    // Handle customer selection for detail view
    const handleCustomerSelect = async (customer) => {
        setSelectedCustomer(customer);
        setLoadingCustomerData(true);
        try {
            const shopId = user?.shop_id || (shops.length > 0 ? shops[0].id : null);
            const response = await transactionAPI.getAll(shopId);
            const customerTxns = (response.data || []).filter(t => t.customer_id === customer.id);
            setCustomerTransactions(customerTxns.sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (error) {
            console.error('Error loading customer transactions:', error);
        } finally {
            setLoadingCustomerData(false);
        }
    };

    // Render Customer Detail Content (inline within dashboard)
    const renderCustomerDetailContent = () => {
        const customer = selectedCustomer;
        const shopId = user?.shop_id || (shops.length > 0 ? shops[0].id : null);



        const getBalanceColor = () => customer.balance < 0 ? '#EF4444' : customer.balance > 0 ? '#10B981' : '#10B981';
        const getBalanceLabel = () => customer.balance < 0 ? 'Owes' : customer.balance > 0 ? 'Credit' : 'Clear';
        const getBalanceBgColor = () => customer.balance < 0 ? '#FEE2E2' : '#D1FAE5';

        const credits = customerTransactions.filter(t => t.type === 'credit');
        const payments = customerTransactions.filter(t => t.type === 'debit' || t.type === 'payment');
        const stats = {
            totalTransactions: customerTransactions.length,
            totalCredits: credits.length,
            totalPayments: payments.length,
            totalCreditsAmount: credits.reduce((sum, t) => sum + (t.amount || 0), 0),
            totalPaymentsAmount: payments.reduce((sum, t) => sum + (t.amount || 0), 0),
            totalItems: customerTransactions.reduce((sum, t) => sum + ((t.products || t.items || []).reduce((s, p) => s + (p.quantity || 0), 0)), 0)
        };

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabPadding}>
                {/* Back Button + Title Row */}
                <View style={styles.customerDetailBackRow}>
                    <TouchableOpacity onPress={() => setSelectedCustomer(null)} style={styles.customerDetailBackBtn}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.customerDetailTitle}>Customer Details</Text>
                        <Text style={styles.customerDetailSubtitle}>Transaction history and management</Text>
                    </View>
                </View>

                {/* Main Customer Action Card Container */}
                <View style={styles.customerDetailMainCard}>
                    {/* Customer Info Row */}
                    <View style={styles.customerDetailInfoRow}>
                        <View>
                            <Text style={styles.customerDetailName}>{customer.name}</Text>
                            <Text style={styles.customerDetailPhone}>+91 {customer.phone}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.customerDetailBalance, { color: getBalanceColor() }]}>
                                {(customer.balance || 0) < 0 ? '-' : (customer.balance || 0) > 0 ? '+' : ''}₹{Math.abs(customer.balance || 0).toFixed(2)}
                            </Text>
                            <Text style={[styles.customerDetailBadgeText, { color: getBalanceColor() }]}>
                                {getBalanceLabel()}
                            </Text>
                        </View>
                    </View>

                    {/* Add Transaction Button */}
                    <TouchableOpacity style={styles.customerDetailAddBtn} onPress={() => setShowAddTransactionModal(true)}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.customerDetailAddBtnText}>Add Transaction</Text>
                    </TouchableOpacity>

                    {/* Send UPI Link Button */}
                    <TouchableOpacity style={styles.customerDetailUpiBtn} onPress={() => Alert.alert('Info', 'UPI link feature')}>
                        <Ionicons name="phone-portrait-outline" size={18} color="#374151" />
                        <Text style={styles.customerDetailUpiBtnText}>Send UPI Link</Text>
                    </TouchableOpacity>

                    {/* Payment Request Button */}
                    <TouchableOpacity style={styles.customerDetailPaymentBtn} onPress={() => setShowPaymentRequestModal(true)}>
                        <Ionicons name="alarm-outline" size={18} color="#fff" />
                        <Text style={styles.customerDetailPaymentBtnText}>Payment Request</Text>
                    </TouchableOpacity>
                </View>

                {loadingCustomerData ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading transactions...</Text>
                    </View>
                ) : (
                    <>
                        {/* Purchase Analytics */}
                        <View style={styles.customerDetailSection}>
                            <View style={styles.customerDetailSectionHeader}>
                                <Ionicons name="bar-chart-outline" size={18} color="#374151" />
                                <Text style={styles.customerDetailSectionTitle}>Purchase Analytics</Text>
                            </View>
                            <View style={styles.customerDetailStatsGrid}>
                                <View style={[styles.customerDetailStatBox, { backgroundColor: '#EFF6FF' }]}>
                                    <Text style={[styles.customerDetailStatValue, { color: '#2563EB' }]}>{stats.totalTransactions}</Text>
                                    <Text style={styles.customerDetailStatLabel}>Total Transactions</Text>
                                </View>
                                <View style={[styles.customerDetailStatBox, { backgroundColor: '#FEE2E2' }]}>
                                    <Text style={[styles.customerDetailStatValue, { color: '#EF4444' }]}>{stats.totalCredits}</Text>
                                    <Text style={styles.customerDetailStatLabel}>Credits Given</Text>
                                    <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>{formatCurrency(stats.totalCreditsAmount)}</Text>
                                </View>
                                <View style={[styles.customerDetailStatBox, { backgroundColor: '#D1FAE5' }]}>
                                    <Text style={[styles.customerDetailStatValue, { color: '#10B981' }]}>{stats.totalPayments}</Text>
                                    <Text style={styles.customerDetailStatLabel}>Payments Received</Text>
                                    <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>{formatCurrency(stats.totalPaymentsAmount)}</Text>
                                </View>
                                <View style={[styles.customerDetailStatBox, { backgroundColor: '#F3E8FF' }]}>
                                    <Text style={[styles.customerDetailStatValue, { color: '#7C3AED' }]}>{stats.totalItems}</Text>
                                    <Text style={styles.customerDetailStatLabel}>Items Purchased</Text>
                                </View>
                            </View>

                            {/* Net Transaction Balance Row */}
                            <View style={styles.customerDetailNetRow}>
                                <Text style={styles.customerDetailNetLabel}>Net Transaction Balance:</Text>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.customerDetailNetValue, { color: stats.totalPaymentsAmount >= stats.totalCreditsAmount ? '#10B981' : '#EF4444' }]}>
                                        {formatCurrency(Math.abs(stats.totalPaymentsAmount - stats.totalCreditsAmount))}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: stats.totalPaymentsAmount >= stats.totalCreditsAmount ? '#10B981' : '#EF4444', fontWeight: '500' }}>
                                        {stats.totalPaymentsAmount >= stats.totalCreditsAmount ? 'Received' : 'Given'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Filters & Export Section */}
                        <View style={styles.customerDetailSection}>
                            <View style={styles.customerDetailFilterHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="filter-outline" size={18} color="#374151" />
                                    <Text style={styles.customerDetailSectionTitle}>Filters & Export</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity style={styles.customerDetailPdfBtn}>
                                        <Ionicons name="document-text-outline" size={14} color="#EF4444" />
                                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#EF4444', marginLeft: 4 }}>PDF</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.customerDetailExcelBtn}>
                                        <Ionicons name="grid-outline" size={14} color="#10B981" />
                                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#10B981', marginLeft: 4 }}>Excel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.customerDetailFilterLabel}>From Date</Text>
                                    <TouchableOpacity
                                        style={styles.customerDetailDateInput}
                                        onPress={() => setShowFromDatePicker(true)}
                                    >
                                        <Text style={{ fontSize: 13, color: fromDate ? '#111827' : '#9CA3AF' }}>
                                            {fromDate ? `${fromDate.getDate().toString().padStart(2, '0')}-${(fromDate.getMonth() + 1).toString().padStart(2, '0')}-${fromDate.getFullYear()}` : 'dd-mm-yyyy'}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {fromDate && (
                                                <TouchableOpacity onPress={() => setFromDate(null)} style={{ marginRight: 8 }}>
                                                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                                                </TouchableOpacity>
                                            )}
                                            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.customerDetailFilterLabel}>To Date</Text>
                                    <TouchableOpacity
                                        style={styles.customerDetailDateInput}
                                        onPress={() => setShowToDatePicker(true)}
                                    >
                                        <Text style={{ fontSize: 13, color: toDate ? '#111827' : '#9CA3AF' }}>
                                            {toDate ? `${toDate.getDate().toString().padStart(2, '0')}-${(toDate.getMonth() + 1).toString().padStart(2, '0')}-${toDate.getFullYear()}` : 'dd-mm-yyyy'}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {toDate && (
                                                <TouchableOpacity onPress={() => setToDate(null)} style={{ marginRight: 8 }}>
                                                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                                                </TouchableOpacity>
                                            )}
                                            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Date Pickers */}
                            {showFromDatePicker && (
                                <DateTimePicker
                                    value={fromDate || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                        setShowFromDatePicker(Platform.OS === 'ios');
                                        if (selectedDate) setFromDate(selectedDate);
                                    }}
                                />
                            )}
                            {showToDatePicker && (
                                <DateTimePicker
                                    value={toDate || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                        setShowToDatePicker(Platform.OS === 'ios');
                                        if (selectedDate) setToDate(selectedDate);
                                    }}
                                />
                            )}

                            <View style={{ position: 'relative', zIndex: 10 }}>
                                <Text style={styles.customerDetailFilterLabel}>Transaction Type</Text>
                                <TouchableOpacity
                                    style={styles.customerDetailTypeDropdown}
                                    onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                                >
                                    <Text style={{ fontSize: 13, color: '#111827' }}>
                                        {transactionTypeFilter === 'all' ? 'All Transactions' :
                                            transactionTypeFilter === 'credit' ? 'Credit Only' : 'Payment Only'}
                                    </Text>
                                    <Ionicons name={showTypeDropdown ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
                                </TouchableOpacity>

                                {showTypeDropdown && (
                                    <View style={styles.customerDetailDropdownOptions}>
                                        <TouchableOpacity
                                            style={[styles.customerDetailDropdownOption, transactionTypeFilter === 'all' && styles.customerDetailDropdownOptionActive]}
                                            onPress={() => { setTransactionTypeFilter('all'); setShowTypeDropdown(false); }}
                                        >
                                            <Text style={{ fontSize: 13, color: transactionTypeFilter === 'all' ? '#2563EB' : '#374151' }}>All Transactions</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.customerDetailDropdownOption, transactionTypeFilter === 'credit' && styles.customerDetailDropdownOptionActive]}
                                            onPress={() => { setTransactionTypeFilter('credit'); setShowTypeDropdown(false); }}
                                        >
                                            <Text style={{ fontSize: 13, color: transactionTypeFilter === 'credit' ? '#2563EB' : '#374151' }}>Credit Only</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.customerDetailDropdownOption, transactionTypeFilter === 'payment' && styles.customerDetailDropdownOptionActive]}
                                            onPress={() => { setTransactionTypeFilter('payment'); setShowTypeDropdown(false); }}
                                        >
                                            <Text style={{ fontSize: 13, color: transactionTypeFilter === 'payment' ? '#2563EB' : '#374151' }}>Payment Only</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Transaction History Wrapper Card */}
                        <View style={styles.customerDetailTxHistoryCard}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Detailed Transaction History</Text>
                            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                                Showing {customerTransactions.filter(t => {
                                    // Type filter
                                    if (transactionTypeFilter === 'credit' && t.type !== 'credit') return false;
                                    if (transactionTypeFilter === 'payment' && t.type !== 'debit' && t.type !== 'payment') return false;
                                    // Date filter
                                    const txDate = new Date(t.date);
                                    if (fromDate && txDate < new Date(fromDate.setHours(0, 0, 0, 0))) return false;
                                    if (toDate && txDate > new Date(toDate.setHours(23, 59, 59, 999))) return false;
                                    return true;
                                }).length} transactions{(transactionTypeFilter !== 'all' || fromDate || toDate) ? ' (filtered)' : ''}
                            </Text>

                            {customerTransactions.filter(t => {
                                // Type filter
                                if (transactionTypeFilter === 'credit' && t.type !== 'credit') return false;
                                if (transactionTypeFilter === 'payment' && t.type !== 'debit' && t.type !== 'payment') return false;
                                // Date filter
                                const txDate = new Date(t.date);
                                if (fromDate) {
                                    const fromStart = new Date(fromDate);
                                    fromStart.setHours(0, 0, 0, 0);
                                    if (txDate < fromStart) return false;
                                }
                                if (toDate) {
                                    const toEnd = new Date(toDate);
                                    toEnd.setHours(23, 59, 59, 999);
                                    if (txDate > toEnd) return false;
                                }
                                return true;
                            }).length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                                    <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                                    <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 12 }}>No transactions found</Text>
                                </View>
                            ) : (
                                customerTransactions.filter(t => {
                                    // Type filter
                                    if (transactionTypeFilter === 'credit' && t.type !== 'credit') return false;
                                    if (transactionTypeFilter === 'payment' && t.type !== 'debit' && t.type !== 'payment') return false;
                                    // Date filter
                                    const txDate = new Date(t.date);
                                    if (fromDate) {
                                        const fromStart = new Date(fromDate);
                                        fromStart.setHours(0, 0, 0, 0);
                                        if (txDate < fromStart) return false;
                                    }
                                    if (toDate) {
                                        const toEnd = new Date(toDate);
                                        toEnd.setHours(23, 59, 59, 999);
                                        if (txDate > toEnd) return false;
                                    }
                                    return true;
                                }).map((transaction) => {
                                    const isPayment = transaction.type === 'debit' || transaction.type === 'payment';
                                    const items = transaction.products || transaction.items || [];
                                    return (
                                        <View key={transaction.id} style={styles.customerDetailTxCard}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={[styles.customerDetailTxBadge, { backgroundColor: isPayment ? '#000' : '#EF4444' }]}>
                                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{isPayment ? 'Payment' : 'Purchase'}</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ fontSize: 20, fontWeight: '700', color: isPayment ? '#10B981' : '#EF4444' }}>
                                                        {`${isPayment ? '+' : '-'}₹${parseFloat(transaction.amount || 0).toFixed(2)}`}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: '#6B7280' }}>Amount {isPayment ? 'paid' : 'owed'}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.customerDetailDateRow}>
                                                <Ionicons name="calendar-outline" size={14} color="#374151" />
                                                <Text style={{ fontSize: 12, color: '#000000', marginLeft: 6 }}>{formatShortDate(transaction.date)}</Text>
                                            </View>
                                            {isPayment && (
                                                <View style={styles.customerDetailPaymentNote}>
                                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                                    <Text style={{ fontSize: 12, color: '#047857', marginLeft: 4 }}>Payment received - Balance updated</Text>
                                                </View>
                                            )}
                                            {items.length > 0 && (
                                                <View style={styles.customerDetailItemsBox}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                                        <Ionicons name="cart-outline" size={16} color="#374151" />
                                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginLeft: 6 }}>Items Purchased:</Text>
                                                    </View>
                                                    {items.map((item, idx) => (
                                                        <View key={idx} style={styles.customerDetailItemRow}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.name || 'Item'}</Text>
                                                                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>@ {formatCurrency(item.price || 0)} each</Text>
                                                            </View>
                                                            <View style={{ alignItems: 'flex-end' }}>
                                                                <View style={styles.customerDetailQtyBadge}>
                                                                    <Text style={{ fontSize: 12, color: '#374151' }}>Qty: {item.quantity || 1}</Text>
                                                                </View>
                                                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#2563EB', marginTop: 4 }}>{formatCurrency(item.subtotal || (item.price || 0) * (item.quantity || 1))}</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                    <View style={styles.customerDetailItemsTotalRow}>
                                                        <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>Total Items: {items.reduce((sum, i) => sum + (i.quantity || 1), 0)}</Text>
                                                        <Text style={{ fontSize: 14, color: '#111827', fontWeight: '700' }}>Subtotal: {formatCurrency(items.reduce((sum, i) => sum + (i.subtotal || (i.price || 0) * (i.quantity || 1)), 0))}</Text>
                                                    </View>
                                                </View>
                                            )}
                                            {/* Note Section with Amber Left Border */}
                                            {(transaction.note || transaction.notes || transaction.description) && (
                                                <View style={styles.customerDetailNoteBox}>
                                                    <Text style={styles.customerDetailNoteLabel}>Note: </Text>
                                                    <Text style={styles.customerDetailNoteText}>{transaction.note || transaction.notes || transaction.description}</Text>
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
        );
    };

    // Render active tab content
    const renderContent = () => {
        // If a customer is selected, show their detail view
        if (selectedCustomer) {
            return renderCustomerDetailContent();
        }

        switch (activeTab) {
            case 'home': return renderHomeContent();
            case 'products': return renderProductsContent();
            case 'customers': return renderCustomersContent();
            case 'transactions': return renderTransactionsContent();
            case 'account': return renderAccountContent();
            default: return renderHomeContent();
        }
    };

    // Bottom Navigation Tab - Matching reference exactly
    const TabButton = ({ name, icon, label }) => {
        const isActive = activeTab === name && !selectedCustomer;
        return (
            <TouchableOpacity
                style={styles.tabButton}
                onPress={() => { setSelectedCustomer(null); setActiveTab(name); }}
            >
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
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header />
            <View style={styles.content}>{renderContent()}</View>
            {!isKeyboardVisible && (
                <View style={styles.bottomNav}>
                    <TabButton name="home" icon="home-outline" label="Home" />
                    <TabButton name="products" icon="cube-outline" label="Products" />
                    <TabButton name="customers" icon="people-outline" label="Customers" />
                    <TabButton name="transactions" icon="receipt-outline" label="Transactions" />

                    <TabButton name="account" icon="person-outline" label="Account" />
                </View>
            )}

            {/* Create Shop Modal */}
            <Modal
                visible={showCreateModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create New Shop</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.modalClose}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {/* Shop Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Shop Name <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter shop name"
                                    placeholderTextColor="#9CA3AF"
                                    value={shopName}
                                    onChangeText={setShopName}
                                    autoCapitalize="words"
                                />
                            </View>

                            {/* Category */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Category <Text style={styles.required}>*</Text></Text>
                                <TouchableOpacity
                                    style={styles.dropdown}
                                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                >
                                    <Text style={shopCategory ? styles.dropdownText : styles.placeholder}>
                                        {shopCategory || 'Select category'}
                                    </Text>
                                    <Ionicons
                                        name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color="#9CA3AF"
                                    />
                                </TouchableOpacity>
                            </View>

                            {showCategoryDropdown && (
                                <View style={styles.categoryList}>
                                    {SHOP_CATEGORIES.map((cat, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.categoryItem}
                                            onPress={() => {
                                                setShopCategory(cat);
                                                setShowCategoryDropdown(false);
                                            }}
                                        >
                                            <Text style={styles.categoryItemText}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Location */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Location <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter shop location"
                                    placeholderTextColor="#9CA3AF"
                                    value={shopLocation}
                                    onChangeText={setShopLocation}
                                    autoCapitalize="words"
                                />
                            </View>

                            {/* Create Button */}
                            <TouchableOpacity
                                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                                onPress={handleCreateShop}
                                disabled={creating}
                            >
                                {creating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Create Shop</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Add Customer Modal */}
            <Modal
                visible={showAddCustomerModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAddCustomerModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Customer</Text>
                            <TouchableOpacity onPress={() => setShowAddCustomerModal(false)} style={styles.modalClose}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled">
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Customer Name <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter customer name"
                                    placeholderTextColor="#9CA3AF"
                                    value={newCustomerName}
                                    onChangeText={setNewCustomerName}
                                    autoCapitalize="words"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter 10-digit phone number"
                                    placeholderTextColor="#9CA3AF"
                                    value={newCustomerPhone}
                                    onChangeText={(text) => setNewCustomerPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, addingCustomer && styles.submitButtonDisabled]}
                                onPress={handleAddCustomer}
                                disabled={addingCustomer}
                            >
                                {addingCustomer ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Add Customer</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Add Product Modal */}
            <Modal
                visible={showAddProductModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAddProductModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
                                <Text style={styles.modalSubtitle}>{editingProduct ? 'Update product details' : 'Add a new product to your shop inventory'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowAddProductModal(false)} style={styles.modalClose}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled">
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Product Name <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g., Tea, Cigarette, Wafers"
                                    placeholderTextColor="#9CA3AF"
                                    value={newProductName}
                                    onChangeText={setNewProductName}
                                    autoCapitalize="words"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Price (₹) <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter price"
                                    placeholderTextColor="#9CA3AF"
                                    value={newProductPrice}
                                    onChangeText={setNewProductPrice}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, addingProduct && styles.submitButtonDisabled]}
                                onPress={handleAddProduct}
                                disabled={addingProduct}
                            >
                                {addingProduct ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>{editingProduct ? 'Update Product' : 'Add Product'}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Payment Request Modal */}
            <Modal
                visible={showPaymentRequestModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPaymentRequestModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.paymentModalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.paymentModalContent}>
                        {/* Header */}
                        <View style={styles.paymentModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="time-outline" size={22} color="#EA580C" />
                                <Text style={styles.paymentModalTitle}>Payment Request & Reminders</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowPaymentRequestModal(false)}>
                                <Ionicons name="close-circle-outline" size={26} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Customer Details Card */}
                            {selectedCustomer && (
                                <View style={styles.paymentCustomerCard}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Customer Details</Text>
                                        <View style={{ backgroundColor: '#111827', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                                                {selectedCustomer.balance === 0 ? 'No Dues' : selectedCustomer.balance < 0 ? 'Dues Pending' : 'Credit Available'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={{ fontSize: 13, color: '#6B7280' }}>Customer Name</Text>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 2 }}>{selectedCustomer.name}</Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <Text style={{ fontSize: 13, color: '#6B7280' }}>Phone Number</Text>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 2 }}>{selectedCustomer.phone}</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <View style={{ flex: 1, marginRight: 20 }}>
                                            <Text style={{ fontSize: 13, color: '#6B7280' }}>Outstanding Amount</Text>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#EF4444', marginTop: 2 }}>
                                                {(selectedCustomer.balance || 0) < 0 ? '-' : ''}₹{Math.abs(selectedCustomer.balance || 0).toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 20 }}>
                                            <Text style={{ fontSize: 13, color: '#6B7280' }}>Last Transaction</Text>
                                            <Text style={{ fontSize: 14, color: '#4B5563', marginTop: 2 }}>
                                                {customerTransactions.length > 0 ? formatShortDate(customerTransactions[0].date) : 'No transactions'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Tabs */}
                            <View style={styles.paymentModalTabs}>
                                <TouchableOpacity
                                    style={[styles.paymentModalTab, paymentRequestTab === 'sendNow' && styles.paymentModalTabActive]}
                                    onPress={() => setPaymentRequestTab('sendNow')}
                                >
                                    <Ionicons name="send-outline" size={16} color={paymentRequestTab === 'sendNow' ? '#111827' : '#6B7280'} />
                                    <Text style={[styles.paymentModalTabText, paymentRequestTab === 'sendNow' && styles.paymentModalTabTextActive]}>Send Now</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.paymentModalTab, paymentRequestTab === 'autoSetup' && styles.paymentModalTabActive]}
                                    onPress={() => setPaymentRequestTab('autoSetup')}
                                >
                                    <Ionicons name="settings-outline" size={16} color={paymentRequestTab === 'autoSetup' ? '#111827' : '#6B7280'} />
                                    <Text style={[styles.paymentModalTabText, paymentRequestTab === 'autoSetup' && styles.paymentModalTabTextActive]}>Auto Setup</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Content based on Tab */}
                            {paymentRequestTab === 'sendNow' ? (
                                <>
                                    {/* Send Reminder Section */}
                                    <View style={styles.paymentModalSection}>
                                        <Text style={styles.paymentModalSectionTitle}>Send Reminder</Text>

                                        {/* Request Type */}
                                        <View style={{ marginBottom: 16, zIndex: 20 }}>
                                            <Text style={styles.paymentModalLabel}>Request Type</Text>
                                            <TouchableOpacity
                                                style={styles.paymentModalDropdown}
                                                onPress={() => setShowRequestTypeDropdown(!showRequestTypeDropdown)}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        {/* <Ionicons name="cash-outline" size={16} color="#374151" /> */}
                                                        <Text style={{ marginLeft: 0, color: '#111827' }}>{requestType}</Text>
                                                    </View>

                                                    {requestType === 'Payment Due Reminder' && (selectedCustomer?.balance || 0) < 0 && (
                                                        <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                                                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                                                                {formatCurrency(Math.abs(selectedCustomer?.balance || 0))} Due
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                                            </TouchableOpacity>


                                            {showRequestTypeDropdown && (
                                                <View style={styles.paymentModalDropdownOptions}>
                                                    {/* Option 1: Payment Due Reminder */}
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.paymentModalDropdownOption,
                                                            requestType === 'Payment Due Reminder' && { backgroundColor: '#F3F4F6' }
                                                        ]}
                                                        onPress={() => { setRequestType('Payment Due Reminder'); setShowRequestTypeDropdown(false); }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <Ionicons name="cash-outline" size={16} color="#374151" />
                                                                <Text style={{ marginLeft: 8, color: '#374151', fontSize: 14 }}>Payment Due Reminder</Text>
                                                            </View>
                                                            {requestType === 'Payment Due Reminder' && (
                                                                <Ionicons name="checkmark-sharp" size={16} color="#374151" />
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>

                                                    {/* Option 2: Advance Payment Request */}
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.paymentModalDropdownOption,
                                                            requestType === 'Advance Payment Request' && { backgroundColor: '#F3F4F6' }
                                                        ]}
                                                        onPress={() => { setRequestType('Advance Payment Request'); setShowRequestTypeDropdown(false); }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <Ionicons name="trending-up-outline" size={16} color="#374151" />
                                                                <Text style={{ marginLeft: 8, color: '#374151', fontSize: 14 }}>Advance Payment Request</Text>
                                                            </View>
                                                            <View style={{ backgroundColor: '#111827', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>New Order</Text>
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>

                                        {/* Status Box */}
                                        {selectedCustomer?.balance < 0 ? (
                                            <View style={[styles.paymentStatusBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                                <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                                                <Text style={[styles.paymentStatusText, { color: '#DC2626' }]}>
                                                    Payment Pending of {formatCurrency(Math.abs(selectedCustomer?.balance || 0))}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.paymentStatusBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                                                <Ionicons name="checkmark-circle-outline" size={20} color="#059669" />
                                                <Text style={[styles.paymentStatusText, { color: '#059669' }]}>
                                                    No pending dues - All payments up to date!
                                                </Text>
                                            </View>
                                        )}

                                        {/* Send Via */}
                                        <View style={{ marginBottom: 16, zIndex: 10 }}>
                                            <Text style={styles.paymentModalLabel}>Send Via</Text>
                                            <TouchableOpacity
                                                style={styles.paymentModalDropdown}
                                                onPress={() => setShowSendViaDropdown(!showSendViaDropdown)}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#374151" />
                                                    <Text style={{ marginLeft: 8, color: '#111827' }}>{sendVia}</Text>
                                                </View>
                                                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                                            </TouchableOpacity>
                                            {showSendViaDropdown && (
                                                <View style={styles.paymentModalDropdownOptions}>
                                                    <TouchableOpacity
                                                        style={[styles.paymentModalDropdownOption, sendVia === 'Push Notification' && { backgroundColor: '#F3F4F6' }]}
                                                        onPress={() => { setSendVia('Push Notification'); setShowSendViaDropdown(false); }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <Ionicons name="notifications-outline" size={16} color="#374151" />
                                                                <Text style={{ marginLeft: 8, color: '#374151' }}>Push Notification</Text>
                                                            </View>
                                                            {sendVia === 'Push Notification' && <Ionicons name="checkmark-sharp" size={16} color="#374151" />}
                                                        </View>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.paymentModalDropdownOption, sendVia === 'SMS Message' && { backgroundColor: '#F3F4F6' }]}
                                                        onPress={() => { setSendVia('SMS Message'); setShowSendViaDropdown(false); }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Ionicons name="chatbubble-outline" size={16} color="#374151" />
                                                            <Text style={{ marginLeft: 8, color: '#374151' }}>SMS Message</Text>
                                                        </View>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.paymentModalDropdownOption, sendVia === 'WhatsApp' && { backgroundColor: '#F3F4F6' }]}
                                                        onPress={() => { setSendVia('WhatsApp'); setShowSendViaDropdown(false); }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Ionicons name="logo-whatsapp" size={16} color="#374151" />
                                                            <Text style={{ marginLeft: 8, color: '#374151' }}>WhatsApp</Text>
                                                        </View>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.paymentModalDropdownOption, sendVia === 'Phone Call' && { backgroundColor: '#F3F4F6' }]}
                                                        onPress={() => { setSendVia('Phone Call'); setShowSendViaDropdown(false); }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Ionicons name="call-outline" size={16} color="#374151" />
                                                            <Text style={{ marginLeft: 8, color: '#374151' }}>Phone Call</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>

                                        {/* Message */}
                                        <View style={{ marginBottom: 20 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <Text style={styles.paymentModalLabel}>Message</Text>
                                                <TouchableOpacity
                                                    style={styles.paymentTemplateBtn}
                                                    onPress={() => {
                                                        const amount = Math.abs(selectedCustomer?.balance || 0).toFixed(2);
                                                        const name = selectedCustomer?.name || 'Customer';
                                                        const template = `Dear ${name},\n\nYou have a pending payment of ₹${amount} at our shop.\n\nPlease make the payment at your earliest convenience. You can pay via UPI or visit our shop.\n\nThank you!\n- Shop Owner`;
                                                        setReminderMessage(template);
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 11, color: '#4B5563', fontWeight: '500' }}>Use Template</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <TextInput
                                                style={styles.paymentMessageInput}
                                                placeholder="Enter your reminder message..."
                                                placeholderTextColor="#9CA3AF"
                                                multiline
                                                numberOfLines={3}
                                                value={reminderMessage}
                                                onChangeText={setReminderMessage}
                                                textAlignVertical="top"
                                                maxLength={500}
                                            />
                                            <View style={{ marginTop: 4, height: 1, backgroundColor: '#E5E7EB' }} />
                                            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Characters: {reminderMessage.length}/500</Text>
                                        </View>

                                        {/* Schedule Options */}
                                        <View style={{ marginBottom: 20 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 }}>Schedule Options</Text>

                                            <View style={{ marginBottom: 12 }}>
                                                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Date (Optional)</Text>
                                                <TouchableOpacity
                                                    style={styles.paymentModalDropdown}
                                                    onPress={() => setShowScheduleDatePicker(true)}
                                                >
                                                    <Text style={{ color: scheduleDate ? '#111827' : '#9CA3AF' }}>
                                                        {scheduleDate ? scheduleDate.toLocaleDateString() : 'dd-mm-yyyy'}
                                                    </Text>
                                                    <Ionicons name="calendar-outline" size={18} color="#111827" />
                                                </TouchableOpacity>
                                            </View>

                                            <View>
                                                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Time (Optional)</Text>
                                                <TouchableOpacity
                                                    style={styles.paymentModalDropdown}
                                                    onPress={() => setShowScheduleTimePicker(true)}
                                                >
                                                    <Text style={{ color: scheduleTime ? '#111827' : '#9CA3AF' }}>
                                                        {scheduleTime ? scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </Text>
                                                    <Ionicons name="time-outline" size={18} color="#111827" />
                                                </TouchableOpacity>
                                                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Leave empty to send immediately</Text>
                                            </View>

                                            {showScheduleDatePicker && (
                                                <DateTimePicker
                                                    value={scheduleDate || new Date()}
                                                    mode="date"
                                                    display="default"
                                                    onChange={(event, selectedDate) => {
                                                        setShowScheduleDatePicker(false);
                                                        if (selectedDate) setScheduleDate(selectedDate);
                                                    }}
                                                />
                                            )}

                                            {showScheduleTimePicker && (
                                                <DateTimePicker
                                                    value={scheduleTime || new Date()}
                                                    mode="time"
                                                    display="default"
                                                    onChange={(event, selectedTime) => {
                                                        setShowScheduleTimePicker(false);
                                                        if (selectedTime) setScheduleTime(selectedTime);
                                                    }}
                                                />
                                            )}
                                        </View>

                                        {/* Send Button */}
                                        <TouchableOpacity style={styles.paymentSendBtn} onPress={() => {
                                            // TODO: Implement send logic
                                            setShowPaymentRequestModal(false);
                                            Alert.alert('Success', 'Payment reminder sent successfully!');
                                        }}>
                                            <Text style={styles.paymentSendBtnText}>Send Reminder</Text>
                                            <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {/* Auto Setup Section */}
                                    <View style={[styles.paymentModalSection, { minHeight: 250, paddingBottom: 20 }]}>
                                        <Text style={styles.paymentModalSectionTitle}>Automatic Reminders</Text>

                                        <View style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                                            <View style={{ flex: 1, paddingRight: 16 }}>
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 }}>Enable Auto Reminders</Text>
                                                <Text style={{ fontSize: 13, color: '#6B7280' }}>Automatically send reminders when payment is overdue</Text>
                                            </View>
                                            <Switch
                                                trackColor={{ false: "#E5E7EB", true: "#D1FAE5" }}
                                                thumbColor={isAutoReminderEnabled ? "#059669" : "#fff"}
                                                ios_backgroundColor="#E5E7EB"
                                                onValueChange={() => setIsAutoReminderEnabled(previousState => !previousState)}
                                                value={isAutoReminderEnabled}
                                            />
                                        </View>

                                        {isAutoReminderEnabled && (
                                            <View style={{ marginBottom: 20 }}>
                                                {/* Send reminder after */}
                                                <View style={{ marginBottom: 16, zIndex: 30 }}>
                                                    <Text style={styles.paymentModalLabel}>Send reminder after</Text>
                                                    <TouchableOpacity
                                                        style={styles.paymentModalDropdown}
                                                        onPress={() => setShowAutoReminderDelayDropdown(!showAutoReminderDelayDropdown)}
                                                    >
                                                        <Text style={{ color: '#111827' }}>{autoReminderDelay}</Text>
                                                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                                                    </TouchableOpacity>

                                                    {showAutoReminderDelayDropdown && (
                                                        <View style={styles.paymentModalDropdownOptions}>
                                                            {['1 day overdue', '3 days overdue', '7 days overdue', '15 days overdue', '30 days overdue'].map((option) => (
                                                                <TouchableOpacity
                                                                    key={option}
                                                                    style={[
                                                                        styles.paymentModalDropdownOption,
                                                                        autoReminderDelay === option && { backgroundColor: '#F3F4F6' }
                                                                    ]}
                                                                    onPress={() => {
                                                                        setAutoReminderDelay(option);
                                                                        setShowAutoReminderDelayDropdown(false);
                                                                    }}
                                                                >
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <Text style={{ color: '#374151', fontSize: 14 }}>{option}</Text>
                                                                        {autoReminderDelay === option && (
                                                                            <Ionicons name="checkmark-sharp" size={16} color="#374151" />
                                                                        )}
                                                                    </View>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Reminder Frequency */}
                                                <View style={{ marginBottom: 16, zIndex: 20 }}>
                                                    <Text style={styles.paymentModalLabel}>Reminder Frequency</Text>
                                                    <TouchableOpacity
                                                        style={styles.paymentModalDropdown}
                                                        onPress={() => setShowAutoReminderFrequencyDropdown(!showAutoReminderFrequencyDropdown)}
                                                    >
                                                        <Text style={{ color: '#111827' }}>{autoReminderFrequency}</Text>
                                                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                                                    </TouchableOpacity>

                                                    {showAutoReminderFrequencyDropdown && (
                                                        <View style={styles.paymentModalDropdownOptions}>
                                                            {['Send once only', 'Daily until paid', 'Weekly until paid', 'Every 2 weeks'].map((option) => (
                                                                <TouchableOpacity
                                                                    key={option}
                                                                    style={[
                                                                        styles.paymentModalDropdownOption,
                                                                        autoReminderFrequency === option && { backgroundColor: '#F3F4F6' }
                                                                    ]}
                                                                    onPress={() => {
                                                                        setAutoReminderFrequency(option);
                                                                        setShowAutoReminderFrequencyDropdown(false);
                                                                    }}
                                                                >
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <Text style={{ color: '#374151', fontSize: 14 }}>{option}</Text>
                                                                        {autoReminderFrequency === option && (
                                                                            <Ionicons name="checkmark-sharp" size={16} color="#374151" />
                                                                        )}
                                                                    </View>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Auto Reminder Method */}
                                                <View style={{ marginBottom: 16, zIndex: 10 }}>
                                                    <Text style={styles.paymentModalLabel}>Auto Reminder Method</Text>
                                                    <TouchableOpacity
                                                        style={styles.paymentModalDropdown}
                                                        onPress={() => setShowAutoReminderMethodDropdown(!showAutoReminderMethodDropdown)}
                                                    >
                                                        <Text style={{ color: '#111827' }}>{autoReminderMethod}</Text>
                                                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                                                    </TouchableOpacity>

                                                    {showAutoReminderMethodDropdown && (
                                                        <View style={styles.paymentModalDropdownOptions}>
                                                            {['Push Notification', 'SMS Message', 'WhatsApp'].map((option) => (
                                                                <TouchableOpacity
                                                                    key={option}
                                                                    style={[
                                                                        styles.paymentModalDropdownOption,
                                                                        autoReminderMethod === option && { backgroundColor: '#F3F4F6' }
                                                                    ]}
                                                                    onPress={() => {
                                                                        setAutoReminderMethod(option);
                                                                        setShowAutoReminderMethodDropdown(false);
                                                                    }}
                                                                >
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <Text style={{ color: '#374151', fontSize: 14 }}>{option}</Text>
                                                                        {autoReminderMethod === option && (
                                                                            <Ionicons name="checkmark-sharp" size={16} color="#374151" />
                                                                        )}
                                                                    </View>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        )}

                                        <TouchableOpacity style={[styles.paymentSendBtn, { backgroundColor: '#111827', marginTop: 'auto' }]} onPress={() => {
                                            // TODO: Save logic
                                            Alert.alert('Success', 'Auto reminder settings saved!');
                                        }}>
                                            <Text style={styles.paymentSendBtnText}>Save Auto Reminder Settings</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}



                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal >
            {/* Add Transaction Modal */}
            < AddTransactionModal
                visible={showAddTransactionModal}
                onClose={() => setShowAddTransactionModal(false)}
                shopId={(() => {
                    const sid = user?.shop_id || (shops.length > 0 ? shops[0].id : null);
                    console.log('Dashboard: Passing shopId to AddTransactionModal', sid);
                    return sid;
                })()}
                onSuccess={() => {
                    const shopId = user?.shop_id || (shops.length > 0 ? shops[0].id : null);
                    if (shopId) {
                        loadDashboardStats(shopId);
                        if (activeTab === 'customers') loadCustomers(shopId);
                        // You might also want to refresh recent activity if/when implemented
                    }
                }}
            />
        </SafeAreaView >
    );
};



const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: { flex: 1, overflow: 'hidden' },
    accountScrollContent: { paddingBottom: 100, flexGrow: 1 },

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
    roleDropdown: {
        position: 'absolute',
        top: 45,
        right: 60,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 5,
        padding: 8,
        zIndex: 100,
        minWidth: 180,
    },
    roleOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 10 },
    roleOptionActive: { backgroundColor: '#F0F9FF', borderRadius: 6 },
    roleOptionText: { flex: 1, fontSize: 14, color: '#333' },

    // Tab Content
    tabContent: { flex: 1 },
    tabContentContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    tabPadding: { padding: 16 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Dashboard Styles
    dashboardContainer: { padding: 16, flexGrow: 1 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    statNumber: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginVertical: 4 },
    statLabel: { fontSize: 12, color: '#6B7280' },
    rupeeCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rupeeIcon: { fontSize: 18, fontWeight: 'bold', color: '#EF4444' },
    transactionsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginTop: 8,
        gap: 4,
    },
    transactionsButtonText: { color: '#fff', fontSize: 12, fontWeight: '500' },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 8, marginBottom: 12 },
    quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    quickActionBlue: {
        flex: 1,
        flexDirection: 'column', // Stacked
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB', // Blue-600
        paddingVertical: 16,
        borderRadius: 12,
        gap: 6,
    },
    quickActionGreen: {
        flex: 1,
        flexDirection: 'column', // Stacked
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981', // Emerald-500
        paddingVertical: 16,
        borderRadius: 12,
        gap: 6,
    },
    quickActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    recentActivityCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    recentActivityTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
    recentActivityEmpty: { fontSize: 14, color: '#9CA3AF' },

    // Products Tab Styles
    tabHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tabHeaderLeft: { flex: 1, marginRight: 12 },
    tabHeaderTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
    tabHeaderSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 18 },
    addButtonBlue: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
        gap: 6,
    },
    addButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
    tabEmptyState: { alignItems: 'center', marginTop: 60 },
    tabEmptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
    tabEmptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },

    // Products Card (combined header + empty state)
    productsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    productsCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    productsEmptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },

    // Customers Tab Styles
    customersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    customersTitle: { fontSize: 20, fontWeight: '600', color: '#111827' },
    customersHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countBadgeText: { fontSize: 12, fontWeight: '500', color: '#374151' },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 20,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111827' },
    customersEmptyState: { alignItems: 'center', marginTop: 60 },

    // Transactions Tab Styles
    transactionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    transactionsTitle: { fontSize: 20, fontWeight: '600', color: '#111827' },
    transactionsEmptyState: { alignItems: 'center', marginTop: 60 },
    moneyBagEmoji: { fontSize: 48 },

    // Empty State Card - Matching reference
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
    emptyDescription: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
    createShopButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    createShopText: { color: '#fff', fontSize: 16, fontWeight: '600' },    // Account Tab Styles
    accountScrollContent: { flexGrow: 1, padding: 16 },

    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12
    },
    profileName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    profilePhone: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    roleBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
    roleBadgeText: { fontSize: 14, color: '#374151' },


    settingsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    settingsTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
    settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    settingItemLast: { borderBottomWidth: 0 },
    settingIcon: { fontSize: 18, marginRight: 12 },
    settingText: { flex: 1, fontSize: 15, color: '#374151' },
    logoutTextRed: { color: '#EF4444' },

    footer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    footerBrand: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6' },
    footerVersion: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    footerTagline: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

    // Bottom Navigation - Matching reference exactly
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

    // Create Shop Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#fff',
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    dropdownText: {
        fontSize: 14,
        color: '#111827',
    },
    placeholderText: {
        color: '#9CA3AF',
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        marginTop: 4,
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dropdownScroll: {
        maxHeight: 200,
    },
    dropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#374151',
    },
    createButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    createButtonDisabled: {
        opacity: 0.7,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    modalClose: {
        position: 'absolute',
        right: 0,
        padding: 4,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 8,
    },
    required: {
        color: '#EF4444',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#fff',
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    dropdownText: {
        fontSize: 16,
        color: '#111827',
    },
    placeholder: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    categoryList: {
        marginBottom: 16,
        marginTop: -8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    categoryItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    categoryItemText: {
        fontSize: 15,
        color: '#374151',
    },
    submitButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },



    // Share Card Styles
    shareCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden', // Ensure content stays inside
    },
    shareHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    shareIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    shareTitleContainer: {
        flex: 1,
    },
    shareTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    shareSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    showQrButton: {
        flexDirection: 'row',
        backgroundColor: '#6D28D9', // Deep Purple
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
    },
    showQrButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Expanded State Styles
    shareExpandedContent: {
        marginTop: 8,
    },
    shareBlueHeader: {
        backgroundColor: '#6D28D9',
        borderRadius: 8,
        marginBottom: 16,
        overflow: 'hidden',
    },
    collapseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
    },
    collapseButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    qrSection: {
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        marginBottom: 16,
    },
    qrLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    qrContainer: {
        padding: 16,
        backgroundColor: '#fff',
    },
    qrActionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        width: '100%',
    },
    qrActionButton: {
        flex: 1,
        // flexDirection: 'row', // Removed to stack vertically
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 6,
        paddingVertical: 10, // Increased padding
        gap: 6,
    },
    qrActionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    qrFooterText: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 16,
    },

    linkSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        marginBottom: 16,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    sectionSubHeader: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
    },
    linkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginBottom: 12,
        gap: 8,
    },
    linkText: {
        flex: 1,
        fontSize: 13,
        color: '#4B5563',
    },
    copyLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 6,
        paddingVertical: 10,
        gap: 6,
        marginBottom: 12,
    },
    copyLinkText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    shareButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    whatsappButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#22C55E',
        borderRadius: 6,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    whatsappButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    nativeShareButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 6,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    nativeShareText: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '500',
    },
    infoBoxBlue: {
        backgroundColor: '#EFF6FF',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    infoBoxTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E40AF',
        marginBottom: 8,
    },
    infoBoxItem: {
        fontSize: 12,
        color: '#1E3A8A',
        marginBottom: 4,
    },

    marketingSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
    },
    marketingTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    marketingCard: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    marketingCardTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    marketingCardText: {
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 18,
    },
    marketingCardText: {
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 18,
    },

    shopDetailsCard: {
        // Removed as it is now inside shopInfoCard
    },

    // New Card Styles
    shopInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    shopDetailsContent: {
        paddingLeft: 4,
    },

    qrCodeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        alignItems: 'center', // Center content in QR card
    },
    qrCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
        alignSelf: 'flex-start',
    },
    qrCardSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
        alignSelf: 'flex-start',
        lineHeight: 20,
    },
    qrActionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20, // Space from QR code
        marginBottom: 8, // Space before footer text
        width: '100%',
    },
    qrFooter: {
        flexDirection: 'row',
        alignItems: 'center', // Center vertically
        justifyContent: 'center', // Center horizontally
        marginTop: 8,
        marginBottom: 8,
        gap: 6,
        paddingHorizontal: 20,
    },
    qrFooterEmoji: {
        fontSize: 14,
        marginBottom: 20,
    },
    qrFooterText: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        flexShrink: 1, // Ensure text wraps if needed
        lineHeight: 18,
    },

    // Updated existing styles
    shopNameLarge: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },

    // No Shop Card Styles
    noShopCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    noShopHeader: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    noShopIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#F3F4F6', // Light gray/purple bg
        alignItems: 'center',
        justifyContent: 'center',
    },
    noShopHeaderTextContainer: {
        flex: 1,
    },
    noShopTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    noShopSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        maxWidth: '95%',
    },
    noShopMessageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    noShopMessageText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 8,
    },

    // Restored Styles for Active Shop Card
    locationCodeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        width: '100%',
    },
    shopLocationText: {
        fontSize: 15,
        color: '#6B7280',
    },
    categoryBadgeSmall: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignSelf: 'flex-start',
    },
    categoryBadgeTextSmall: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    shopCodeBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    shopCodeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1D4ED8',
    },

    // Customer List Styles
    customersList: {
        marginTop: 6,
        gap: 6,
    },
    customerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 10,
    },

    // Payment Request Modal Styles
    // Payment Request Modal Styles
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    paymentModalContent: {
        backgroundColor: '#F3F4F6',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%',
        width: '100%',
    },
    paymentModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    paymentModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginLeft: 8,
    },
    paymentCustomerCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    paymentModalTabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    paymentModalTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    paymentModalTabActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    paymentModalTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginLeft: 8,
    },
    paymentModalTabTextActive: {
        color: '#111827',
    },
    paymentModalSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    paymentModalSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    paymentModalLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 6,
    },
    paymentModalDropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
    },
    paymentModalDropdownOptions: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        marginTop: 4,
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    paymentModalDropdownOption: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    paymentStatusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#D1FAE5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    paymentStatusText: {
        fontSize: 13,
        color: '#047857',
        fontWeight: '600',
        marginLeft: 8,
        flex: 1,
    },
    paymentTemplateBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    paymentMessageInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#fff',
        height: 180,
    },
    paymentSendBtn: {
        backgroundColor: '#EA580C',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 10,
        marginTop: 8,
    },
    paymentSendBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    customerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    customerAvatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#3B82F6',
    },
    customerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    customerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    customerPhone: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '400',
    },
    customerBalance: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginRight: 12, // Space between balance and arrow
    },
    customerRightSide: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 4,
        alignSelf: 'flex-end',
    },
    statusBadgeClear: {
        backgroundColor: '#F3F4F6',
    },
    statusBadgeAdvance: {
        backgroundColor: '#ECFDF5',
    },
    statusBadgeDue: {
        backgroundColor: '#FEF2F2',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadgeTextClear: {
        color: '#374151',
    },
    statusBadgeTextAdvance: {
        color: '#10B981',
    },
    statusBadgeTextDue: {
        color: '#EF4444',
    },
    balanceAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    arrowButton: {
        backgroundColor: '#4F83F5', // Similar blue to image
        width: 28,
        height: 28,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12, // Matching other elements
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8, // Explicit spacing
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    productsHeaderCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
    },
    productsEmptyContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 40,
        alignItems: 'center',
    },
    productsList: {
        padding: 16,
        gap: 12,
    },
    productItem: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    productInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    productName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    priceBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    priceText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    productActionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButtonOutline: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    actionButtonTextOutline: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    actionButtonRed: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#EF4444',
    },
    actionButtonTextRed: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
    },


    // Transaction Card Styles
    transactionsList: {
        marginTop: 6,
        gap: 12,
        paddingBottom: 20,
    },
    transactionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    tCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    tCardName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    tCardDate: {
        fontSize: 12,
        color: '#6B7280',
    },
    tCardRight: {
        alignItems: 'flex-end',
    },
    tCardAmount: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    tCardBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    tCardBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    tCardItems: {
        backgroundColor: '#F3F4F6', // gray-100 (Darker than F9FAFB)
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    tCardLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2,
    },
    tCardItemText: {
        fontSize: 13,
        color: '#6B7280',
    },
    tCardNote: {
        backgroundColor: '#FFFBEB', // amber-50
        borderLeftWidth: 3,
        borderLeftColor: '#FCD34D', // amber-300
        padding: 10,
        borderRadius: 4,
    },
    tCardNoteText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '400',
    },
    // Customer Detail Styles
    customerDetailBackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    customerDetailBackBtn: {
        padding: 4,
        marginRight: 12,
    },
    customerDetailTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    customerDetailSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    customerDetailCard: {
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
    customerDetailMainCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    customerDetailInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    customerDetailName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    customerDetailPhone: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    customerDetailBalance: {
        fontSize: 20,
        fontWeight: '700',
    },
    customerDetailBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 4,
    },
    customerDetailBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    customerDetailAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
    },
    customerDetailAddBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
        marginLeft: 6,
    },
    customerDetailUpiBtn: {
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
    customerDetailUpiBtnText: {
        color: '#374151',
        fontWeight: '500',
        fontSize: 14,
        marginLeft: 6,
    },
    customerDetailPaymentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F97316',
        padding: 14,
        borderRadius: 10,
        marginBottom: 16,
    },
    customerDetailPaymentBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
        marginLeft: 6,
    },
    customerDetailSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    customerDetailTxHistoryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    customerDetailSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    customerDetailSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 6,
    },
    customerDetailStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    customerDetailStatBox: {
        width: '48%',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    customerDetailStatValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    customerDetailStatLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
        textAlign: 'center',
    },
    customerDetailTxCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    customerDetailTxBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    customerDetailDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        marginTop: -5,
        alignSelf: 'flex-start',
    },
    customerDetailItemsBox: {
        backgroundColor: '#F9FAFB',
        padding: 14,
        borderRadius: 10,
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    customerDetailNetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
    },
    customerDetailNetLabel: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    customerDetailNetValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    customerDetailFilterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    customerDetailPdfBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 6,
        backgroundColor: '#FEF2F2',
    },
    customerDetailExcelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#86EFAC',
        borderRadius: 6,
        backgroundColor: '#F0FDF4',
    },
    customerDetailFilterLabel: {
        fontSize: 12,
        color: '#374151',
        fontWeight: '500',
        marginBottom: 4,
    },
    customerDetailDateInput: {
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
    customerDetailTypeDropdown: {
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
    customerDetailDropdownOptions: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 100,
    },
    customerDetailDropdownOption: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    customerDetailDropdownOptionActive: {
        backgroundColor: '#EFF6FF',
    },
    customerDetailPaymentNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        padding: 8,
        borderRadius: 6,
        marginTop: 10,
    },
    customerDetailNoteBox: {
        flexDirection: 'row',
        backgroundColor: '#FFFBEB',
        borderLeftWidth: 3,
        borderLeftColor: '#FCD34D',
        padding: 10,
        borderRadius: 4,
        marginTop: 10,
    },
    customerDetailNoteLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#92400E',
    },
    customerDetailNoteText: {
        fontSize: 13,
        color: '#4B5563',
        flex: 1,
    },
    customerDetailItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    customerDetailQtyBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    customerDetailItemsTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10,
        marginTop: 4,
    },
});

export default ShopOwnerDashboardScreen;