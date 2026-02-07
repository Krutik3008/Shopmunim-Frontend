// Bottom Navigation Component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, shadows } from '../theme';

const BottomNavigation = ({ state, descriptors, navigation }) => {
    const getIcon = (routeName, isFocused) => {
        let iconName;

        switch (routeName) {
            case 'Home':
                iconName = isFocused ? 'home' : 'home-outline';
                break;
            case 'Customers':
                iconName = isFocused ? 'people' : 'people-outline';
                break;
            case 'Products':
                iconName = isFocused ? 'cube' : 'cube-outline';
                break;
            case 'Transactions':
                iconName = isFocused ? 'receipt' : 'receipt-outline';
                break;
            case 'Settings':
                iconName = isFocused ? 'settings' : 'settings-outline';
                break;
            case 'MyShops':
                iconName = isFocused ? 'storefront' : 'storefront-outline';
                break;
            case 'Account':
                iconName = isFocused ? 'person' : 'person-outline';
                break;
            default:
                iconName = 'ellipse-outline';
        }

        return iconName;
    };

    return (
        <View style={styles.container}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label = options.tabBarLabel || options.title || route.name;
                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarTestID}
                        onPress={onPress}
                        style={styles.tab}
                    >
                        <View style={[
                            styles.iconContainer,
                            isFocused && styles.iconContainerFocused,
                        ]}>
                            <Ionicons
                                name={getIcon(route.name, isFocused)}
                                size={24}
                                color={isFocused ? colors.primary.blue : colors.gray[500]}
                            />
                        </View>
                        <Text style={[
                            styles.label,
                            isFocused && styles.labelFocused,
                        ]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        paddingBottom: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.gray[100],
        ...shadows.sm,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xs,
    },
    iconContainer: {
        width: 48,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        marginBottom: spacing.xs,
    },
    iconContainerFocused: {
        backgroundColor: colors.primary.blue + '15',
    },
    label: {
        fontSize: fontSize.xs,
        color: colors.gray[500],
    },
    labelFocused: {
        color: colors.primary.blue,
        fontWeight: '600',
    },
});

export default BottomNavigation;
