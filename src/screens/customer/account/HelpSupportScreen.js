import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../../theme';

const HelpSupportScreen = () => {
    const navigation = useNavigation();

    const handleContactSupport = () => {
        Linking.openURL('mailto:support@shopmunim.com');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>How can we help you?</Text>
                    <Text style={styles.cardText}>
                        If you have any questions or are facing issues with the app, please feel free to reach out to us.
                    </Text>
                    <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
                        <Ionicons name="mail-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.contactButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.faqSection}>
                    <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

                    <View style={styles.faqItem}>
                        <Text style={styles.question}>How do I pay a shop?</Text>
                        <Text style={styles.answer}>Tap on 'Pay Now' in the Payments tab or on a specific shop's ledger to initiate a payment.</Text>
                    </View>

                    <View style={styles.faqItem}>
                        <Text style={styles.question}>Can I add a shop myself?</Text>
                        <Text style={styles.answer}>Currently, shops must add you as a customer using your phone number.</Text>
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
    card: {
        backgroundColor: '#EFF6FF',
        padding: 24,
        borderRadius: 16,
        marginBottom: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    cardTitle: { fontSize: 20, fontWeight: '700', color: '#1E40AF', marginBottom: 12 },
    cardText: { fontSize: 15, color: '#3B82F6', textAlign: 'center', marginBottom: 20, lineHeight: 24 },
    contactButton: {
        flexDirection: 'row',
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    contactButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.gray[900], marginBottom: 16 },
    faqSection: { marginBottom: 24 },
    faqItem: {
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.gray[200],
    },
    question: { fontSize: 16, fontWeight: '600', color: colors.gray[900], marginBottom: 8 },
    answer: { fontSize: 14, color: colors.gray[600], lineHeight: 22 },
});

export default HelpSupportScreen;
