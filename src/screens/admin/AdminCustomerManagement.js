import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    ScrollView,
    Modal,
    BackHandler,
    RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminAPI, customerAPI, getAPIErrorMessage } from '../../api';
import AdminCustomerDetailScreen from './AdminCustomerDetailScreen';

const AdminCustomerManagement = () => {
    const navigation = useNavigation();
    const [customers, setCustomers] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedShop, setSelectedShop] = useState('all');
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Added for inline navigation
    const [stats, setStats] = useState({
        totalCustomers: 0,
        activeShops: 0,
        withDues: 0,
        totalTransactions: 0
    });

    // Pagination for list
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
    const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30];

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(0);
        setShowPageSizeDropdown(false);
    };

    // Filter Modal State
    const [showFilterModal, setShowFilterModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    // Android hardware back button: return to customer list from detail
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (selectedCustomer) {
                setSelectedCustomer(null);
                return true;
            }
            return false;
        });
        return () => backHandler.remove();
    }, [selectedCustomer]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch all shops
            const shopsResponse = await adminAPI.getShops('', 0, 1000);
            const shopsData = shopsResponse.data.shops || [];
            setShops(shopsData);

            // 2. Fetch ALL customers directly (to include those with 0 transactions)
            const customersResponse = await adminAPI.getCustomers('', 0, 1000);
            const fetchedCustomers = customersResponse.data.customers || [];
            const globalTotalTransactions = customersResponse.data.total_global_transactions || 0;

            // 3. Map to internal format
            const enrichedCustomers = fetchedCustomers.map(c => ({
                ...c,
                totalTransactions: c.total_transactions || 0,
                lastTransaction: c.last_transaction_date,
                // Ensure shop object is present
                shop: c.shop || shopsData.find(s => s.id === c.shop_id) || { name: 'Unknown', category: 'General' }
            }));

            setCustomers(enrichedCustomers);

            // 4. Update Stats
            const totalTxCount = globalTotalTransactions > 0 ? globalTotalTransactions : enrichedCustomers.reduce((sum, c) => sum + (c.totalTransactions || 0), 0);

            setStats({
                totalCustomers: enrichedCustomers.length,
                activeShops: shopsData.length,
                withDues: enrichedCustomers.filter(c => c.balance < 0).length,
                totalTransactions: totalTxCount
            });

        } catch (err) {
            console.error('Data fetch error:', err);
            if (err.response && err.response.status === 404) {
                Alert.alert('Server Update Required', 'The /admin/customers endpoint was not found. Please RESTART your backend server terminal to apply the latest changes.');
            } else {
                Alert.alert('Error', getAPIErrorMessage(err));
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Autocomplete State
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        let matches = [];
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            matches = customers.filter(c =>
                c.name?.toLowerCase().includes(searchLower) ||
                c.phone?.includes(search)
            );
        } else {
            matches = customers;
        }
        setSuggestions(matches.slice(0, 50));
    }, [search, customers]);

    const handleSelectSuggestion = (customer) => {
        setSearch(customer.name);
        setShowSuggestions(false);
    };

    const filterCustomers = () => {
        let filtered = [...customers];

        if (search.trim()) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(c =>
                c.name?.toLowerCase().includes(searchLower) ||
                c.phone?.includes(search) ||
                c.shop?.name?.toLowerCase().includes(searchLower)
            );
        }

        if (selectedShop !== 'all') {
            filtered = filtered.filter(c => c.shop?.id === selectedShop);
        }

        return filtered;
    };

    const filteredCustomers = filterCustomers();
    const paginatedCustomers = filteredCustomers.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    const totalPages = Math.ceil(filteredCustomers.length / pageSize);

    const formatCurrency = (amount) => {
        return `₹${parseFloat(Math.abs(amount || 0)).toFixed(0)}`;
    };

    // Inline Detail View
    if (selectedCustomer) {
        return (
            <AdminCustomerDetailScreen
                customer={selectedCustomer}
                shopId={selectedCustomer.shop?.id}
                onBack={() => setSelectedCustomer(null)}
            />
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
    };

    const renderCustomerItem = ({ item }) => {
        const balance = item.balance || 0;
        const isCredit = balance > 0;
        const isClear = balance === 0;
        const isOwes = balance < 0;

        return (
            <View style={styles.customerCard}>

                {/* Header: Name and Balance Pill */}
                <View style={styles.cardHeader}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <View style={[
                        styles.balancePill,
                        { backgroundColor: isCredit ? '#ECFDF5' : isOwes ? '#FEF2F2' : '#F3F4F6' }
                    ]}>
                        <Text style={[
                            styles.balanceText,
                            isCredit ? { color: '#10B981' } : isOwes ? { color: '#EF4444' } : { color: '#374151' } // Green : Red : Gray
                        ]}>
                            ₹{Math.abs(balance).toFixed(0)}
                        </Text>
                    </View>
                </View>

                {/* Sub-Header: Phone, Shop, Credit Badge */}
                <View style={styles.cardSubHeader}>
                    <View>
                        <View style={styles.infoRow}>
                            <Ionicons name="call-outline" size={14} color="#6B7280" />
                            <Text style={styles.infoText}>  {item.phone}</Text>
                        </View>
                        {item.shop && (
                            <View style={[styles.infoRow, { marginTop: 4 }]}>
                                <Ionicons name="storefront-outline" size={14} color="#6B7280" />
                                <Text style={styles.infoText}>  {item.shop.name}</Text>
                            </View>
                        )}
                    </View>
                    <View style={[
                        styles.creditBadge,
                        isCredit ? { backgroundColor: '#000000' } : isOwes ? { backgroundColor: '#EF4444' } : { backgroundColor: '#F3F4F6' }
                    ]}>
                        <Text style={[
                            styles.creditBadgeText,
                            isClear ? { color: '#000000' } : { color: '#FFFFFF' }
                        ]}>
                            {isCredit ? 'Credit' : isOwes ? 'Owes' : 'Clear'}
                        </Text>
                    </View>
                </View>

                {/* Details Section */}
                <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Category:</Text>
                        <Text style={styles.detailValue}>{item.shop?.category || 'General'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Transactions:</Text>
                        <Text style={styles.detailValue}>{item.totalTransactions || 0}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Last Purchase:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="calendar-outline" size={14} color="#111827" style={{ marginRight: 4 }} />
                            <Text style={styles.detailValue}>{formatDate(item.lastTransaction)}</Text>
                        </View>
                    </View>
                </View>

                {/* View Details Button */}
                <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => {
                        if (!item.shop?.id) {
                            Alert.alert('Error', 'Shop information missing for this customer.');
                            return;
                        }
                        setSelectedCustomer(item);
                    }}
                >
                    <Ionicons name="eye-outline" size={16} color="#111827" style={{ marginRight: 6 }} />
                    <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>

            </View>
        );
    };

    const StatsCard = ({ icon, title, value, subtext, color, iconBg }) => (
        <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>{title}</Text>
                <View style={[styles.statIconContainer, { backgroundColor: iconBg || '#F3F4F6' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
            </View>
            <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statSubtext}>{subtext}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4c1d95', '#2563EB']}
                style={styles.gradient}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
                    }
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Customer Analytics</Text>
                        <Text style={styles.headerSubtitle}>View and manage customers across all shops</Text>
                    </View>

                    {/* Stats Stack */}
                    <View style={styles.statsContainer}>
                        <StatsCard
                            icon="people-outline"
                            title="Customers"
                            value={stats.totalCustomers}
                            subtext="Total Registered"
                            color="#2563EB"
                            iconBg="#EFF6FF"
                        />
                        <StatsCard
                            icon="storefront-outline"
                            title="Active Shops"
                            value={stats.activeShops}
                            subtext="On Platform"
                            color="#059669"
                            iconBg="#D1FAE5"
                        />
                        <StatsCard
                            icon="trending-down-outline"
                            title="With Dues"
                            value={stats.withDues}
                            subtext="Pending Payments"
                            color="#DC2626"
                            iconBg="#FEE2E2"
                        />
                        <StatsCard
                            icon="swap-horizontal-outline"
                            title="Transactions"
                            value={stats.totalTransactions}
                            subtext="All time"
                            color="#7C3AED"
                            iconBg="#F3E8FF"
                        />
                    </View>

                    {/* Bottom Content Area */}
                    <View style={styles.bottomSheet}>

                        {/* Search Card */}
                        <View style={[styles.searchCard, { zIndex: 10 }]}>
                            <View style={styles.searchHeader}>
                                <Ionicons name="people-outline" size={20} color="#111827" />
                                <Text style={styles.searchTitle}>Search Customers</Text>
                            </View>

                            <View style={styles.searchContainerRelative}>
                                <View style={styles.searchInputContainer}>
                                    <Ionicons name="search-outline" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search customers..."
                                        placeholderTextColor="#9CA3AF"
                                        value={search}
                                        onChangeText={setSearch}
                                        onFocus={() => {
                                            setShowSuggestions(true);
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => setShowSuggestions(false), 200);
                                        }}
                                    />
                                    {search.length > 0 && (
                                        <TouchableOpacity onPress={() => { setSearch(''); setShowSuggestions(false); }}>
                                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Autocomplete Dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <View style={styles.suggestionsDropdown}>
                                        {suggestions.map((item, index) => (
                                            <TouchableOpacity
                                                key={`${item.id}-${index}`}
                                                style={styles.suggestionItem}
                                                onPress={() => handleSelectSuggestion(item)}
                                            >
                                                <View>
                                                    <Text style={styles.suggestionName}>{item.name}</Text>
                                                    <Text style={styles.suggestionPhone}>{item.phone}</Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.shopFilterBtn}
                                onPress={() => setShowFilterModal(true)}
                            >
                                <Text style={styles.shopFilterText}>
                                    {selectedShop === 'all' ? 'All Shops' : shops.find(s => s.id === selectedShop)?.name || 'Selected Shop'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="#6B7280" />
                            </TouchableOpacity>

                            <View style={styles.resultsRow}>
                                <Text style={styles.resultsText}>
                                    Showing {paginatedCustomers.length} of {filteredCustomers.length} customers
                                </Text>
                                <TouchableOpacity onPress={() => { setLoading(true); fetchData(); }} style={styles.refreshBtn}>
                                    <Text style={styles.refreshText}>Refresh Data</Text>
                                </TouchableOpacity>
                            </View>
                        </View>


                        {/* List */}
                        {loading && !refreshing ? (
                            <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
                        ) : (
                            <View style={styles.listContainer}>
                                {paginatedCustomers.map((item, index) => (
                                    <View key={`${item.id}-${index}`}>
                                        {renderCustomerItem({ item })}
                                    </View>
                                ))}
                                {paginatedCustomers.length === 0 && (
                                    <Text style={styles.emptyText}>No customers found.</Text>
                                )}
                            </View>
                        )}

                        {/* Pagination */}
                        {/* Pagination - Advanced */}
                        <View style={styles.paginationContainer}>
                            <View style={styles.paginationTopRow}>
                                <Text style={styles.paginationInfoText}>
                                    Showing {paginatedCustomers.length === 0 ? 0 : currentPage * pageSize + 1} to{' '}
                                    {Math.min((currentPage + 1) * pageSize, filteredCustomers.length)} of{' '}
                                    <Text style={styles.paginationInfoBold}>{filteredCustomers.length} customers</Text>
                                </Text>

                                <View style={styles.pageSizeSelector}>
                                    <Text style={styles.pageSizeLabel}>Show:</Text>
                                    <View>
                                        <TouchableOpacity
                                            style={styles.pageSizeDropdownButton}
                                            onPress={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
                                        >
                                            <Text style={styles.pageSizeDropdownText}>{pageSize}</Text>
                                            <Ionicons name={showPageSizeDropdown ? 'chevron-up' : 'chevron-down'} size={14} color="#374151" />
                                        </TouchableOpacity>
                                        {showPageSizeDropdown && (
                                            <View style={styles.pageSizeDropdownMenu}>
                                                {PAGE_SIZE_OPTIONS.map((size) => (
                                                    <TouchableOpacity
                                                        key={size}
                                                        style={[styles.pageSizeDropdownItem, pageSize === size && styles.pageSizeDropdownItemActive]}
                                                        onPress={() => handlePageSizeChange(size)}
                                                    >
                                                        <Text style={[styles.pageSizeDropdownItemText, pageSize === size && styles.pageSizeDropdownItemTextActive]}>{size}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            <View style={styles.paginationDivider} />

                            <View style={styles.paginationBottomRow}>
                                <TouchableOpacity
                                    style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
                                    onPress={() => setCurrentPage(c => Math.max(0, c - 1))}
                                    disabled={currentPage === 0}
                                >
                                    <Ionicons name="chevron-back" size={14} color={currentPage === 0 ? '#D1D5DB' : '#374151'} />
                                    <Text style={[styles.pageButtonText, currentPage === 0 && styles.pageButtonTextDisabled]}>Previous</Text>
                                </TouchableOpacity>

                                <View style={styles.pageInfoBox}>
                                    <Text style={styles.pageInfoLabel}>Page</Text>
                                    <Text style={styles.pageInfoNumber}>{currentPage + 1} of {Math.max(1, totalPages)}</Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.pageButton, currentPage >= totalPages - 1 && styles.pageButtonDisabled]}
                                    onPress={() => setCurrentPage(c => Math.min(totalPages - 1, c + 1))}
                                    disabled={currentPage >= totalPages - 1}
                                >
                                    <Text style={[styles.pageButtonText, currentPage >= totalPages - 1 && styles.pageButtonTextDisabled]}>Next</Text>
                                    <Ionicons name="chevron-forward" size={14} color={currentPage >= totalPages - 1 ? '#D1D5DB' : '#374151'} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View />
                    </View>
                </ScrollView>
            </LinearGradient>

            {/* Shop Filter Modal */}
            <Modal
                visible={showFilterModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter by Shop</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.shopList}>
                            <TouchableOpacity
                                style={[styles.shopItem, selectedShop === 'all' && styles.shopItemActive]}
                                onPress={() => { setSelectedShop('all'); setShowFilterModal(false); }}
                            >
                                <Text style={[styles.shopItemText, selectedShop === 'all' && styles.shopItemTextActive]}>All Shops</Text>
                                {selectedShop === 'all' && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
                            </TouchableOpacity>
                            {shops.map(shop => (
                                <TouchableOpacity
                                    key={shop.id}
                                    style={[styles.shopItem, selectedShop === shop.id && styles.shopItemActive]}
                                    onPress={() => { setSelectedShop(shop.id); setShowFilterModal(false); }}
                                >
                                    <View>
                                        <Text style={[styles.shopItemText, selectedShop === shop.id && styles.shopItemTextActive]}>{shop.name}</Text>
                                        <Text style={styles.shopItemSubtext}>{shop.location}</Text>
                                    </View>
                                    {selectedShop === shop.id && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        padding: 20,
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#E0E7FF',
        marginTop: 4,
    },
    statsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    statCard: {
        width: '48%', // Approx 2 columns
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12, // Reduced padding
        marginBottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: 110,
    },
    statCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4, // Reduced margin
    },
    statIconContainer: {
        width: 32, // Slightly smaller icon container
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statTextContainer: {
        justifyContent: 'flex-end',
    },
    statLabel: {
        fontSize: 13, // Slightly smaller
        color: '#4B5563',
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    statValue: {
        fontSize: 24, // Reduced fro 28
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 0,
    },
    statSubtext: {
        fontSize: 11, // Smaller subtext
        color: '#9CA3AF',
        marginTop: 0,
    },
    bottomSheet: {
        flex: 1,
        // No background here, just container
        paddingHorizontal: 16,
    },
    searchCard: {
        backgroundColor: '#fff',
        borderRadius: 12, // Matches design
        padding: 16,
        marginBottom: 16,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    searchTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginLeft: 8,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
    },
    shopFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    shopFilterText: {
        fontSize: 14,
        color: '#374151',
    },
    resultsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resultsText: {
        fontSize: 14,
        color: '#6B7280',
    },
    refreshBtn: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    refreshText: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '500',
    },
    listContainer: {
        paddingBottom: 20,
    },
    customerCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        // Elevation/Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    customerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    balancePill: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    balanceText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#10B981',
    },
    cardSubHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 13,
        color: '#6B7280',
    },
    creditBadge: {
        backgroundColor: '#111827', // Dark black/gray
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    creditBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    detailsContainer: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '500',
        color: '#111827',
    },
    viewDetailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    viewDetailsText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 20,
    },
    // Pagination Styles
    paginationContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    paginationInfoText: {
        fontSize: 13,
        color: '#6B7280',
        flexShrink: 1,
    },
    paginationInfoBold: {
        fontWeight: '600',
        color: '#374151',
    },
    paginationDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    paginationTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paginationBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pageSizeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pageSizeLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginRight: 4,
    },
    pageSizeDropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 6,
        backgroundColor: '#fff',
        gap: 6,
    },
    pageSizeDropdownText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    pageSizeDropdownMenu: {
        position: 'absolute',
        bottom: 38,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingVertical: 4,
        minWidth: 70,
        zIndex: 100,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    pageSizeDropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: 'center',
    },
    pageSizeDropdownItemActive: {
        backgroundColor: '#EEF2FF',
    },
    pageSizeDropdownItemText: {
        fontSize: 13,
        color: '#374151',
    },
    pageSizeDropdownItemTextActive: {
        color: '#4F46E5',
        fontWeight: '600',
    },
    pageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#fff',
        gap: 4,
    },
    pageButtonDisabled: {
        backgroundColor: '#F9FAFB',
        borderColor: '#E5E7EB',
    },
    pageButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    pageButtonTextDisabled: {
        color: '#9CA3AF',
    },
    pageInfoBox: {
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    pageInfoLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    pageInfoNumber: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    shopList: {
        padding: 16,
    },
    shopItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    shopItemActive: {
        backgroundColor: '#F5F3FF',
        borderRadius: 8,
        paddingHorizontal: 8,
        borderBottomWidth: 0,
    },
    shopItemText: {
        fontSize: 16,
        color: '#374151',
    },
    shopItemTextActive: {
        color: '#7C3AED',
        fontWeight: '600',
    },
    shopItemSubtext: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    // Search Suggestions Styling
    searchContainerRelative: {
        position: 'relative',
        zIndex: 20,
    },
    suggestionsDropdown: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 10,
        zIndex: 50,
        maxHeight: 250,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    suggestionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    suggestionPhone: {
        fontSize: 12,
        color: '#6B7280',
    },
});

export default AdminCustomerManagement;
