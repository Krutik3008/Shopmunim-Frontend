import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ShopFooter = () => (
    <View style={styles.footer}>
        <Text style={styles.footerBrand}>ShopMunim</Text>
        <Text style={styles.footerVersion}>Version 1.0.0</Text>
        <Text style={styles.footerTagline}>Digital Credit & Payment Ledger</Text>
    </View>
);

const styles = StyleSheet.create({
    footer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    footerBrand: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6' },
    footerVersion: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    footerTagline: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});

export default ShopFooter;
