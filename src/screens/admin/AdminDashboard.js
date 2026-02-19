import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI, getAPIErrorMessage } from '../../api';

const { width } = Dimensions.get('window');

const AdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getDashboard();
            setDashboardData(response.data);
            setError('');
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError(getAPIErrorMessage(err));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    if (error && !dashboardData) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Error Loading Dashboard</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <TouchableOpacity onPress={fetchDashboardData} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Stats Card Component
    const StatCard = ({ icon, title, value, subtext, color, iconColor }) => (
        <View style={styles.statCard}>
            <View style={styles.statHeader}>
                <Text style={styles.statTitle}>{title}</Text>
                <Ionicons name={icon} size={16} color={iconColor || "#6B7280"} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statSubtext}>{subtext}</Text>
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
            {/* Header Text (No Card) - Matches Web Mobile */}
            <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSubtitle}>Overview of platform statistics</Text>
            </View>

            {/* Metrics Grid */}
            <View style={styles.gridContainer}>
                <StatCard
                    title="Users"
                    icon="people-outline"
                    value={dashboardData?.total_users || 0}
                    subtext={`+${dashboardData?.new_users_this_week || 0} this week`}
                    iconColor="#6B7280"
                />
                <StatCard
                    title="Shops"
                    icon="storefront-outline"
                    value={dashboardData?.total_shops || 0}
                    subtext={`${dashboardData?.active_shops || 0} active`}
                    iconColor="#6B7280"
                />
                <StatCard
                    title="Customers"
                    icon="person-add-outline"
                    value={dashboardData?.total_customers || 0}
                    subtext="All shops"
                    iconColor="#6B7280"
                />
                <StatCard
                    title="₹ Amount"
                    icon="cash-outline"
                    value={formatCurrency(dashboardData?.total_sales || 0)}
                    subtext="Total Sales"
                    iconColor="#10B981"
                />
            </View>

            {/* Daily Transactions Card */}
            <View style={styles.fullWidthCard}>
                <View style={styles.cardHeader}>
                    <Ionicons name="cart-outline" size={20} color="#1F2937" />
                    <Text style={styles.cardTitle}>Today's Transactions</Text>
                </View>
                <Text style={styles.cardDescription}>Transactions processed today</Text>

                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Count</Text>
                    <Text style={styles.rowValue}>{dashboardData?.daily_transactions?.count || 0}</Text>
                </View>
                <View style={[styles.row, styles.borderBottom]}>
                    <Text style={styles.rowLabel}>Amount</Text>
                    <Text style={[styles.rowValue, { color: '#2563EB' }]}>
                        {formatCurrency(dashboardData?.daily_transactions?.amount || 0)}
                    </Text>
                </View>
            </View>

            {/* Platform Activity Card */}
            <View style={styles.fullWidthCard}>
                <View style={styles.cardHeader}>
                    <Ionicons name="trending-up-outline" size={20} color="#1F2937" />
                    <Text style={styles.cardTitle}>Platform Activity</Text>
                </View>
                <Text style={styles.cardDescription}>Key platform metrics</Text>

                <View style={styles.row}>
                    <Text style={styles.rowLabel}>Active Shops</Text>
                    <Text style={styles.rowValue}>{dashboardData?.active_shops || 0}</Text>
                </View>
                <View style={[styles.row, styles.borderBottom]}>
                    <Text style={styles.rowLabel}>New Users (7d)</Text>
                    <Text style={[styles.rowValue, { color: '#059669' }]}>
                        +{dashboardData?.new_users_this_week || 0}
                    </Text>
                </View>
            </View>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    contentContainer: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    errorMessage: {
        fontSize: 14,
        color: '#fff',
        marginVertical: 10,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
    },
    headerTextContainer: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#E5E7EB', // Gray-200
        marginTop: 4,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        width: (width - 40) / 2, // 2 columns with spacing
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
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#111827',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    statSubtext: {
        fontSize: 10,
        color: '#6B7280',
    },
    fullWidthCard: {
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
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    cardDescription: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    borderBottom: {
        borderBottomWidth: 0, // Last item usually no border or handled by container
    },
    rowLabel: {
        fontSize: 14,
        color: '#4B5563',
    },
    rowValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
});

export default AdminDashboard;
