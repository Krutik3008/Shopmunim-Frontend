import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI, getAPIErrorMessage } from '../../api';
import AdminShopDetailsScreen from './AdminShopDetailsScreen';

const AdminShopManagement = () => {
    const [selectedShop, setSelectedShop] = useState(null);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [totalShops, setTotalShops] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(20);

    const searchRef = useRef('');

    const doSearch = async (searchText, page, size) => {
        try {
            setLoading(true);
            const response = await adminAPI.getShops(searchText, page * size, size);
            setShops(response.data.shops || []);
            setTotalShops(response.data.total || 0);
        } catch (err) {
            console.error('Shops fetch error:', err);
            Alert.alert('Error', getAPIErrorMessage(err));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load
    useEffect(() => {
        doSearch('', 0, pageSize);
    }, []);

    // Page change
    useEffect(() => {
        if (currentPage === 0) return;
        doSearch(searchRef.current, currentPage, pageSize);
    }, [currentPage]);

    const handleSearchChange = (text) => {
        setSearch(text);
        searchRef.current = text.trim();
        setCurrentPage(0);
        doSearch(text.trim(), 0, pageSize);
    };

    const fetchShops = () => {
        doSearch(searchRef.current, currentPage, pageSize);
    };

    const handleClearSearch = () => {
        setSearch('');
        searchRef.current = '';
        setCurrentPage(0);
        doSearch('', 0, pageSize);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getCategoryStyle = (category) => {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('grocery')) return { bg: '#D1FAE5', text: '#065F46' }; // Green
        if (cat.includes('electronics')) return { bg: '#DBEAFE', text: '#1E40AF' }; // Blue
        if (cat.includes('clothing')) return { bg: '#F3E8FF', text: '#6B21A8' }; // Purple
        if (cat.includes('restaurant') || cat.includes('food')) return { bg: '#FFEDD5', text: '#9A3412' }; // Orange
        if (cat.includes('pharmacy') || cat.includes('medical')) return { bg: '#FEE2E2', text: '#991B1B' }; // Red
        if (cat.includes('hardware')) return { bg: '#FEF9C3', text: '#854D0E' }; // Yellow
        if (cat.includes('book')) return { bg: '#E0E7FF', text: '#3730A3' }; // Indigo

        return { bg: '#F3F4F6', text: '#1F2937' }; // Gray (Default)
    };

    const renderShopItem = ({ item }) => {
        const catStyle = getCategoryStyle(item.category);

        return (
            <View style={styles.shopCard}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.shopName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.locationContainer}>
                            <Ionicons name="location-outline" size={12} color="#4B5563" />
                            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                        </View>
                    </View>
                    <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
                        <Text style={[styles.categoryText, { color: catStyle.text }]}>
                            {item.category}
                        </Text>
                    </View>
                </View>

                {/* Card Content */}
                <View style={styles.cardContent}>
                    {/* Shop Code */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Shop Code</Text>
                        <View style={styles.codeBadge}>
                            <Text style={styles.codeText}>{item.shop_code}</Text>
                        </View>
                    </View>

                    {/* GST */}
                    {item.gst_number && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>GST</Text>
                            <Text style={styles.infoValue}>{item.gst_number}</Text>
                        </View>
                    )}

                    {/* Owner Info Block */}
                    {item.owner && (
                        <View style={styles.ownerBlock}>
                            <View style={styles.ownerHeader}>
                                <Ionicons name="person-circle-outline" size={16} color="#374151" />
                                <Text style={styles.ownerLabel}>Owner Details</Text>
                            </View>
                            <View style={styles.ownerDetails}>
                                <Text style={styles.ownerName}>{item.owner.name}</Text>
                                <Text style={styles.ownerPhone}>{item.owner.phone}</Text>
                                <View style={styles.ownerTags}>
                                    {item.owner.verified && (
                                        <View style={[styles.miniBadge, { backgroundColor: '#D1FAE5' }]}>
                                            <Ionicons name="checkmark" size={10} color="#065F46" />
                                            <Text style={[styles.miniBadgeText, { color: '#065F46' }]}>Verified</Text>
                                        </View>
                                    )}
                                    {item.owner.flagged && (
                                        <View style={[styles.miniBadge, { backgroundColor: '#FEE2E2' }]}>
                                            <Ionicons name="flag" size={10} color="#991B1B" />
                                            <Text style={[styles.miniBadgeText, { color: '#991B1B' }]}>Flagged</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* View Details Button */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setSelectedShop(item)}
                    >
                        <Ionicons name="eye-outline" size={16} color="#374151" />
                        <Text style={styles.actionButtonText}>View Details</Text>
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                        <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                        <Text style={styles.footerText}>Created {formatDate(item.created_at)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const totalPages = Math.ceil(totalShops / pageSize);


    // Inline Detail View — renders inside AdminPanelScreen (keeps header + bottom nav)
    if (selectedShop) {
        return (
            <AdminShopDetailsScreen
                shopId={selectedShop.id}
                shopName={selectedShop.name}
                shopCategory={selectedShop.category}
                shopCode={selectedShop.shop_code}
                onBack={() => setSelectedShop(null)}
            />
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchShops(); }} />
                }
            >
                {/* Header Text */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Shop Management</Text>
                    <Text style={styles.headerSubtitle}>Manage and verify shops</Text>
                </View>

                {/* Search Card */}
                <View style={styles.searchCard}>
                    <View style={styles.cardHeaderTitleRow}>
                        <Ionicons name="storefront" size={20} color="#000" />
                        <Text style={styles.cardHeaderTitle}>Shops ({totalShops})</Text>
                    </View>

                    <View style={styles.searchRow}>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name or location..."
                                value={search}
                                onChangeText={handleSearchChange}
                                returnKeyType="search"
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={handleClearSearch}>
                                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={() => fetchShops()}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.refreshButtonText}>Refresh</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {loading && !refreshing && shops.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                ) : shops.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No shops found</Text>
                    </View>
                ) : (
                    <View style={styles.listContent}>
                        {shops.map((item) => (
                            <View key={item.id}>{renderShopItem({ item })}</View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Pagination Controls - Fixed at Bottom */}
            {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                    <TouchableOpacity
                        style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
                        onPress={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0 || loading}
                    >
                        <Ionicons name="chevron-back" size={20} color={currentPage === 0 ? '#D1D5DB' : '#4B5563'} />
                        <Text style={[styles.pageButtonText, currentPage === 0 && styles.pageButtonTextDisabled]}>Prev</Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfoText}>
                        Page {currentPage + 1} of {totalPages}
                    </Text>

                    <TouchableOpacity
                        style={[styles.pageButton, currentPage >= totalPages - 1 && styles.pageButtonDisabled]}
                        onPress={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1 || loading}
                    >
                        <Text style={[styles.pageButtonText, currentPage >= totalPages - 1 && styles.pageButtonTextDisabled]}>Next</Text>
                        <Ionicons name="chevron-forward" size={20} color={currentPage >= totalPages - 1 ? '#D1D5DB' : '#4B5563'} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    header: {
        padding: 16,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#E5E7EB',
        marginTop: 2,
    },
    searchCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
    },
    cardHeaderTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    cardHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
    },
    refreshButton: {
        backgroundColor: '#111827',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
    shopCard: {
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
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
        marginRight: 8,
    },
    shopName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    locationText: {
        fontSize: 12,
        color: '#4B5563',
        flex: 1,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    cardContent: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    infoValue: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    codeBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    codeText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        color: '#374151',
    },
    ownerBlock: {
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        marginTop: 4,
    },
    ownerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    ownerLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    ownerDetails: {
        paddingLeft: 20, // Align with text
    },
    ownerName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    ownerPhone: {
        fontSize: 12,
        color: '#6B7280',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    ownerTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    miniBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        gap: 2,
    },
    miniBadgeText: {
        fontSize: 10,
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    footerText: {
        fontSize: 10,
        color: '#6B7280',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6B7280',
        fontStyle: 'italic',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    pageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    pageButtonDisabled: {
        backgroundColor: '#F3F4F6',
        borderColor: '#F3F4F6',
    },
    pageButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4B5563',
        marginHorizontal: 4,
    },
    pageButtonTextDisabled: {
        color: '#9CA3AF',
    },
    pageInfoText: {
        fontSize: 12,
        color: '#6B7280',
    },
    actionButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    actionButtonText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default AdminShopManagement;
