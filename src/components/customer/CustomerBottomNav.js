// Customer Bottom Navigation Component - Extracted from DashboardScreen
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TabButton = ({ name, icon, label, activeTab, setActiveTab }) => (
    <TouchableOpacity
        style={styles.tabButton}
        onPress={() => setActiveTab(name)}
    >
        <View style={[styles.tabIconContainer, activeTab === name && styles.tabIconActive]}>
            <Ionicons name={icon} size={22} color={activeTab === name ? '#3B82F6' : '#666'} />
        </View>
        <Text style={[styles.tabLabel, activeTab === name && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
);

const CustomerBottomNav = ({ activeTab, setActiveTab }) => (
    <View style={styles.bottomNav}>
        <TabButton name="ledger" icon="book-outline" label="Ledger" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton name="payments" icon="card-outline" label="Payments" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton name="history" icon="time-outline" label="History" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton name="account" icon="person-outline" label="Account" activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
);

const styles = StyleSheet.create({
    // Bottom Navigation
    bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E5E5', paddingBottom: 4, paddingTop: 4 },
    tabButton: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    tabIconContainer: { padding: 6, borderRadius: 16 },
    tabIconActive: { backgroundColor: '#EBF5FF' },
    tabLabel: { fontSize: 10, color: '#666', marginTop: 2 },
    tabLabelActive: { color: '#3B82F6', fontWeight: '500' },
});

export default CustomerBottomNav;
