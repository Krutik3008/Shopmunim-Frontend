// Badge Component for status display
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../../theme';

const Badge = ({
    children,
    variant = 'default', // default, success, warning, error, secondary
    size = 'md', // sm, md
    style,
}) => {
    const getVariantStyle = () => {
        switch (variant) {
            case 'success':
                return { backgroundColor: '#DCFCE7', textColor: '#166534' };
            case 'warning':
                return { backgroundColor: '#FEF3C7', textColor: '#92400E' };
            case 'error':
                return { backgroundColor: '#FEE2E2', textColor: '#DC2626' };
            case 'secondary':
                return { backgroundColor: colors.gray[100], textColor: colors.gray[600] };
            default:
                return { backgroundColor: '#DBEAFE', textColor: '#1D4ED8' };
        }
    };

    const { backgroundColor, textColor } = getVariantStyle();

    return (
        <View style={[
            styles.badge,
            styles[`size_${size}`],
            { backgroundColor },
            style,
        ]}>
            <Text style={[
                styles.text,
                styles[`text_${size}`],
                { color: textColor },
            ]}>
                {children}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    size_sm: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    size_md: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    text: {
        fontWeight: '500',
    },
    text_sm: {
        fontSize: fontSize.xs,
    },
    text_md: {
        fontSize: fontSize.sm,
    },
});

export default Badge;
