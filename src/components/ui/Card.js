// Card Component with glass effect option
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../../theme';

const Card = ({
    children,
    variant = 'default', // default, glass
    style,
    padding = true,
}) => {
    return (
        <View style={[
            styles.card,
            variant === 'glass' && styles.glass,
            padding && styles.padded,
            style,
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        ...shadows.md,
    },
    glass: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    padded: {
        padding: spacing.lg,
    },
});

export default Card;
