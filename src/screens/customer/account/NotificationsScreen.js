import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, shadows, spacing } from '../../../theme';

const NotificationsScreen = () => {
    const navigation = useNavigation();
    const [viewMode, setViewMode] = useState('inbox'); // 'inbox' or 'settings'

    // Settings State
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [paymentAlerts, setPaymentAlerts] = useState(true);
    const [promotions, setPromotions] = useState(false);

    // Mock Notifications Data
    const mockNotifications = [
        {
            id: '1',
            type: 'payment',
            title: 'Payment Received',
            message: 'You received ₹1,200 from Ramesh Kumar for INV-882.',
            time: '2 mins ago',
            unread: true,
            icon: 'cash-outline',
            iconBg: '#ECFDF5',
            iconColor: '#10B981'
        },
        {
            id: '2',
            type: 'security',
            title: 'New Login Detected',
            message: 'A new login was detected from a Windows device in Mumbai.',
            time: '1 hour ago',
            unread: true,
            icon: 'shield-outline',
            iconBg: '#FEF2F2',
            iconColor: '#EF4444'
        },
        {
            id: '3',
            type: 'promo',
            title: 'Weekend Offer! 🚀',
            message: 'Get 20% off on all credit reports this weekend only.',
            time: '5 hours ago',
            unread: false,
            icon: 'megaphone-outline',
            iconBg: '#F0F9FF',
            iconColor: '#3B82F6'
        },
        {
            id: '4',
            type: 'update',
            title: 'Shop Policy Updated',
            message: 'Mittal General Store has updated their credit terms.',
            time: 'Yesterday',
            unread: false,
            icon: 'document-text-outline',
            iconBg: '#F5F3FF',
            iconColor: '#8B5CF6'
        }
    ];

    const toggleSwitch = (value, setter) => {
        setter(value);
    };

    const renderNotificationItem = ({ item }) => (
        <TouchableOpacity style={[styles.notiCard, item.unread && styles.notiCardUnread]}>
            <View style={[styles.iconContainer, { backgroundColor: item.iconBg, opacity: item.unread ? 1 : 0.6 }]}>
                <Ionicons name={item.icon} size={22} color={item.iconColor} />
            </View>
            <View style={styles.notiContent}>
                <View style={styles.notiHeader}>
                    <Text style={[styles.notiTitle, item.unread && styles.notiTitleUnread]}>{item.title}</Text>
                    {item.unread && <View style={styles.unreadDot} />}
                </View>
                <Text style={[styles.notiMsg, !item.unread && styles.notiMsgRead]} numberOfLines={2}>{item.message}</Text>
                <Text style={[styles.notiTime, !item.unread && { opacity: 0.6 }]}>{item.time}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderSettings = () => (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionLabel}>Communication Preferences</Text>
            <View style={styles.settingsGroup}>
                <View style={styles.settingRow}>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitleText}>Push Notifications</Text>
                        <Text style={styles.settingSubtitleText}>Receive alerts on your device</Text>
                    </View>
                    <Switch
                        value={pushEnabled}
                        onValueChange={(val) => toggleSwitch(val, setPushEnabled)}
                        trackColor={{ false: colors.gray[200], true: colors.primary.blue + '80' }}
                        thumbColor={pushEnabled ? colors.primary.blue : '#fff'}
                    />
                </View>
                <View style={styles.settingRow}>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitleText}>Email Notifications</Text>
                        <Text style={styles.settingSubtitleText}>Receive updates via your email</Text>
                    </View>
                    <Switch
                        value={emailEnabled}
                        onValueChange={(val) => toggleSwitch(val, setEmailEnabled)}
                        trackColor={{ false: colors.gray[200], true: colors.primary.blue + '80' }}
                        thumbColor={emailEnabled ? colors.primary.blue : '#fff'}
                    />
                </View>
                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.settingTextContent}>
                        <Text style={styles.settingTitleText}>Promotions</Text>
                        <Text style={styles.settingSubtitleText}>Offers and marketing updates</Text>
                    </View>
                    <Switch
                        value={promotions}
                        onValueChange={(val) => toggleSwitch(val, setPromotions)}
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
                        onValueChange={(val) => toggleSwitch(val, setPaymentAlerts)}
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
        <SafeAreaView style={styles.container} edges={['top']}>
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
                <FlatList
                    data={mockNotifications}
                    renderItem={renderNotificationItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={() => (
                        <Text style={styles.sectionLabel}>RECENT UPDATES</Text>
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color={colors.gray[200]} />
                            <Text style={styles.emptyText}>All caught up!</Text>
                            <Text style={styles.emptySubtext}>Your notifications will appear here.</Text>
                        </View>
                    )}
                />
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
});

export default NotificationsScreen;
