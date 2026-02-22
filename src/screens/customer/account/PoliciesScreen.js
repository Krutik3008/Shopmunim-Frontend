import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, borderRadius, fontSize } from '../../../theme';

const PoliciesScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { type } = route.params || { type: 'privacy' }; // 'privacy' or 'terms'

    const isPrivacy = type === 'privacy';
    const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';

    const renderContent = () => {
        if (isPrivacy) {
            return (
                <View style={styles.section}>
                    <Text style={styles.policyTitle}>1. Data Collection</Text>
                    <Text style={styles.policyText}>
                        We collect information necessary for ledger management, including your name, phone number, and transaction history with connected shops.
                    </Text>

                    <Text style={styles.policyTitle}>2. Data Usage</Text>
                    <Text style={styles.policyText}>
                        Your data is used solely to maintain your financial records, provide account notifications, and ensure secure login via OTP.
                    </Text>

                    <Text style={styles.policyTitle}>3. Account Security</Text>
                    <Text style={styles.policyText}>
                        We use 256-bit encryption for all data storage. Your transaction records are private between you and the respective shop owner.
                    </Text>

                    <Text style={styles.policyTitle}>4. Your Rights</Text>
                    <Text style={styles.policyText}>
                        You have the right to export your data or delete your account at any time through the Privacy & Security settings.
                    </Text>
                </View>
            );
        } else {
            return (
                <View style={styles.section}>
                    <Text style={styles.policyTitle}>1. Acceptance of Terms</Text>
                    <Text style={styles.policyText}>
                        By using ShopMunim, you agree to these terms and conditions. If you do not agree, please discontinue use of the application.
                    </Text>

                    <Text style={styles.policyTitle}>2. Accurate Records</Text>
                    <Text style={styles.policyText}>
                        ShopMunim is a tool for record-keeping. While we provide secure storage, users are responsible for verifying transaction amounts and settlements with shop owners.
                    </Text>

                    <Text style={styles.policyTitle}>3. Prohibited Use</Text>
                    <Text style={styles.policyText}>
                        Users may not use the platform for fraudulent activities, money laundering, or any illegal financial transactions.
                    </Text>

                    <Text style={styles.policyTitle}>4. Disclaimer</Text>
                    <Text style={styles.policyText}>
                        ShopMunim provides the service "as is" and is not liable for disputes between customers and shop owners regarding ledger balances.
                    </Text>
                </View>
            );
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>
                    {renderContent()}

                    <View style={styles.footerNote}>
                        <Text style={styles.footerText}>
                            If you have questions regarding our {title.toLowerCase()}, please contact our support team.
                        </Text>
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
    scrollView: { flex: 1 },
    content: { padding: 24 },
    lastUpdated: { fontSize: 13, color: colors.gray[500], marginBottom: 20 },
    section: { marginBottom: 30 },
    policyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.gray[900],
        marginBottom: 8,
        marginTop: 16,
    },
    policyText: {
        fontSize: 15,
        color: colors.gray[600],
        lineHeight: 22,
    },
    footerNote: {
        marginTop: 20,
        padding: 16,
        backgroundColor: colors.gray[100],
        borderRadius: borderRadius.md,
    },
    footerText: {
        fontSize: 13,
        color: colors.gray[500],
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default PoliciesScreen;
