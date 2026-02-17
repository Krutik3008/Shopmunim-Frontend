import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../../theme';

const PrivacySecurityScreen = () => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy & Security</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.row}>
                        <View style={styles.rowIcon}>
                            <Ionicons name="key-outline" size={22} color={colors.gray[600]} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowTitle}>Change Password</Text>
                            <Text style={styles.rowSubtitle}>Update your account password</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.row}>
                        <View style={styles.rowIcon}>
                            <Ionicons name="lock-closed-outline" size={22} color={colors.gray[600]} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowTitle}>Two-Factor Authentication</Text>
                            <Text style={styles.rowSubtitle}>Add an extra layer of security</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.row, styles.lastRow]}>
                        <View style={styles.rowIcon}>
                            <Ionicons name="eye-off-outline" size={22} color={colors.gray[600]} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowTitle}>Data Privacy</Text>
                            <Text style={styles.rowSubtitle}>Manage your data and privacy settings</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
                    </TouchableOpacity>
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
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gray[200],
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[100],
    },
    lastRow: { borderBottomWidth: 0 },
    rowIcon: {
        marginRight: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowContent: { flex: 1 },
    rowTitle: { fontSize: 16, fontWeight: '600', color: colors.gray[900], marginBottom: 2 },
    rowSubtitle: { fontSize: 13, color: colors.gray[500] },
});

export default PrivacySecurityScreen;
