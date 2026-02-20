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
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { customerDashboardAPI } from '../../api';
import { useNavigation } from '@react-navigation/native';
import CustomerHeader from '../../components/customer/CustomerHeader';
import CustomerBottomNav from '../../components/customer/CustomerBottomNav';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import ShopLedgerDetailScreen from './ShopLedgerDetailScreen';

const CustomerDashboardScreen = () => {
    const navigation = useNavigation();
    const { user, logout, switchRole } = useAuth();
    const [activeTab, setActiveTab] = useState('ledger');
    const [ledgerData, setLedgerData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [selectedShopLedger, setSelectedShopLedger] = useState(null);


    // Filters & Export State
    const [dateFrom, setDateFrom] = useState(null);
    const [dateTo, setDateTo] = useState(null);
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [selectedShopId, setSelectedShopId] = useState('all');
    const [showShopFilterDropdown, setShowShopFilterDropdown] = useState(false);
    const [transactionType, setTransactionType] = useState('all');
    const [showTypeFilterDropdown, setShowTypeFilterDropdown] = useState(false);



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

    const formatShortDate = (dateString) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "Invalid Date";
            return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
        } catch (e) {
            return dateString || "";
        }
    };

    const formatDateDisplay = (date) => {
        if (!date) return '';
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
    };

    const getAllTransactions = () => {
        return ledgerData.reduce((acc, shop) => {
            if (shop.transactions) {
                const shopTx = shop.transactions.map(tx => ({ ...tx, shopName: shop.shop?.name, shopLocation: shop.shop?.location, shopId: shop.shop?.id }));
                return [...acc, ...shopTx];
            }
            return acc;
        }, []).sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const getFilteredTransactions = () => {
        let transactions = getAllTransactions();
        if (dateFrom) {
            const fromStart = new Date(dateFrom);
            fromStart.setHours(0, 0, 0, 0);
            transactions = transactions.filter(t => new Date(t.date) >= fromStart);
        }
        if (dateTo) {
            const toEnd = new Date(dateTo);
            toEnd.setHours(23, 59, 59, 999);
            transactions = transactions.filter(t => new Date(t.date) <= toEnd);
        }
        if (selectedShopId !== 'all') {
            transactions = transactions.filter(t => t.shopId === selectedShopId);
        }
        if (transactionType !== 'all') {
            if (transactionType === 'credit') {
                transactions = transactions.filter(t => t.type === 'credit');
            } else if (transactionType === 'payment') {
                transactions = transactions.filter(t => t.type === 'debit' || t.type === 'payment');
            }
        }
        return transactions;
    };

    const exportToPDF = async () => {
        try {
            const transactions = getFilteredTransactions();
            const now = new Date();
            const generatedDate = `${now.toLocaleDateString('en-GB')} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

            if (transactions.length === 0) {
                alert('No transactions to export for selected period');
                return;
            }

            const txRows = transactions.map(t => {
                const isPay = t.type === 'debit' || t.type === 'payment' || t.type === 'CREDIT';
                const items = t.products || t.items || [];
                const itemNames = items.map(i => i.name || 'Item').join(', ') || '-';
                const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
                const typeColor = isPay ? '#10B981' : '#DC2626';
                const typeLabel = isPay ? 'Payment' : 'Credit';
                const amountColor = isPay ? '#10B981' : '#DC2626';
                return `<tr>
                    <td>${formatShortDate(t.date)}</td>
                    <td>${t.shopName || '-'}</td>
                    <td style="color:${typeColor};font-weight:600">${typeLabel}</td>
                    <td>${itemNames}</td>
                    <td>${items.length > 0 ? totalQty : '-'}</td>
                    <td style="color:${amountColor};font-weight:600">₹${parseFloat(t.amount || 0).toFixed(2)}</td>
                </tr>`;
            }).join('');

            const html = `
            <html><head><style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #111827; font-size: 12px; }
                .header { text-align: center; margin-bottom: 24px; }
                .header h1 { font-size: 20px; color: #111827; margin-bottom: 6px; }
                .generated { color: #6B7280; font-size: 11px; margin-top: 4px; }
                .section { background: #F9FAFB; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
                .info-row { margin-bottom: 4px; font-size: 12px; color: #374151; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #F9FAFB; color: #6B7280; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 600; border-bottom: 2px solid #E5E7EB; }
                td { padding: 10px 8px; border-bottom: 1px solid #F3F4F6; font-size: 11px; }
            </style></head><body>
                <div class="header">
                    <h1>My Transaction Report</h1>
                    <div class="generated">${dateFrom || dateTo ? `Period: ${dateFrom ? formatDateDisplay(dateFrom) : 'Beginning'} to ${dateTo ? formatDateDisplay(dateTo) : 'Today'}` : 'Full History'}</div>
                    <div class="generated">Generated on: ${generatedDate}</div>
                </div>
                <div class="section">
                    <div style="font-weight: bold; margin-bottom: 6px; color: #D97706;">Customer Information</div>
                    <div class="info-row"><b>Name:</b> ${user?.name || 'Customer'}</div>
                    <div class="info-row"><b>Phone:</b> +91 ${user?.phone || 'N/A'}</div>
                </div>
                <table>
                    <tr><th>Date</th><th>Shop</th><th>Type</th><th>Items</th><th>Qty</th><th>Amount</th></tr>
                    ${txRows}
                </table>
            </body></html>`;

            const { uri } = await Print.printToFileAsync({ html });
            const fileName = `My_Report_${user?.name || 'Customer'}.pdf`;
            const fileUri = FileSystem.cacheDirectory + fileName;
            await FileSystem.moveAsync({ from: uri, to: fileUri });
            await Sharing.shareAsync(fileUri);
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Failed to generate PDF');
        }
    };

    const exportToExcel = async () => {
        try {
            const transactions = getFilteredTransactions();
            if (transactions.length === 0) {
                alert('No transactions to export');
                return;
            }

            const rows = [];
            rows.push(['My Transaction Report']);
            rows.push(['Customer:', user?.name || 'Customer']);
            rows.push(['From Date:', dateFrom ? formatDateDisplay(dateFrom) : 'All Time']);
            rows.push(['To Date:', dateTo ? formatDateDisplay(dateTo) : 'Present']);
            rows.push([]);

            rows.push(['Date', 'Shop', 'Type', 'Items', 'Quantity', 'Amount', 'Note']);
            transactions.forEach(t => {
                const isPay = t.type === 'debit' || t.type === 'payment' || t.type === 'CREDIT';
                const items = t.products || t.items || [];
                rows.push([
                    formatShortDate(t.date),
                    t.shopName || '-',
                    isPay ? 'Payment' : 'Purchase',
                    items.map(i => i.name).join(', '),
                    items.reduce((s, i) => s + (i.quantity || 1), 0),
                    parseFloat(t.amount || 0),
                    t.note || t.notes || ''
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
            const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

            const fileName = `My_Report_${user?.name || 'Customer'}.xlsx`;
            const fileUri = FileSystem.cacheDirectory + fileName;
            await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: 'base64' });
            await Sharing.shareAsync(fileUri);
        } catch (error) {
            console.error('Excel export error:', error);
            alert('Failed to generate Excel');
        }
    };


    // Summary Stats Cards for Ledger Tab
    const SummaryStatsCards = () => {
        const isOwed = (stats.totalOwed || 0) > 0;

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🏪</Text>
                    <Text style={styles.statValue}>{stats.totalShops}</Text>
                    <Text style={styles.statLabel}>Shops</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.rupeeCircle, !isOwed && { backgroundColor: '#F3F4F6' }]}>
                        <FontAwesome name="rupee" size={18} color={isOwed ? "#EF4444" : "#333"} />
                    </View>
                    <Text style={[styles.statValue, isOwed && styles.statValueRed]}>₹{Math.abs(stats.totalOwed || 0).toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Total Dues</Text>
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
    };

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
            contentContainerStyle={{ paddingBottom: 100 }}
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
                                            label = "Dues";
                                        } else if (balance > 0) {
                                            badgeStyle = styles.badgeCredit;
                                            textStyle = styles.badgeCreditText;
                                            iconColor = "#fff";
                                            label = "Credit";
                                        }

                                        return (
                                            <TouchableOpacity
                                                style={[styles.ledgerBadge, badgeStyle]}
                                                activeOpacity={0.7}
                                                onPress={() => setSelectedShopLedger(item)}
                                            >
                                                <Text style={[styles.ledgerBadgeText, textStyle]}>
                                                    {label} ₹{Math.abs(balance).toFixed(2)}
                                                </Text>
                                                <Ionicons
                                                    name="chevron-forward"
                                                    size={16}
                                                    color={iconColor}
                                                />
                                            </TouchableOpacity>
                                        );
                                    })()}
                                </View>


                            </View>
                        ))}
                    </View>
                </>
            )}
            {/* Spacer for bottom nav */}
            <View style={{ height: 70 }} />
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
            <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 100 }}>
                {(showShopFilterDropdown || showTypeFilterDropdown) && (
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 45 }}
                        onPress={() => { setShowShopFilterDropdown(false); setShowTypeFilterDropdown(false); }}
                        activeOpacity={1}
                    />
                )}
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
                                        <Text style={styles.paymentOweText}>Dues: ₹{Math.abs(item.customer?.balance || 0).toFixed(2)}</Text>
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

                {/* Filter & Export Section */}
                <View style={[styles.filterExportCard, { marginBottom: 20 }]}>
                    <View style={styles.filterHeader}>
                        <View style={styles.filterTitleRow}>
                            <Ionicons name="filter-outline" size={18} color="#374151" />
                            <Text style={styles.filterSectionTitle}>Filters & Export</Text>
                        </View>
                        <View style={styles.exportButtons}>
                            <TouchableOpacity style={styles.pdfBtn} onPress={exportToPDF}>
                                <Ionicons name="document-text-outline" size={14} color="#EF4444" />
                                <Text style={styles.pdfBtnText}>PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.excelBtn} onPress={exportToExcel}>
                                <Ionicons name="grid-outline" size={14} color="#10B981" />
                                <Text style={styles.excelBtnText}>Excel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.dateFiltersRow}>
                        <View style={styles.dateFilterItem}>
                            <Text style={styles.filterLabel}>From Date</Text>
                            <TouchableOpacity
                                style={styles.dateInputContainer}
                                onPress={() => setShowFromDatePicker(true)}
                            >
                                <Text style={[styles.dateInput, !dateFrom && { color: '#9CA3AF' }]}>
                                    {dateFrom ? formatDateDisplay(dateFrom) : 'dd-mm-yyyy'}
                                </Text>
                                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.dateFilterItem}>
                            <Text style={styles.filterLabel}>To Date</Text>
                            <TouchableOpacity
                                style={styles.dateInputContainer}
                                onPress={() => setShowToDatePicker(true)}
                            >
                                <Text style={[styles.dateInput, !dateTo && { color: '#9CA3AF' }]}>
                                    {dateTo ? formatDateDisplay(dateTo) : 'dd-mm-yyyy'}
                                </Text>
                                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>


                    {/* Shop Filter */}
                    <View style={[styles.typeFilterContainer, { marginTop: 12, zIndex: 60 }]}>
                        <Text style={styles.filterLabel}>Filter by Shop</Text>
                        <TouchableOpacity
                            style={styles.typeDropdown}
                            onPress={() => { setShowShopFilterDropdown(!showShopFilterDropdown); setShowTypeFilterDropdown(false); }}
                        >
                            <Text style={styles.typeDropdownText}>
                                {selectedShopId === 'all'
                                    ? 'All Shops'
                                    : ledgerData.find(item => item.shop?.id === selectedShopId)?.shop?.name || 'Selected'}
                            </Text>
                            <Ionicons name={showShopFilterDropdown ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
                        </TouchableOpacity>

                        {showShopFilterDropdown && (
                            <ScrollView
                                style={[styles.customerDetailDropdownOptions, { maxHeight: 200 }]}
                                nestedScrollEnabled={true}
                            >
                                <TouchableOpacity
                                    style={[styles.customerDetailDropdownOption, selectedShopId === 'all' && styles.customerDetailDropdownOptionActive]}
                                    onPress={() => { setSelectedShopId('all'); setShowShopFilterDropdown(false); }}
                                >
                                    <Text style={[styles.customerDetailDropdownOptionText, selectedShopId === 'all' && styles.customerDetailDropdownOptionTextActive]}>All Shops</Text>
                                    {selectedShopId === 'all' && <Ionicons name="checkmark" size={16} color="#2563EB" />}
                                </TouchableOpacity>
                                {ledgerData.map((item) => (
                                    <TouchableOpacity
                                        key={item.shop?.id}
                                        style={[styles.customerDetailDropdownOption, selectedShopId === item.shop?.id && styles.customerDetailDropdownOptionActive]}
                                        onPress={() => { setSelectedShopId(item.shop?.id); setShowShopFilterDropdown(false); }}
                                    >
                                        <Text style={[styles.customerDetailDropdownOptionText, selectedShopId === item.shop?.id && styles.customerDetailDropdownOptionTextActive]}>
                                            {item.shop?.name}
                                        </Text>
                                        {selectedShopId === item.shop?.id && <Ionicons name="checkmark" size={16} color="#2563EB" />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Transaction Type Filter */}
                    <View style={[styles.typeFilterContainer, { marginTop: 12, zIndex: showTypeFilterDropdown ? 50 : 40 }]}>
                        <Text style={styles.filterLabel}>Transaction Type</Text>
                        <TouchableOpacity
                            style={styles.typeDropdown}
                            onPress={() => { setShowTypeFilterDropdown(!showTypeFilterDropdown); setShowShopFilterDropdown(false); }}
                        >
                            <Text style={styles.typeDropdownText}>
                                {transactionType === 'all' ? 'All Transactions' : transactionType === 'credit' ? 'Credits Only' : 'Payments Only'}
                            </Text>
                            <Ionicons name={showTypeFilterDropdown ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
                        </TouchableOpacity>

                        {showTypeFilterDropdown && (
                            <ScrollView
                                style={[styles.customerDetailDropdownOptions, { maxHeight: 200 }]}
                                nestedScrollEnabled={true}
                            >
                                <TouchableOpacity
                                    style={[styles.customerDetailDropdownOption, transactionType === 'all' && styles.customerDetailDropdownOptionActive]}
                                    onPress={() => { setTransactionType('all'); setShowTypeFilterDropdown(false); }}
                                >
                                    <Text style={[styles.customerDetailDropdownOptionText, transactionType === 'all' && styles.customerDetailDropdownOptionTextActive]}>All Transactions</Text>
                                    {transactionType === 'all' && <Ionicons name="checkmark" size={16} color="#2563EB" />}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.customerDetailDropdownOption, transactionType === 'credit' && styles.customerDetailDropdownOptionActive]}
                                    onPress={() => { setTransactionType('credit'); setShowTypeFilterDropdown(false); }}
                                >
                                    <Text style={[styles.customerDetailDropdownOptionText, transactionType === 'credit' && styles.customerDetailDropdownOptionTextActive]}>Credits Only</Text>
                                    {transactionType === 'credit' && <Ionicons name="checkmark" size={16} color="#2563EB" />}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.customerDetailDropdownOption, transactionType === 'payment' && styles.customerDetailDropdownOptionActive]}
                                    onPress={() => { setTransactionType('payment'); setShowTypeFilterDropdown(false); }}
                                >
                                    <Text style={[styles.customerDetailDropdownOptionText, transactionType === 'payment' && styles.customerDetailDropdownOptionTextActive]}>Payments Only</Text>
                                    {transactionType === 'payment' && <Ionicons name="checkmark" size={16} color="#2563EB" />}
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView >
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
            <ScrollView
                style={styles.tabContent}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
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
                <View style={{ height: 10 }} />
            </ScrollView >
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

                <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('EditProfile')}>
                    <Ionicons name="person-outline" size={22} color="#4B5563" style={{ marginRight: 12 }} />
                    <Text style={styles.settingText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Notifications')}>
                    <Ionicons name="notifications-outline" size={22} color="#4B5563" style={{ marginRight: 12 }} />
                    <Text style={styles.settingText}>Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]} onPress={() => navigation.navigate('PrivacySecurity')}>
                    <Ionicons name="lock-closed-outline" size={22} color="#4B5563" style={{ marginRight: 12 }} />
                    <Text style={styles.settingText}>Privacy & Security</Text>
                </TouchableOpacity>


            </View>

            {/* Help & About Section */}
            <View style={styles.settingsCard}>
                <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('HelpSupport')}>
                    <Ionicons name="help-circle-outline" size={22} color="#4B5563" style={{ marginRight: 12 }} />
                    <Text style={styles.settingText}>Help & Support</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('About')}>
                    <Ionicons name="information-circle-outline" size={22} color="#4B5563" style={{ marginRight: 12 }} />
                    <Text style={styles.settingText}>About ShopMunim</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]} onPress={logout}>
                    <Ionicons name="log-out-outline" size={22} color="#EF4444" style={{ marginRight: 12 }} />
                    <Text style={[styles.settingText, styles.logoutText]}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerBrand}>ShopMunim</Text>
                <Text style={styles.footerVersion}>Version 1.0.0</Text>
                <Text style={styles.footerTagline}>Digital Credit & Payment Ledger</Text>
                <Text style={styles.footerCopyright}>©2026 DEC24 INNOVATIONS PVT LTD. All Rights Reserved.</Text>

            </View>
            {/* <View style={{ height: 50 }} /> */}
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



    console.log('Rendering CustomerDashboard', { activeTab, ledgerDataLength: ledgerData.length });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <CustomerHeader
                user={user}
                logout={logout}
                showRoleDropdown={showRoleDropdown}
                setShowRoleDropdown={setShowRoleDropdown}
                handleRoleSwitch={handleRoleSwitch}
            />
            <View style={styles.content}>{renderContent()}</View>
            <CustomerBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* DateTime Pickers */}
            {showFromDatePicker && (
                <DateTimePicker
                    value={dateFrom || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                        setShowFromDatePicker(false);
                        if (event.type === 'set' && selectedDate) {
                            setDateFrom(selectedDate);
                            // Auto-correct To Date if From > To
                            if (dateTo && selectedDate > dateTo) {
                                setDateTo(selectedDate);
                            }
                        } else if (event.type === 'dismissed') {
                            setDateFrom(null);
                        }
                    }}
                    positiveButton={{ label: 'Set', textColor: '#2563EB' }}
                    negativeButton={{ label: 'Clear', textColor: '#EF4444' }}
                />
            )}
            {showToDatePicker && (
                <DateTimePicker
                    value={dateTo || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                        setShowToDatePicker(false);
                        if (event.type === 'set' && selectedDate) {
                            setDateTo(selectedDate);
                            // Auto-correct From Date if To < From
                            if (dateFrom && selectedDate < dateFrom) {
                                setDateFrom(selectedDate);
                            }
                        } else if (event.type === 'dismissed') {
                            setDateTo(null);
                        }
                    }}
                    positiveButton={{ label: 'Set', textColor: '#2563EB' }}
                    negativeButton={{ label: 'Clear', textColor: '#EF4444' }}
                />
            )}

            {selectedShopLedger && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: '#fff' }]}>
                    <ShopLedgerDetailScreen
                        customer={selectedShopLedger.customer}
                        shopId={selectedShopLedger.shop?.id}
                        initialShopDetails={selectedShopLedger.shop}
                        initialTransactions={selectedShopLedger.transactions}
                        onBack={() => setSelectedShopLedger(null)}
                        activeTab={activeTab}
                        onTabChange={(tab) => {
                            setActiveTab(tab);
                            setSelectedShopLedger(null);
                        }}
                    />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' }, // Changed background to white as per screenshot often implies cleaner look, but let's keep it clean
    content: { flex: 1, backgroundColor: '#F9FAFB' }, // Content background



    // Tab Content
    tabContent: { flex: 1, padding: 16 },

    // Summary Stats Cards
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
    statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E5' },
    statEmoji: { fontSize: 24, marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    statValueRed: { color: '#EF4444' },
    statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
    rupeeCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },

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

    settingText: { flex: 1, fontSize: 15, color: '#333' },
    logoutText: { color: '#EF4444' },

    // Footer
    accountScrollContent: { flexGrow: 1, paddingBottom: 100 },
    footer: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 'auto', marginBottom: 16 },
    footerBrand: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6' },
    footerVersion: { fontSize: 12, color: '#999', marginTop: 4 },
    footerTagline: { fontSize: 12, color: '#999', marginTop: 2 },
    footerCopyright: { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },


    // Filter & Export
    filterExportCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E5E5', marginBottom: 20 },
    filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    filterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 4 },
    filterSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    exportButtons: { flexDirection: 'row', gap: 8 },
    pdfBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#FEE2E2', gap: 4 },
    excelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#D1FAE5', gap: 4 },
    pdfBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
    excelBtnText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
    dateFiltersRow: { flexDirection: 'row', gap: 12 },
    dateFilterItem: { flex: 1 },
    filterLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginBottom: 6 },
    dateInputContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
    dateInput: { fontSize: 13, color: '#374151' },
    typeFilterContainer: { marginTop: 4 },
    typeDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
    typeDropdownText: { fontSize: 13, color: '#111827' },
    customerDetailDropdownOptions: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginTop: 4, zIndex: 100, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    customerDetailDropdownOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    customerDetailDropdownOptionActive: { backgroundColor: '#F9FAFB' },
    customerDetailDropdownOptionText: { fontSize: 13, color: '#374151' },
    customerDetailDropdownOptionTextActive: { color: '#2563EB', fontWeight: '600' },


});

export default CustomerDashboardScreen;
