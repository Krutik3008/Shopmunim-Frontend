import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    ScrollView,
    RefreshControl,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI, getAPIErrorMessage } from '../../api';

const COL_WIDTHS = {
    user: 140,
    role: 140,
    status: 215,
    joined: 120,
    actions: 225,
};
const TABLE_WIDTH = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0);

const AdminUserManagement = ({ onRefreshStats }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [totalUsers, setTotalUsers] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [updatingUser, setUpdatingUser] = useState(null);
    const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
    const searchRef = useRef('');
    const isFirstRender = useRef(true);

    const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30];

    const doSearch = async (searchText, page, size) => {
        try {
            setLoading(true);
            const response = await adminAPI.getUsers(searchText, page * size, size);
            setUsers(response.data.users || []);
            setTotalUsers(response.data.total || 0);
        } catch (err) {
            console.error('Users fetch error:', err);
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
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        doSearch(searchRef.current, currentPage, pageSize);
    }, [currentPage]);

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(0);
        doSearch(searchRef.current, 0, newSize);
    };

    const handleSearchChange = (text) => {
        setSearch(text);
        searchRef.current = text.trim();
        setCurrentPage(0);
        doSearch(text.trim(), 0, pageSize);
    };

    const fetchUsers = () => {
        doSearch(searchRef.current, currentPage, pageSize);
        if (onRefreshStats) onRefreshStats();
    };

    const handleSearchSubmit = () => {
        // Handled by live search
    };

    const handleClearSearch = () => {
        setSearch('');
        searchRef.current = '';
        setCurrentPage(0);
        doSearch('', 0, pageSize);
    };

    const updateUserStatus = async (userId, updates) => {
        try {
            setUpdatingUser(userId);
            await adminAPI.updateUserStatus(userId, updates);
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, ...updates } : user
                )
            );
            Alert.alert('Success', 'User status updated');
        } catch (err) {
            console.error('User update error:', err);
            Alert.alert('Error', getAPIErrorMessage(err));
        } finally {
            setUpdatingUser(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getRoleBadgeStyle = (role) => {
        switch (role) {
            case 'admin': return { bg: '#FEE2E2', text: '#991B1B' };
            case 'shop_owner': return { bg: '#DBEAFE', text: '#1E40AF' };
            case 'customer': return { bg: '#D1FAE5', text: '#065F46' };
            default: return { bg: '#F3F4F6', text: '#1F2937' };
        }
    };

    const totalPages = Math.ceil(totalUsers / pageSize);

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.containerContent}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => {
                    setShowPageSizeDropdown(false);
                    Keyboard.dismiss();
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>User Management</Text>
                    <Text style={styles.headerSubtitle}>Manage and verify platform users</Text>
                </View>

                {/* Search Card */}
                <View style={styles.searchCard}>
                    <View style={styles.cardHeaderTitleRow}>
                        <Ionicons name="people" size={20} color="#000" />
                        <Text style={styles.cardHeaderTitle}>Users ({totalUsers})</Text>
                    </View>

                    <View style={styles.searchRow}>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name or phone..."
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
                            onPress={() => fetchUsers()}
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

                {/* Horizontally Scrollable Table */}
                <View style={styles.tableWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={{ width: TABLE_WIDTH }}>
                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <View style={[styles.headerCell, { width: COL_WIDTHS.user }]}>
                                    <Text style={styles.headerText}>USER</Text>
                                </View>
                                <View style={[styles.headerCell, { width: COL_WIDTHS.role }]}>
                                    <Text style={styles.headerText}>ROLE</Text>
                                </View>
                                <View style={[styles.headerCell, { width: COL_WIDTHS.status }]}>
                                    <Text style={styles.headerText}>STATUS</Text>
                                </View>
                                <View style={[styles.headerCell, { width: COL_WIDTHS.joined }]}>
                                    <Text style={styles.headerText}>JOINED</Text>
                                </View>
                                <View style={[styles.headerCell, { width: COL_WIDTHS.actions }]}>
                                    <Text style={styles.headerText}>ACTIONS</Text>
                                </View>
                            </View>

                            {/* Table Body */}
                            {loading && users.length === 0 ? (
                                <View style={styles.centerContainer}>
                                    <ActivityIndicator size="large" color="#7C3AED" />
                                </View>
                            ) : users.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No users found</Text>
                                </View>
                            ) : (
                                users.map((item) => {
                                    const roleStyle = getRoleBadgeStyle(item.active_role);
                                    const isUpdating = updatingUser === item.id;
                                    return (
                                        <View key={item.id} style={styles.tableRow}>
                                            {/* User Column */}
                                            <View style={[styles.tableCell, { width: COL_WIDTHS.user }]}>
                                                <Text style={styles.userName}>{item.name}</Text>
                                                <Text style={styles.userPhone}>{item.phone}</Text>
                                            </View>

                                            {/* Role Column */}
                                            <View style={[styles.tableCell, { width: COL_WIDTHS.role }]}>
                                                <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                                                    <Text style={[styles.roleBadgeText, { color: roleStyle.text }]}>
                                                        {item.active_role === 'shop_owner' ? 'Shop Owner' :
                                                            item.active_role === 'admin' ? 'Admin' : 'Customer'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Status Column */}
                                            <View style={[styles.tableCell, { width: COL_WIDTHS.status }]}>
                                                <View style={styles.statusCellContent}>
                                                    {item.verified && (
                                                        <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                                                            <Ionicons name="checkmark-circle" size={12} color="#065F46" />
                                                            <Text style={[styles.statusText, { color: '#065F46' }]}>Verified</Text>
                                                        </View>
                                                    )}
                                                    {item.flagged && (
                                                        <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                                                            <Ionicons name="flag" size={12} color="#991B1B" />
                                                            <Text style={[styles.statusText, { color: '#991B1B' }]}>Flagged</Text>
                                                        </View>
                                                    )}
                                                    {!item.verified && !item.flagged && (
                                                        <View style={[styles.statusBadge, { backgroundColor: '#F3F4F6' }]}>
                                                            <Text style={[styles.statusText, { color: '#4B5563' }]}>Pending</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>

                                            {/* Joined Column */}
                                            <View style={[styles.tableCell, { width: COL_WIDTHS.joined }]}>
                                                <Text style={styles.infoValue}>{formatDate(item.created_at)}</Text>
                                            </View>

                                            {/* Actions Column */}
                                            <View style={[styles.tableCell, { width: COL_WIDTHS.actions }]}>
                                                <View style={styles.actionsContainer}>
                                                    {isUpdating ? (
                                                        <ActivityIndicator size="small" color="#7C3AED" />
                                                    ) : (
                                                        <>
                                                            {!item.verified ? (
                                                                <TouchableOpacity
                                                                    style={[styles.actionButton, styles.outlineButtonGreen]}
                                                                    onPress={() => updateUserStatus(item.id, { verified: true })}
                                                                >
                                                                    <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                                                                    <Text style={styles.outlineButtonTextGreen}>Verify</Text>
                                                                </TouchableOpacity>
                                                            ) : (
                                                                <TouchableOpacity
                                                                    style={[styles.actionButton, styles.outlineButton]}
                                                                    onPress={() => updateUserStatus(item.id, { verified: false })}
                                                                >
                                                                    <Ionicons name="close-circle-outline" size={16} color="#6B7280" />
                                                                    <Text style={styles.outlineButtonText}>Unverify</Text>
                                                                </TouchableOpacity>
                                                            )}

                                                            {!item.flagged ? (
                                                                <TouchableOpacity
                                                                    style={[styles.actionButton, styles.outlineButtonRed]}
                                                                    onPress={() => updateUserStatus(item.id, { flagged: true })}
                                                                >
                                                                    <Ionicons name="flag-outline" size={16} color="#DC2626" />
                                                                    <Text style={styles.outlineButtonTextRed}>Flag</Text>
                                                                </TouchableOpacity>
                                                            ) : (
                                                                <TouchableOpacity
                                                                    style={[styles.actionButton, styles.outlineButtonGreen]}
                                                                    onPress={() => updateUserStatus(item.id, { flagged: false })}
                                                                >
                                                                    <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                                                                    <Text style={styles.outlineButtonTextGreen}>Unflag</Text>
                                                                </TouchableOpacity>
                                                            )}
                                                        </>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </ScrollView>
                </View>

                {/* Pagination Controls */}
                <View style={styles.paginationContainer}>
                    {/* Top Row: Info + Page Size Selector */}
                    <View style={styles.paginationTopRow}>
                        <Text style={styles.paginationInfoText}>
                            Showing {users.length === 0 ? 0 : currentPage * pageSize + 1} to{' '}
                            {Math.min((currentPage + 1) * pageSize, totalUsers)} of{' '}
                            <Text style={styles.paginationInfoBold}>{totalUsers} users</Text>
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
                                                onPress={() => {
                                                    handlePageSizeChange(size);
                                                    setShowPageSizeDropdown(false);
                                                }}
                                            >
                                                <Text style={[styles.pageSizeDropdownItemText, pageSize === size && styles.pageSizeDropdownItemTextActive]}>{size}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.paginationDivider} />

                    {/* Bottom Row: Previous / Page Info / Next */}
                    <View style={styles.paginationBottomRow}>
                        <TouchableOpacity
                            style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
                            onPress={() => setCurrentPage(Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0 || loading}
                        >
                            <Ionicons name="chevron-back" size={14} color={currentPage === 0 ? '#D1D5DB' : '#374151'} />
                            <Text style={[styles.pageButtonText, currentPage === 0 && styles.pageButtonTextDisabled]}>Previous</Text>
                        </TouchableOpacity>

                        <View style={styles.pageInfoBox}>
                            <Text style={styles.pageInfoLabel}>Page</Text>
                            <Text style={styles.pageInfoNumber}>{currentPage + 1} of {Math.max(1, Math.ceil(totalUsers / pageSize))}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.pageButton, currentPage >= Math.ceil(totalUsers / pageSize) - 1 && styles.pageButtonDisabled]}
                            onPress={() => setCurrentPage(Math.min(Math.ceil(totalUsers / pageSize) - 1, currentPage + 1))}
                            disabled={currentPage >= Math.ceil(totalUsers / pageSize) - 1 || loading}
                        >
                            <Text style={[styles.pageButtonText, currentPage >= Math.ceil(totalUsers / pageSize) - 1 && styles.pageButtonTextDisabled]}>Next</Text>
                            <Ionicons name="chevron-forward" size={14} color={currentPage >= Math.ceil(totalUsers / pageSize) - 1 ? '#D1D5DB' : '#374151'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    containerContent: {
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
        marginBottom: 12,
        gap: 8,
    },
    cardHeaderTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    searchRow: {
        flexDirection: 'row',
        gap: 8,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 6,
        paddingHorizontal: 10,
        height: 40,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
    },
    refreshButton: {
        backgroundColor: '#111827',
        borderRadius: 6,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
    },
    refreshButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    // Table Styles
    tableWrapper: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 2,
        borderBottomColor: '#E5E7EB',
        height: 48,
        alignItems: 'center',
    },
    headerCell: {
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    headerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        minHeight: 80,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    tableCell: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        justifyContent: 'center',
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    userPhone: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#374151',
    },
    statusCellContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 5,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        gap: 4,
    },
    outlineButton: {
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    outlineButtonGreen: {
        borderColor: '#D1FAE5',
        backgroundColor: '#fff',
    },
    outlineButtonRed: {
        borderColor: '#FEE2E2',
        backgroundColor: '#fff',
    },
    outlineButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },
    outlineButtonTextGreen: {
        fontSize: 12,
        fontWeight: '500',
        color: '#059669',
    },
    outlineButtonTextRed: {
        fontSize: 12,
        fontWeight: '500',
        color: '#DC2626',
    },
    centerContainer: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#6B7280',
        fontStyle: 'italic',
    },
    paginationContainer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 12,
        marginBottom: 16,
        marginTop: 12,
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
        backgroundColor: '#F3F4F6',
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
});

export default AdminUserManagement;
