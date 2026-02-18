// Create Shop Screen - Modal style centered popup
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shopAPI } from '../../api';

const SHOP_CATEGORIES = [
    'Grocery',
    'Restaurant/Food',
    'Electronics',
    'Clothing',
    'Medical/Pharmacy',
    'Other'
];

const CreateShopScreen = ({ navigation }) => {
    const [shopName, setShopName] = useState('');
    const [shopCategory, setShopCategory] = useState('');
    const [shopLocation, setShopLocation] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!shopName.trim()) {
            Alert.alert('Error', 'Please enter shop name');
            return;
        }
        if (!shopCategory) {
            Alert.alert('Error', 'Please select a category');
            return;
        }
        if (!shopLocation.trim()) {
            Alert.alert('Error', 'Please enter shop location');
            return;
        }

        setCreating(true);
        try {
            await shopAPI.create({
                name: shopName.trim(),
                category: shopCategory,
                location: shopLocation.trim()
            });
            Alert.alert('Success', 'Shop created successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.log('Failed to create shop:', error);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to create shop');
        } finally {
            setCreating(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={styles.modalContent}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Create New Shop</Text>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Shop Name */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Shop Name <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter shop name"
                                        placeholderTextColor="#9CA3AF"
                                        value={shopName}
                                        onChangeText={setShopName}
                                        autoCapitalize="words"
                                    />
                                </View>

                                {/* Category */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
                                    <TouchableOpacity
                                        style={styles.dropdown}
                                        onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                    >
                                        <Text style={shopCategory ? styles.dropdownText : styles.placeholder}>
                                            {shopCategory || 'Select category'}
                                        </Text>
                                        <Ionicons
                                            name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
                                            size={20}
                                            color="#9CA3AF"
                                        />
                                    </TouchableOpacity>
                                </View>

                                {showCategoryDropdown && (
                                    <View style={styles.categoryList}>
                                        {SHOP_CATEGORIES.map((cat, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                style={styles.categoryItem}
                                                onPress={() => {
                                                    setShopCategory(cat);
                                                    setShowCategoryDropdown(false);
                                                }}
                                            >
                                                <Text style={styles.categoryItemText}>{cat}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {/* Location */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Location <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter shop location"
                                        placeholderTextColor="#9CA3AF"
                                        value={shopLocation}
                                        onChangeText={setShopLocation}
                                        autoCapitalize="words"
                                    />
                                </View>

                                {/* Create Button */}
                                <TouchableOpacity
                                    style={[styles.button, creating && styles.buttonDisabled]}
                                    onPress={handleCreate}
                                    disabled={creating}
                                >
                                    {creating ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Create Shop</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxHeight: '100%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    closeButton: {
        position: 'absolute',
        right: 0,
        padding: 4,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 8,
    },
    required: {
        color: '#EF4444',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#fff',
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    dropdownText: {
        fontSize: 16,
        color: '#111827',
    },
    placeholder: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    categoryList: {
        marginBottom: 20,
        marginTop: -12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        backgroundColor: '#fff',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    categoryItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    categoryItemText: {
        fontSize: 15,
        color: '#374151',
    },
    button: {
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CreateShopScreen;
