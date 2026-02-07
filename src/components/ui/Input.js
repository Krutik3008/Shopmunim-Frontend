// Input Component with label and error support
import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, fontSize } from '../../theme';

const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    secureTextEntry = false,
    keyboardType = 'default',
    maxLength,
    multiline = false,
    numberOfLines = 1,
    prefix,
    suffix,
    editable = true,
    style,
    inputStyle,
    required = false,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View style={[styles.container, style]}>
            {label && (
                <Text style={styles.label}>
                    {label}
                    {required && <Text style={styles.required}> *</Text>}
                </Text>
            )}

            <View style={[
                styles.inputContainer,
                isFocused && styles.focused,
                error && styles.error,
                !editable && styles.disabled,
            ]}>
                {prefix && (
                    <View style={styles.prefix}>
                        {typeof prefix === 'string' ? (
                            <Text style={styles.prefixText}>{prefix}</Text>
                        ) : prefix}
                    </View>
                )}

                <TextInput
                    style={[
                        styles.input,
                        multiline && styles.multiline,
                        inputStyle,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.gray[400]}
                    secureTextEntry={secureTextEntry && !showPassword}
                    keyboardType={keyboardType}
                    maxLength={maxLength}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    editable={editable}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />

                {secureTextEntry && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.suffix}
                    >
                        <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.gray[500]}
                        />
                    </TouchableOpacity>
                )}

                {suffix && !secureTextEntry && (
                    <View style={styles.suffix}>{suffix}</View>
                )}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.gray[700],
        marginBottom: spacing.xs,
    },
    required: {
        color: colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.lg,
        backgroundColor: colors.white,
        minHeight: 48,
    },
    focused: {
        borderColor: colors.primary.blue,
        borderWidth: 2,
    },
    error: {
        borderColor: colors.error,
    },
    disabled: {
        backgroundColor: colors.gray[100],
    },
    input: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.gray[800],
    },
    multiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    prefix: {
        paddingLeft: 12,
        borderRightWidth: 1,
        borderRightColor: colors.gray[200],
        paddingRight: 8,
        justifyContent: 'center',
        alignSelf: 'stretch',
    },
    prefixText: {
        fontSize: fontSize.md,
        color: colors.gray[500],
    },
    suffix: {
        paddingRight: spacing.md,
    },
    errorText: {
        fontSize: fontSize.xs,
        color: colors.error,
        marginTop: spacing.xs,
    },
});

export default Input;
