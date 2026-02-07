// Modal Component - Bottom Sheet style
import React from 'react';
import {
    Modal as RNModal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, fontSize, shadows } from '../../theme';

const Modal = ({
    visible,
    onClose,
    title,
    description,
    children,
    showCloseButton = true,
}) => {
    return (
        <RNModal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.container}>
                    {/* Handle bar */}
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerText}>
                            {title && <Text style={styles.title}>{title}</Text>}
                            {description && <Text style={styles.description}>{description}</Text>}
                        </View>
                        {showCloseButton && (
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={colors.gray[500]} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {children}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </RNModal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
    },
    keyboardView: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    container: {
        backgroundColor: colors.white,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        maxHeight: '90%',
        ...shadows.lg,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: colors.gray[300],
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[100],
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: '600',
        color: colors.gray[800],
    },
    description: {
        fontSize: fontSize.sm,
        color: colors.gray[500],
        marginTop: spacing.xs,
    },
    closeButton: {
        padding: spacing.xs,
    },
    content: {
        padding: spacing.lg,
    },
});

export default Modal;
