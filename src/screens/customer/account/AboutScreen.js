import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../../theme';

const AboutScreen = () => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About ShopMunim</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>SM</Text>
                    </View>
                    <Text style={styles.appName}>ShopMunim</Text>
                    <Text style={styles.version}>Version 1.0.0</Text>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.description}>
                        ShopMunim is your digital ledger assistant, helping you track credit and payments with your favorite local shops easily and securely.
                    </Text>

                    <TouchableOpacity style={styles.linkButton}>
                        <Text style={styles.linkText}>Terms of Service</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkButton}>
                        <Text style={styles.linkText}>Privacy Policy</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.copyright}>© 2024 ShopMunim. All rights reserved.</Text>
            </View>
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
    content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
    logoContainer: { alignItems: 'center', marginBottom: 48 },
    logoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: colors.primary.blue,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        // Using shadow style manually if shadows import not available, or assume it is
        elevation: 8,
        shadowColor: colors.primary.blue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    logoText: { color: '#fff', fontSize: 40, fontWeight: '800' },
    appName: { fontSize: 28, fontWeight: '800', color: colors.gray[900], marginBottom: 8 },
    version: { fontSize: 16, color: colors.gray[500] },
    infoContainer: { width: '100%', alignItems: 'center', marginBottom: 48 },
    description: {
        fontSize: 16,
        color: colors.gray[600],
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        maxWidth: '80%',
    },
    linkButton: { paddingVertical: 12 },
    linkText: { color: colors.primary.blue, fontSize: 16, fontWeight: '600' },
    copyright: { fontSize: 13, color: colors.gray[400], position: 'absolute', bottom: 32 },
});

export default AboutScreen;
