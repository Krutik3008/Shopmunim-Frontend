import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { customerAPI, getAPIErrorMessage } from '../../api';
import AdminCustomerDetailScreen from './AdminCustomerDetailScreen';

const AdminShopDetailsScreen = ({ shopId, shopName, shopCategory, onBack }) => {

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [stats, setStats] = useState({
        totalCustomers: 0,
        withDues: 0,
        totalTransactions: 0,
        totalAmount: 0
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(0);
    const pageSize = 20;

    // Autocomplete State
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        if (shopId) {
            fetchData();
        } else {
            Alert.alert('Error', 'No Shop ID provided');
            if (onBack) onBack();
        }
    }, [shopId]);

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

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await customerAPI.getAll(shopId);
            const responseData = response.data || {};
            const fetchedCustomers = responseData.customers || responseData || [];

            const enrichedCustomers = (Array.isArray(fetchedCustomers) ? fetchedCustomers : []).map(c => ({
                ...c,
                totalTransactions: c.total_transactions || 0,
                lastTransaction: c.last_transaction_date,
                shop: { id: shopId, name: shopName, category: shopCategory }
            }));

            setCustomers(enrichedCustomers);

            const duesCount = enrichedCustomers.filter(c => (c.balance || 0) < 0).length;

            setStats({
                totalCustomers: enrichedCustomers.length,
                withDues: duesCount,
                totalTransactions: responseData.total_transactions || enrichedCustomers.reduce((sum, c) => sum + (c.totalTransactions || 0), 0),
                totalAmount: responseData.total_amount || 0
            });

        } catch (err) {
            console.error('Data fetch error:', err);
            Alert.alert('Error', getAPIErrorMessage(err));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filterCustomers = () => {
        let filtered = [...customers];
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(c =>
                c.name?.toLowerCase().includes(searchLower) ||
                c.phone?.includes(search)
            );
        }
        return filtered;
    };

    const filteredCustomers = filterCustomers();
    const paginatedCustomers = filteredCustomers.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    const totalPages = Math.ceil(filteredCustomers.length / pageSize);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
    };

    // Inline Detail View
    if (selectedCustomer) {
        return (
            <AdminCustomerDetailScreen
                customer={selectedCustomer}
                shopId={shopId}
                onBack={() => setSelectedCustomer(null)}
            />
        );
    }

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
                            isCredit ? { color: '#10B981' } : isOwes ? { color: '#EF4444' } : { color: '#374151' }
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
                        <Text style={styles.detailValue}>{item.shop?.category || shopCategory || 'General'}</Text>
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
                        setSelectedCustomer(item);
                    }}
                >
                    <Ionicons name="eye-outline" size={16} color="#111827" style={{ marginRight: 6 }} />
                    <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>

            </View>
        );
    };

    const StatsCard = ({ icon, title, value, subtitle, color, iconBg }) => (
        <View style={styles.statCard}>
            <View style={styles.statCardTop}>
                <Text style={styles.statLabel}>{title}</Text>
                <View style={[styles.statIconContainer, { backgroundColor: iconBg || '#F3F4F6' }]}>
                    <Ionicons name={icon} size={18} color={color} />
                </View>
            </View>
            <Text style={styles.statValue}>{value}</Text>
            {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4c1d95', '#2563EB']}
                style={styles.gradient}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>{shopName || 'Shop Details'}</Text>
                            <Text style={styles.headerSubtitle}>View and manage customers for this shop</Text>
                        </View>
                    </View>

                    {/* Stats Grid 2x2 */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statsRow}>
                            <StatsCard
                                icon="people-outline"
                                title="Customers"
                                value={stats.totalCustomers}
                                subtitle="Total"
                                color="#2563EB"
                                iconBg="#EFF6FF"
                            />
                            <StatsCard
                                icon="swap-horizontal-outline"
                                title="Transactions"
                                value={stats.totalTransactions}
                                subtitle="All time"
                                color="#7C3AED"
                                iconBg="#F3E8FF"
                            />
                        </View>
                        <View style={styles.statsRow}>
                            <StatsCard
                                icon="wallet-outline"
                                title="₹ Amount"
                                value={`₹${stats.totalAmount.toFixed(0)}`}
                                subtitle="All time"
                                color="#059669"
                                iconBg="#D1FAE5"
                            />
                            <StatsCard
                                icon="trending-down-outline"
                                title="With Dues"
                                value={stats.withDues}
                                subtitle="Customers"
                                color="#DC2626"
                                iconBg="#FEE2E2"
                            />
                        </View>
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
                        {totalPages > 1 && (
                            <View style={styles.paginationRow}>
                                <TouchableOpacity
                                    disabled={currentPage === 0}
                                    onPress={() => setCurrentPage(c => Math.max(0, c - 1))}
                                >
                                    <Text style={[styles.pageBtn, currentPage === 0 && styles.disabledText]}>Prev</Text>
                                </TouchableOpacity>
                                <Text style={styles.pageText}>Page {currentPage + 1}</Text>
                                <TouchableOpacity
                                    disabled={currentPage >= totalPages - 1}
                                    onPress={() => setCurrentPage(c => Math.min(totalPages - 1, c + 1))}
                                >
                                    <Text style={[styles.pageBtn, currentPage >= totalPages - 1 && styles.disabledText]}>Next</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View />
                    </View>
                </ScrollView>
            </LinearGradient>
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 10,
    },
    backButton: {
        marginRight: 16,
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
        paddingBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
    },
    statSubtitle: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    bottomSheet: {
        flex: 1,
        paddingHorizontal: 16,
    },
    searchCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
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
        backgroundColor: '#111827',
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
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    pageBtn: {
        fontSize: 15,
        color: '#4F46E5',
        fontWeight: '600',
    },
    disabledText: {
        color: '#9CA3AF',
    },
    pageText: {
        fontSize: 14,
        color: '#6B7280',
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

export default AdminShopDetailsScreen;
