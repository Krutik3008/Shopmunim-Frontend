import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../../theme';

const NotificationsScreen = () => {
    const navigation = useNavigation();
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [paymentAlerts, setPaymentAlerts] = useState(true);
    const [promotions, setPromotions] = useState(false);

    const toggleSwitch = (value, setter) => {
        setter(value);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>
                    <View style={styles.row}>
                        <View style={styles.rowText}>
                            <Text style={styles.rowTitle}>Push Notifications</Text>
                            <Text style={styles.rowSubtitle}>Receive alerts on your device</Text>
                        </View>
                        <Switch
                            value={pushEnabled}
                            onValueChange={(val) => toggleSwitch(val, setPushEnabled)}
                            trackColor={{ false: colors.gray[300], true: colors.primary.blue + '80' }} // adding transparency
                            thumbColor={pushEnabled ? colors.primary.blue : colors.gray[100]}
                        />
                    </View>
                    <View style={styles.row}>
                        <View style={styles.rowText}>
                            <Text style={styles.rowTitle}>Email Notifications</Text>
                            <Text style={styles.rowSubtitle}>Receive updates via email</Text>
                        </View>
                        <Switch
                            value={emailEnabled}
                            onValueChange={(val) => toggleSwitch(val, setEmailEnabled)}
                            trackColor={{ false: colors.gray[300], true: colors.primary.blue + '80' }}
                            thumbColor={emailEnabled ? colors.primary.blue : colors.gray[100]}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Types</Text>
                    <View style={styles.row}>
                        <View style={styles.rowText}>
                            <Text style={styles.rowTitle}>Payment Alerts</Text>
                            <Text style={styles.rowSubtitle}>When a payment is due or received</Text>
                        </View>
                        <Switch
                            value={paymentAlerts}
                            onValueChange={(val) => toggleSwitch(val, setPaymentAlerts)}
                            trackColor={{ false: colors.gray[300], true: colors.primary.blue + '80' }}
                            thumbColor={paymentAlerts ? colors.primary.blue : colors.gray[100]}
                        />
                    </View>
                    <View style={styles.row}>
                        <View style={styles.rowText}>
                            <Text style={styles.rowTitle}>Promotions & Offers</Text>
                            <Text style={styles.rowSubtitle}>New deals from connected shops</Text>
                        </View>
                        <Switch
                            value={promotions}
                            onValueChange={(val) => toggleSwitch(val, setPromotions)}
                            trackColor={{ false: colors.gray[300], true: colors.primary.blue + '80' }}
                            thumbColor={promotions ? colors.primary.blue : colors.gray[100]}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gray[50] },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.gray[900] },
    backButton: { padding: 4 },
    content: { flex: 1, padding: 20 },
    section: { marginBottom: 32 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.gray[500],
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.gray[200],
    },
    rowText: { flex: 1, marginRight: 16 },
    rowTitle: { fontSize: 16, fontWeight: '600', color: colors.gray[900], marginBottom: 4 },
    rowSubtitle: { fontSize: 13, color: colors.gray[500] },
});

export default NotificationsScreen;
