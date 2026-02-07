// Select/Dropdown Component
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, fontSize, shadows } from '../../theme';

const Select = ({
    label,
    value,
    onValueChange,
    options = [], // [{ label: string, value: string }]
    placeholder = 'Select an option',
    error,
    required = false,
    style,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (option) => {
        onValueChange(option.value);
        setIsOpen(false);
    };

    return (
        <View style={[styles.container, style]}>
            {label && (
                <Text style={styles.label}>
                    {label}
                    {required && <Text style={styles.required}> *</Text>}
                </Text>
            )}

            <TouchableOpacity
                style={[styles.selectButton, error && styles.error]}
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={0.7}
            >
                <Text style={[
                    styles.selectText,
                    !selectedOption && styles.placeholder,
                ]}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.gray[500]}
                />
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Dropdown Options */}
            {isOpen && (
                <View style={styles.dropdown}>
                    {options.map((item) => (
                        <TouchableOpacity
                            key={item.value}
                            style={[
                                styles.option,
                                item.value === value && styles.selectedOption,
                            ]}
                            onPress={() => handleSelect(item)}
                        >
                            <Text style={[
                                styles.optionText,
                                item.value === value && styles.selectedOptionText,
                            ]}>
                                {item.label}
                            </Text>
                            {item.value === value && (
                                <Ionicons
                                    name="checkmark"
                                    size={20}
                                    color={colors.primary.blue}
                                />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
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
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.lg,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        minHeight: 48,
    },
    error: {
        borderColor: colors.error,
    },
    selectText: {
        fontSize: fontSize.md,
        color: colors.gray[800],
        flex: 1,
    },
    placeholder: {
        color: colors.gray[400],
    },
    errorText: {
        fontSize: fontSize.xs,
        color: colors.error,
        marginTop: spacing.xs,
    },
    dropdown: {
        marginTop: 4,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray[200],
        ...shadows.sm,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[100],
    },
    selectedOption: {
        backgroundColor: colors.gray[50],
    },
    optionText: {
        fontSize: fontSize.md,
        color: colors.gray[800],
    },
    selectedOptionText: {
        color: colors.primary.blue,
        fontWeight: '500',
    },
});

export default Select;
