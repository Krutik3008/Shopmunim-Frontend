import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TextInput,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { customerAPI, productAPI, transactionAPI, getAPIErrorMessage } from '../../api';

// Helper to safely get entries
const safeEntries = (obj) => {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj);
};

const AddTransactionModal = ({ visible, onClose, shopId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(false);

    // Data sources
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    // Form State
    const [customerId, setCustomerId] = useState('');
    const [transactionType, setTransactionType] = useState('credit'); // credit, debit
    const [method, setMethod] = useState('products'); // products, manual

    // Product Selection State
    const [selectedProducts, setSelectedProducts] = useState({}); // { productId: quantity }

    // Manual State
    const [manualAmount, setManualAmount] = useState('');

    // Common State
    const [note, setNote] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');

    // Filter customers based on search query
    const filterCustomers = () => {
        if (!customers) return [];
        if (!customerSearchQuery) return customers;

        const query = customerSearchQuery.toLowerCase();
        return customers.filter(c =>
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.phone && c.phone.includes(query)) ||
            (c.nickname && c.nickname.toLowerCase().includes(query))
        );
    };


    useEffect(() => {
        if (visible && shopId) {
            loadData();
            // Reset form
            setCustomerId('');
            setTransactionType('credit');
            setMethod('products');
            setSelectedProducts({});
            setManualAmount('');
            setCustomerSearchQuery('');
            setNote('');
        }
    }, [visible, shopId]);

    const loadData = async () => {
        setPageLoading(true);
        try {
            const [custRes, prodRes] = await Promise.all([
                customerAPI.getAll(shopId),
                productAPI.getAll(shopId)
            ]);
            const custData = custRes.data || {};
            setCustomers(custData.customers || custData || []);
            setProducts(prodRes.data || []);
        } catch (error) {
            console.log('AddTransactionModal: Failed to load data:', error);
            // Alert.alert('Error', 'Failed to load customers or products');
        } finally {
            setPageLoading(false);
        }
    };

    const calculateTotal = () => {
        if (method === 'manual') {
            return parseFloat(manualAmount) || 0;
        }

        return safeEntries(selectedProducts).reduce((total, [productId, qty]) => {
            const product = products.find(p => p.id === productId);
            return total + ((product?.price || 0) * qty);
        }, 0);
    };

    const handleProductToggle = (productId) => {
        setSelectedProducts(prev => {
            const newState = { ...(prev || {}) };
            if (newState[productId]) {
                delete newState[productId];
            } else {
                newState[productId] = 1;
            }
            return newState;
        });
    };

    const updateQuantity = (productId, change) => {
        setSelectedProducts(prev => {
            const safePrev = prev || {};
            const currentQty = safePrev[productId] || 0;
            const newQty = currentQty + change;

            const newState = { ...safePrev };
            if (newQty <= 0) {
                delete newState[productId];
            } else {
                newState[productId] = newQty;
            }
            return newState;
        });
    };

    const handleSubmit = async () => {
        if (!customerId) {
            Alert.alert('Error', 'Please select a customer');
            return;
        }

        const amount = calculateTotal();
        if (amount <= 0) {
            Alert.alert('Error', 'Transaction amount must be greater than zero');
            return;
        }

        setLoading(true);
        try {
            const transactionData = {
                customer_id: customerId,
                type: transactionType,
                amount: amount,
                method: method,
                date: new Date().toISOString(),
                note: note.trim()
            };

            if (method === 'products') {
                const items = safeEntries(selectedProducts).map(([productId, quantity]) => {
                    const product = products.find(p => p.id === productId);
                    return {
                        product_id: productId,
                        quantity: quantity,
                        price: product.price // Save snapshot of price
                    };
                });

                if (items.length === 0) {
                    Alert.alert('Error', 'Please select at least one product');
                    setLoading(false);
                    return;
                }
                transactionData.products = items;
            }

            console.log('Submitting Transaction Data:', JSON.stringify(transactionData, null, 2));

            await transactionAPI.create(shopId, transactionData);

            Alert.alert('Success', 'Transaction added successfully');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.log('Failed to create transaction:', error);
            Alert.alert('Error', getAPIErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const selectedCustomer = customers.find(c => c.id === customerId);

    const totalAmount = calculateTotal();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Add Transaction</Text>
                            <Text style={styles.modalSubtitle}>Select products and quantities</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.formContent}>

                            {/* Custom Customer Select with Search */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.sectionLabel}>Select Customer *</Text>

                                {customerId ? (
                                    <View style={styles.selectedCustomerCard}>
                                        <View>
                                            <Text style={styles.selectedCustomerName}>
                                                {selectedCustomer?.name}
                                                {selectedCustomer?.nickname ? ` (${selectedCustomer.nickname})` : ''}
                                            </Text>
                                            <Text style={styles.selectedCustomerPhone}>+91 {selectedCustomer?.phone}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setCustomerId('');
                                                setCustomerSearchQuery(''); // Clear query when unselecting
                                                setShowCustomerDropdown(true);
                                            }}
                                            style={styles.changeCustomerBtn}
                                        >
                                            <Text style={styles.changeCustomerText}>Change</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.searchContainer}>
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="Search customer"
                                                placeholderTextColor={colors.gray[400]}
                                                value={customerSearchQuery}
                                                onChangeText={(text) => {
                                                    setCustomerSearchQuery(text);
                                                    setShowCustomerDropdown(true);
                                                }}
                                                onFocus={() => setShowCustomerDropdown(true)}
                                            />
                                            {customerSearchQuery.length > 0 && (
                                                <TouchableOpacity onPress={() => setCustomerSearchQuery('')} style={styles.clearSearchBtn}>
                                                    <Ionicons name="close-circle" size={18} color={colors.gray[400]} />
                                                </TouchableOpacity>
                                            )}
                                            <Ionicons name="search-outline" size={20} color={colors.gray[400]} style={styles.searchIcon} />
                                        </View>

                                        {showCustomerDropdown && customerSearchQuery.length > 0 && (
                                            <View style={styles.dropdownList}>
                                                {filterCustomers().length === 0 ? (
                                                    <Text style={styles.dropdownEmpty}>
                                                        {customerSearchQuery ? 'No matching customers found' : 'Start typing to search...'}
                                                    </Text>
                                                ) : (
                                                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                                                        {filterCustomers().map((customer) => (
                                                            <TouchableOpacity
                                                                key={customer.id}
                                                                style={styles.dropdownItem}
                                                                onPress={() => {
                                                                    setCustomerId(customer.id);
                                                                    setCustomerSearchQuery(''); // Clear after selection
                                                                    setShowCustomerDropdown(false);
                                                                }}
                                                            >
                                                                <Text style={styles.dropdownItemText}>
                                                                    {customer.name}
                                                                    {customer.nickname ? ` (${customer.nickname})` : ''}
                                                                    <Text style={styles.phoneText}> (+91 {customer.phone})</Text>
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                )}
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>

                            {/* Transaction Type */}
                            <Select
                                label="Transaction Type *"
                                options={[
                                    { label: 'Credit (Give Udhaar)', value: 'credit' },
                                    { label: 'Debit (Take Payment)', value: 'debit' }
                                ]}
                                value={transactionType}
                                onValueChange={(value) => {
                                    setTransactionType(value);
                                    if (value === 'debit') {
                                        setMethod('manual');
                                    } else {
                                        setMethod('products');
                                    }
                                }}
                            />

                            {/* Method Switcher */}
                            {transactionType === 'credit' && (
                                <>
                                    <Text style={styles.sectionLabel}>Transaction Method</Text>
                                    <View style={styles.methodToggle}>
                                        <TouchableOpacity
                                            style={[styles.methodOption, method === 'products' && styles.methodActive]}
                                            onPress={() => setMethod('products')}
                                        >
                                            <Ionicons name="cube-outline" size={18} color={method === 'products' ? colors.primary.blue : colors.gray[600]} />
                                            <Text style={[styles.methodText, method === 'products' && styles.methodTextActive]}>Products</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.methodOption, method === 'manual' && styles.methodActive]}
                                            onPress={() => setMethod('manual')}
                                        >
                                            <Ionicons name="calculator-outline" size={18} color={method === 'manual' ? colors.primary.blue : colors.gray[600]} />
                                            <Text style={[styles.methodText, method === 'manual' && styles.methodTextActive]}>Manual</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}

                            {/* Content based on method */}
                            {method === 'manual' ? (
                                <View style={styles.manualInputContainer}>
                                    <Input
                                        label="Amount *"
                                        placeholder="Enter amount (₹)"
                                        value={manualAmount}
                                        onChangeText={setManualAmount}
                                        keyboardType="numeric"
                                        prefix="₹"
                                    />
                                </View>
                            ) : (
                                <View style={styles.productsContainer}>
                                    <Text style={styles.sectionLabel}>Select Products</Text>
                                    {/* Products Grid */}
                                    <View style={styles.productsGrid}>
                                        {products.length === 0 ? (
                                            <Text style={styles.emptyText}>No products added yet.</Text>
                                        ) : (
                                            products.map(product => {
                                                // Safe access to selectedProducts using optional chaining or logical OR in toggle already handles it
                                                const qty = selectedProducts && selectedProducts[product.id] ? selectedProducts[product.id] : 0;
                                                const isSelected = qty > 0;

                                                return (
                                                    <TouchableOpacity
                                                        key={product.id}
                                                        style={[styles.productCard, isSelected && styles.productCardSelected]}
                                                        onPress={() => handleProductToggle(product.id)}
                                                    >
                                                        <View style={styles.productCardContent}>
                                                            <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                                                            <Text style={styles.productPrice}>₹{product.price}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        )}
                                    </View>

                                    {/* Selected Items Section (Web "Cart" style) */}
                                    {safeEntries(selectedProducts).length > 0 && (
                                        <View style={styles.selectedItemsCard}>
                                            <View style={styles.selectedItemsHeader}>
                                                <Ionicons name="cart-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                                <Text style={styles.selectedItemsTitle}>Selected Items</Text>
                                            </View>
                                            <View style={styles.selectedItemsContent}>
                                                {safeEntries(selectedProducts).map(([pid, qty]) => {
                                                    const product = products.find(p => p.id === pid);
                                                    if (!product) return null;
                                                    const subtotal = product.price * qty;

                                                    return (
                                                        <View key={pid} style={styles.selectedItemRow}>
                                                            <View style={styles.itemTopRow}>
                                                                <View style={styles.selectedItemInfo}>
                                                                    <Text style={styles.selectedItemName}>{product.name}</Text>
                                                                    <Text style={styles.selectedItemPrice}>₹{parseFloat(product.price).toFixed(2)} each</Text>
                                                                </View>
                                                                <TouchableOpacity
                                                                    onPress={() => updateQuantity(pid, -qty)} // Remove
                                                                    style={styles.removeButtonRef}
                                                                >
                                                                    <Text style={styles.removeButtonText}>Remove</Text>
                                                                </TouchableOpacity>
                                                            </View>

                                                            <View style={styles.itemBottomRow}>
                                                                <View style={styles.qtyControlsRef}>
                                                                    <TouchableOpacity
                                                                        style={styles.qtyBtnRef}
                                                                        onPress={() => updateQuantity(pid, -1)}
                                                                    >
                                                                        <Ionicons name="remove" size={16} color="#374151" />
                                                                    </TouchableOpacity>
                                                                    <View style={styles.qtyTextContainer}>
                                                                        <Text style={styles.qtyTextRef}>{qty}</Text>
                                                                    </View>
                                                                    <TouchableOpacity
                                                                        style={styles.qtyBtnRef}
                                                                        onPress={() => updateQuantity(pid, 1)}
                                                                    >
                                                                        <Ionicons name="add" size={16} color="#374151" />
                                                                    </TouchableOpacity>
                                                                </View>
                                                                <Text style={styles.itemSubtotalRef}>₹{subtotal.toFixed(2)}</Text>
                                                            </View>
                                                        </View>
                                                    );
                                                })}

                                                {/* Total Amount Banner */}
                                                <View style={styles.totalBanner}>
                                                    <Text style={styles.totalBannerLabel}>Total Amount:</Text>
                                                    <Text style={styles.totalBannerAmount}>₹{totalAmount.toFixed(2)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                </View>
                            )}

                            {/* Note */}
                            <View style={styles.noteContainer}>
                                {/* ... rest unchanged ... */}
                            </View>

                            {/* ... manual copy if needed, but replace tool handles replacement ... */}


                            {/* Note */}
                            <View style={styles.noteContainer}>
                                <Text style={styles.sectionLabel}>Note (Optional)</Text>
                                <TextInput
                                    style={styles.noteInput}
                                    placeholder="Add a note for this transaction"
                                    value={note}
                                    onChangeText={setNote}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Total & Action */}
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={[styles.submitBtn, loading && styles.disabledBtn]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Add Transaction'}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>

                            </View>

                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: '90%', // Keep max height but centered
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    modalClose: {
        padding: 4,
    },
    scrollContent: {
        padding: 20,
    },
    formContent: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.gray[800],
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    methodToggle: {
        flexDirection: 'row',
        backgroundColor: colors.gray[100],
        borderRadius: borderRadius.lg,
        padding: 4,
        marginBottom: spacing.md,
    },
    methodOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: borderRadius.lg - 4,
        gap: 8,
    },
    methodActive: {
        backgroundColor: colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    methodText: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        color: colors.gray[600],
    },
    methodTextActive: {
        color: colors.primary.blue,
        fontWeight: '600',
    },
    manualInputContainer: {
        marginBottom: spacing.xs,
    },
    productsContainer: {
        marginBottom: spacing.md,
    },
    productsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingBottom: spacing.sm,
    },
    productCard: {
        width: '48%',
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productCardSelected: {
        backgroundColor: '#EFF6FF', // blue-50
    },
    productCardContent: {
        alignItems: 'center',
    },
    productName: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.gray[800],
        marginBottom: 4,
        textAlign: 'center',
    },
    productPrice: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: '#2563EB', // blue-600
    },
    emptyText: {
        width: '100%',
        textAlign: 'center',
        color: colors.gray[500],
        padding: spacing.lg,
    },
    noteContainer: {
        marginBottom: spacing.lg,
    },
    noteInput: {
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        height: 80,
        backgroundColor: colors.white,
        fontSize: fontSize.md,
        color: colors.gray[800],
    },
    footer: {
        marginTop: spacing.lg,
        gap: 16,
    },
    inputContainer: {
        marginBottom: spacing.md,
    },
    // Customer Select Styling
    selectedCustomerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#EFF6FF', // blue-50
        borderColor: '#BFDBFE', // blue-200
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    selectedCustomerName: {
        color: '#1E40AF', // blue-800
        fontWeight: '500',
        fontSize: fontSize.md,
    },
    selectedCustomerPhone: {
        color: '#2563EB', // blue-600
        fontSize: fontSize.sm,
    },
    changeCustomerBtn: {
        padding: 4,
    },
    changeCustomerText: {
        color: '#2563EB', // blue-600
        fontSize: fontSize.sm,
        fontWeight: '500',
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        backgroundColor: colors.white,
    },
    selectText: {
        fontSize: fontSize.md,
        color: colors.gray[800],
    },
    placeholderText: {
        fontSize: fontSize.md,
        color: colors.gray[400],
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.lg,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.sm,
    },
    searchIcon: {
        marginLeft: spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: fontSize.md,
        color: colors.gray[800],
    },
    clearSearchBtn: {
        padding: 4,
    },
    dropdownList: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderRadius: borderRadius.lg,
        backgroundColor: colors.white,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        maxHeight: 200, // Limit dropdown height if many customers
    },
    dropdownItem: {
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[100],
    },
    dropdownItemText: {
        fontSize: fontSize.md,
        color: colors.gray[800],
    },
    phoneText: {
        color: colors.gray[500],
        fontSize: fontSize.sm,
    },
    dropdownEmpty: {
        padding: spacing.md,
        textAlign: 'center',
        color: colors.gray[500],
    },
    // Selected Items "Cart" Styling
    selectedItemsCard: {
        marginTop: spacing.sm,
        backgroundColor: '#F3F4F6', // Lighter grey/blue background as per image
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    selectedItemsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        // borderBottomWidth: 1, // Removed border as per image might not have it or it's subtle, sticking to cleaner look
        // borderBottomColor: '#E5E7EB',
    },
    selectedItemsTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#1F2937', // gray-800
    },
    selectedItemsContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        gap: spacing.md,
    },
    selectedItemRow: {
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    itemTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    selectedItemInfo: {
        flex: 1,
    },
    selectedItemName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    selectedItemPrice: {
        fontSize: fontSize.sm,
        color: '#6B7280', // gray-500
    },
    removeButtonRef: {
        backgroundColor: '#EF4444', // Red-500
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    itemBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    qtyControlsRef: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        gap: 8,
    },
    qtyBtnRef: {
        width: 32,
        height: 32,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    qtyTextContainer: {
        minWidth: 24,
        alignItems: 'center',
    },
    qtyTextRef: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    itemSubtotalRef: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2563EB', // Blue-600
    },
    totalBanner: {
        // As per image, it's a blue button-like banner at bottom
        backgroundColor: '#2563EB',
        padding: 16,
        borderRadius: borderRadius.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    totalBannerLabel: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    totalBannerAmount: {
        color: colors.white,
        fontSize: 24,
        fontWeight: '700',
    },
    submitBtn: {
        backgroundColor: '#2563EB',
        borderRadius: borderRadius.lg,
        paddingVertical: 14,
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: colors.white,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    cancelBtn: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.lg,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 20,
    },
    cancelBtnText: {
        color: colors.gray[700],
        fontSize: fontSize.md,
        fontWeight: '600',
    }
});

export default AddTransactionModal;
