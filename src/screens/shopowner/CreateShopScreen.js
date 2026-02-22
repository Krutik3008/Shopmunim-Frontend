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
    Pressable,
    Dimensions,
    Keyboard,
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

const CreateShopScreen = ({ navigation, route }) => {
    const editingShop = route.params?.shop;
    const [shopName, setShopName] = useState(editingShop?.name || '');
    const [shopCategory, setShopCategory] = useState(editingShop?.category || '');
    const [pincode, setPincode] = useState(editingShop?.pincode || '');
    const [city, setCity] = useState(editingShop?.city || '');
    const [state, setState] = useState(editingShop?.state || '');
    const [country, setCountry] = useState(editingShop?.country || '');
    const [area, setArea] = useState(editingShop?.area || '');
    const [availableAreas, setAvailableAreas] = useState([]);
    const [isLoadingPincode, setIsLoadingPincode] = useState(false);

    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showAreaDropdown, setShowAreaDropdown] = useState(false);
    const [creating, setCreating] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // If editing, availableAreas might need to be fetched or just set area as text
    // For now, if we have area, we can just set it. We won't re-fetch postal APIs on load unless user changes pincode.

    React.useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    const fetchLocationDetails = async (pin) => {
        if (pin.length !== 6) return;

        setIsLoadingPincode(true);
        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
            const data = await response.json();

            if (data && data[0].Status === 'Success') {
                const postOffice = data[0].PostOffice;
                const office = postOffice[0];

                setCity(office.District);
                setState(office.State);
                setCountry(office.Country);

                const areas = postOffice.map(po => po.Name);
                setAvailableAreas(areas);
                if (areas.length > 0) {
                    setArea(areas[0]);
                }
            } else {
                Alert.alert('Error', 'Invalid Pincode');
                setCity('');
                setState('');
                setAvailableAreas([]);
                setArea('');
            }
        } catch (error) {
            console.error('Error fetching pincode details:', error);
            Alert.alert('Error', 'Failed to fetch location details');
        } finally {
            setIsLoadingPincode(false);
        }
    };

    const handlePincodeChange = (text) => {
        // Only allow numbers
        const numericText = text.replace(/[^0-9]/g, '');
        setPincode(numericText);

        if (numericText.length === 6) {
            fetchLocationDetails(numericText);
        } else {
            setCity('');
            setState('');
            setAvailableAreas([]);
            setArea('');
        }
    };

    const handleCreate = async () => {
        if (!shopName.trim()) {
            Alert.alert('Error', 'Please enter shop name');
            return;
        }
        if (!shopCategory) {
            Alert.alert('Error', 'Please select a category');
            return;
        }
        if (!pincode || pincode.length !== 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit pincode');
            return;
        }
        if (!area) {
            Alert.alert('Error', 'Please select an area');
            return;
        }

        setCreating(true);
        try {
            const shopData = {
                name: shopName.trim(),
                category: shopCategory,
                pincode: pincode,
                city: city,
                state: state,
                country: country,
                area: area,
                location: `${area}, ${city}, ${state}, ${pincode}` // For backward compatibility
            };

            if (editingShop) {
                await shopAPI.update(editingShop.id, shopData);
                Alert.alert('Success', 'Shop updated successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await shopAPI.create(shopData);
                Alert.alert('Success', 'Shop created successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            console.error('Shop save error:', error);
            const msg = error.response?.data?.detail || 'Failed to save shop';
            Alert.alert('Error', msg);
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
                    <TouchableWithoutFeedback onPress={() => { setShowCategoryDropdown(false); setShowAreaDropdown(false); }}>
                        <View style={styles.modalContent}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingShop ? 'Edit Shop' : 'Create New Shop'}</Text>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                                overScrollMode="never"
                                contentContainerStyle={{ paddingBottom: keyboardVisible ? 40 : 20 }}
                            >
                                <Pressable style={{ flex: 1 }} onPress={() => { setShowCategoryDropdown(false); setShowAreaDropdown(false); }}>
                                    {/* Shop Name */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Shop Name <Text style={styles.required}>*</Text></Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter shop name"
                                            placeholderTextColor="#9CA3AF"
                                            value={shopName}
                                            onChangeText={setShopName}
                                            onFocus={() => { setShowCategoryDropdown(false); setShowAreaDropdown(false); }}
                                            autoCapitalize="words"
                                        />
                                    </View>

                                    {/* Category */}
                                    <View style={[styles.inputGroup, { zIndex: 2000 }]}>
                                        <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
                                        <TouchableOpacity
                                            style={styles.dropdown}
                                            onPress={() => {
                                                setShowCategoryDropdown(!showCategoryDropdown);
                                                setShowAreaDropdown(false);
                                            }}
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
                                    </View>

                                    {/* Pincode */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Pincode <Text style={styles.required}>*</Text></Text>
                                        <View style={styles.pincodeContainer}>
                                            <TextInput
                                                style={[styles.textInput, { flex: 1 }]}
                                                placeholder="Enter 6-digit Pincode"
                                                placeholderTextColor="#9CA3AF"
                                                value={pincode}
                                                onChangeText={handlePincodeChange}
                                                onFocus={() => { setShowCategoryDropdown(false); setShowAreaDropdown(false); }}
                                                keyboardType="number-pad"
                                                maxLength={6}
                                            />
                                            {isLoadingPincode && (
                                                <ActivityIndicator style={styles.pincodeLoader} size="small" color="#3B82F6" />
                                            )}
                                        </View>
                                    </View>

                                    {/* Area Field */}
                                    <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                                        <Text style={styles.label}>Area <Text style={styles.required}>*</Text></Text>

                                        {availableAreas.length > 0 ? (
                                            <>
                                                <TouchableOpacity
                                                    style={styles.dropdown}
                                                    onPress={() => {
                                                        setShowAreaDropdown(!showAreaDropdown);
                                                        setShowCategoryDropdown(false);
                                                    }}
                                                >
                                                    <Text style={area ? styles.dropdownText : styles.placeholder}>
                                                        {area || 'Select Area'}
                                                    </Text>
                                                    <Ionicons
                                                        name={showAreaDropdown ? "chevron-up" : "chevron-down"}
                                                        size={20}
                                                        color="#9CA3AF"
                                                    />
                                                </TouchableOpacity>

                                                {showAreaDropdown && (
                                                    <View style={styles.categoryList}>
                                                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                                                            {availableAreas.map((item, idx) => (
                                                                <TouchableOpacity
                                                                    key={idx}
                                                                    style={styles.categoryItem}
                                                                    onPress={() => {
                                                                        setArea(item);
                                                                        setShowAreaDropdown(false);
                                                                    }}
                                                                >
                                                                    <Text style={styles.categoryItemText}>{item}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </ScrollView>
                                                    </View>
                                                )}
                                            </>
                                        ) : (
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Enter Area"
                                                placeholderTextColor="#9CA3AF"
                                                value={area}
                                                onChangeText={setArea}
                                                onFocus={() => { setShowCategoryDropdown(false); setShowAreaDropdown(false); }}
                                                autoCapitalize="words"
                                            />
                                        )}
                                    </View>

                                    {/* Auto-filled Fields */}
                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                            <Text style={styles.label}>City</Text>
                                            <TextInput
                                                style={[styles.textInput, styles.readOnlyInput]}
                                                value={city}
                                                editable={false}
                                            />
                                        </View>
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={styles.label}>State</Text>
                                            <TextInput
                                                style={[styles.textInput, styles.readOnlyInput]}
                                                value={state}
                                                editable={false}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Country</Text>
                                        <TextInput
                                            style={[styles.textInput, styles.readOnlyInput]}
                                            value={country}
                                            editable={false}
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
                                            <Text style={styles.buttonText}>{editingShop ? 'Update Shop' : 'Create Shop'}</Text>
                                        )}
                                    </TouchableOpacity>
                                </Pressable>
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
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: Dimensions.get('window').height * 0.1, // Start 10% from top
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxHeight: Dimensions.get('window').height * 0.8,
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
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 1000,
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    pincodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pincodeLoader: {
        marginLeft: 10,
    },
    readOnlyInput: {
        backgroundColor: '#F3F4F6',
        color: '#6B7280',
    },
});

export default CreateShopScreen;
