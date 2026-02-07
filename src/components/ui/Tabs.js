// Tabs Component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../../theme';

const Tabs = ({
    tabs = [], // [{ key: string, label: string }]
    activeTab,
    onTabChange,
    style,
}) => {
    return (
        <View style={[styles.container, style]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.tab,
                            activeTab === tab.key && styles.activeTab,
                        ]}
                        onPress={() => onTabChange(tab.key)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === tab.key && styles.activeTabText,
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.gray[100],
        borderRadius: borderRadius.lg,
        padding: spacing.xs,
    },
    scrollContent: {
        flexDirection: 'row',
    },
    tab: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginRight: spacing.xs,
    },
    activeTab: {
        backgroundColor: colors.white,
    },
    tabText: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.gray[500],
    },
    activeTabText: {
        color: colors.gray[800],
    },
});

export default Tabs;
