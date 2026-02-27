import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, shadows, spacing } from '../../../theme';
import { customerDashboardAPI, authAPI, getAPIErrorMessage } from '../../../api';

const NotificationsScreen = () => {
    const navigation = useNavigation();
    const [viewMode, setViewMode] = useState('inbox'); // 'inbox' or 'settings'
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    // Settings State
    const [pushEnabled, setPushEnabled] = useState(true);
    const [paymentAlerts, setPaymentAlerts] = useState(true);
    const [promotions, setPromotions] = useState(true);
    const [allEnabled, setAllEnabled] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchNotifications();
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const response = await authAPI.getMe();
            const user = response.data;
            setPushEnabled(user.push_enabled ?? true);
            setPaymentAlerts(user.payment_alerts_enabled ?? true);
            setPromotions(user.promotions_enabled ?? true);

            // Set "All" toggle based on individual settings
            const allOn = (user.push_enabled ?? true) &&
                (user.payment_alerts_enabled ?? true) &&
                (user.promotions_enabled ?? true);
            setAllEnabled(allOn);
        } catch (error) {
            console.error('Error fetching preferences:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await customerDashboardAPI.getNotifications();

            // Map backend data to UI format
            const mappedNotis = response.data.map(noti => ({
                id: noti.id,
                type: 'payment',
                title: noti.title || 'Payment Request',
                message: noti.message,
                time: formatTime(noti.created_at),
                unread: false, // For now since we don't track read status
                icon: 'cash-outline',
                iconBg: '#ECFDF5',
                iconColor: '#10B981',
                shopName: noti.shop_name
            }));

            setNotifications(mappedNotis);
        } catch (error) {
            console.error('Error fetching notifications:', getAPIErrorMessage(error));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString();
    };

    const toggleSwitch = async (key, value) => {
        // Update local state first for responsiveness
        let newPush = pushEnabled;
        let newAlerts = paymentAlerts;
        let newPromos = promotions;

        if (key === 'push') {
            setPushEnabled(value);
            newPush = value;
        } else if (key === 'alerts') {
            setPaymentAlerts(value);
            newAlerts = value;
        } else if (key === 'promos') {
            setPromotions(value);
            newPromos = value;
        }

        // Update "All" toggle state
        setAllEnabled(newPush && newAlerts && newPromos);

        // Sync with backend
        try {
            setSyncing(true);
            await authAPI.updateProfile({
                push_enabled: newPush,
                payment_alerts_enabled: newAlerts,
                promotions_enabled: newPromos
            });
        } catch (error) {
            console.error('Error syncing preferences:', error);
            // Revert state on failure could be added here
        } finally {
            setSyncing(false);
        }
    };

    const toggleAll = async (value) => {
        setAllEnabled(value);
        setPushEnabled(value);
        setPaymentAlerts(value);
        setPromotions(value);

        try {
            setSyncing(true);
            await authAPI.updateProfile({
                push_enabled: value,
                payment_alerts_enabled: value,
                promotions_enabled: value
            });
        } catch (error) {
            console.error('Error syncing all preferences:', error);
        } finally {
            setSyncing(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const renderNotificationItem = ({ item }) => {
        const isExpanded = expandedId === item.id;

        return (
            <TouchableOpacity
                style={[styles.notiCard, item.unread && styles.notiCardUnread]}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: item.iconBg, opacity: item.unread ? 1 : 0.6 }]}>
                    <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                <View style={styles.notiContent}>
                    <View style={styles.notiHeader}>
                        <Text style={[styles.notiTitle, item.unread && styles.notiTitleUnread]}>{item.title}</Text>
                        {item.unread && <View style={styles.unreadDot} />}
                    </View>
                    <Text
                        style={[styles.notiMsg, !item.unread && styles.notiMsgRead]}
                        numberOfLines={isExpanded ? undefined : 2}
                    >
                        {item.message}
                    </Text>
                    <View style={styles.notiFooter}>
                        <Text style={[styles.notiTime, !item.unread && { opacity: 0.6 }]}>{item.time}</Text>
                        <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={colors.gray[400]}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSettings = () => (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionLabel}>Communication Preferences</Text>
            <View style={styles.settingsGroup}>
                <View style={styles.settingRow}>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitleText}>All Notifications</Text>
                        <Text style={styles.settingSubtitleText}>Enable or disable all alert types</Text>
                    </View>
                    <Switch
                        value={allEnabled}
                        onValueChange={toggleAll}
                        trackColor={{ false: colors.gray[200], true: colors.primary.blue + '80' }}
                        thumbColor={allEnabled ? colors.primary.blue : '#fff'}
                    />
                </View>
                <View style={styles.settingRow}>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitleText}>Push Notifications</Text>
                        <Text style={styles.settingSubtitleText}>Receive alerts on your device</Text>
                    </View>
                    <Switch
                        value={pushEnabled}
                        onValueChange={(val) => toggleSwitch('push', val)}
                        trackColor={{ false: colors.gray[200], true: colors.primary.blue + '80' }}
                        thumbColor={pushEnabled ? colors.primary.blue : '#fff'}
                    />
                </View>
                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitleText}>Promotions</Text>
                        <Text style={styles.settingSubtitleText}>Offers and marketing updates</Text>
                    </View>
                    <Switch
                        value={promotions}
                        onValueChange={(val) => toggleSwitch('promos', val)}
                        trackColor={{ false: colors.gray[200], true: colors.primary.blue + '80' }}
                        thumbColor={promotions ? colors.primary.blue : '#fff'}
                    />
                </View>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Alert Categories</Text>
            <View style={styles.settingsGroup}>
                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitleText}>Payment Alerts</Text>
                        <Text style={styles.settingSubtitleText}>Due dates and received payments</Text>
                    </View>
                    <Switch
                        value={paymentAlerts}
                        onValueChange={(val) => toggleSwitch('alerts', val)}
                        trackColor={{ false: colors.gray[200], true: colors.primary.blue + '80' }}
                        thumbColor={paymentAlerts ? colors.primary.blue : '#fff'}
                    />
                </View>
            </View>

            <View style={styles.settingsNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.gray[400]} />
                <Text style={styles.settingsNoteText}>Security alerts cannot be disabled.</Text>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{viewMode === 'inbox' ? 'Notification Hub' : 'Preferences'}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setViewMode(viewMode === 'inbox' ? 'settings' : 'inbox')}
                    style={styles.modeToggle}
                >
                    <Ionicons
                        name={viewMode === 'inbox' ? "settings-outline" : "file-tray-full-outline"}
                        size={22}
                        color={colors.primary.blue}
                    />
                </TouchableOpacity>
            </View>

            {viewMode === 'inbox' ? (
                loading && !refreshing ? (
                    <View style={styles.loadingCenter}>
                        <ActivityIndicator color={colors.primary.blue} size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        renderItem={renderNotificationItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.blue]} />
                        }
                        ListHeaderComponent={() => (
                            notifications.length > 0 ? <Text style={styles.sectionLabel}>RECENT UPDATES</Text> : null
                        )}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="notifications-off-outline" size={64} color={colors.gray[200]} />
                                <Text style={styles.emptyText}>All caught up!</Text>
                                <Text style={styles.emptySubtext}>Your payment reminders will appear here.</Text>
                            </View>
                        )}
                    />
                )
            ) : renderSettings()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gray[50] },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.gray[900] },
    backButton: { padding: 4 },
    modeToggle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: colors.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Inbox Styles
    listContent: { padding: 16, paddingBottom: 40 },
    notiCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...shadows.sm,
    },
    notiCardUnread: {
        borderColor: '#E5E7EB', // Keep border identical
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    notiContent: { flex: 1 },
    notiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    notiTitle: { fontSize: 15, fontWeight: '600', color: colors.gray[800] },
    notiTitleUnread: { fontWeight: '800', color: colors.gray[900] },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary.blue },
    notiMsg: { fontSize: 13, color: colors.gray[600], lineHeight: 18, marginBottom: 8 },
    notiMsgRead: { color: colors.gray[500] },
    notiTime: { fontSize: 11, color: colors.gray[400], fontWeight: '600' },
    notiFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    // Settings Styles
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.gray[400],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
        marginLeft: 4
    },
    settingsGroup: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.gray[200],
        overflow: 'hidden',
        ...shadows.sm,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[50],
    },
    settingTextContent: { flex: 1, marginRight: 12 },
    settingTitleText: { fontSize: 15, fontWeight: '700', color: colors.gray[900], marginBottom: 3 },
    settingSubtitleText: { fontSize: 12, color: colors.gray[500] },
    settingsNote: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginLeft: 16, gap: 6 },
    settingsNoteText: { fontSize: 12, color: colors.gray[400], fontWeight: '500' },

    // Empty State
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, fontWeight: '700', color: colors.gray[400], marginTop: 16 },
    emptySubtext: { fontSize: 14, color: colors.gray[400], marginTop: 8 },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default NotificationsScreen;
