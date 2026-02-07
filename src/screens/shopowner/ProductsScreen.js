// Products Management Screen
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Button, Badge, Modal, Input } from '../../components/ui';
import { productAPI } from '../../api';
import { formatCurrency } from '../../utils/helpers';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

const ProductsScreen = ({ route, navigation }) => {
    const { shopId } = route.params;
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productForm, setProductForm] = useState({
        name: '',
        price: '',
    });

    useFocusEffect(
        useCallback(() => {
            loadProducts();
        }, [])
    );

    const loadProducts = async () => {
        try {
            const response = await productAPI.getAll(shopId);
            setProducts(response.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadProducts();
        setRefreshing(false);
    };

    const handleAddProduct = async () => {
        if (!productForm.name || !productForm.price) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        try {
            await productAPI.create(shopId, {
                name: productForm.name,
                price: parseFloat(productForm.price),
            });
            Alert.alert('Success', 'Product added successfully!');
            setShowAddProduct(false);
            setProductForm({ name: '', price: '' });
            loadProducts();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to add product');
        }
    };

    const handleUpdateProduct = async () => {
        if (!productForm.name || !productForm.price) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        try {
            await productAPI.update(shopId, editingProduct.id, {
                name: productForm.name,
                price: parseFloat(productForm.price),
            });
            Alert.alert('Success', 'Product updated successfully!');
            setEditingProduct(null);
            setProductForm({ name: '', price: '' });
            loadProducts();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to update product');
        }
    };

    const handleToggleActive = async (product) => {
        try {
            await productAPI.update(shopId, product.id, {
                active: !product.active,
            });
            loadProducts();
        } catch (error) {
            Alert.alert('Error', 'Failed to update product');
        }
    };

    const handleDeleteProduct = (product) => {
        Alert.alert(
            'Delete Product',
            `Are you sure you want to delete "${product.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await productAPI.delete(shopId, product.id);
                            loadProducts();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete product');
                        }
                    },
                },
            ]
        );
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setProductForm({
            name: product.name,
            price: product.price.toString(),
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Products</Text>
                <Button
                    title="+ Add"
                    size="sm"
                    onPress={() => setShowAddProduct(true)}
                />
            </View>

            {/* Products List */}
            <ScrollView
                style={styles.productList}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {products.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cube-outline" size={64} color={colors.gray[300]} />
                        <Text style={styles.emptyTitle}>No Products Yet</Text>
                        <Text style={styles.emptyText}>Add your first product to get started</Text>
                    </View>
                ) : (
                    products.map((product) => (
                        <Card key={product.id} style={styles.productCard}>
                            <View style={styles.productInfo}>
                                <View style={styles.productHeader}>
                                    <Text style={styles.productName}>{product.name}</Text>
                                    <Badge variant={product.active ? 'success' : 'secondary'} size="sm">
                                        {product.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </View>
                                <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                            </View>
                            <View style={styles.productActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleToggleActive(product)}
                                >
                                    <Ionicons
                                        name={product.active ? 'eye-off-outline' : 'eye-outline'}
                                        size={22}
                                        color={colors.gray[500]}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => openEditModal(product)}
                                >
                                    <Ionicons name="pencil-outline" size={22} color={colors.primary.blue} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleDeleteProduct(product)}
                                >
                                    <Ionicons name="trash-outline" size={22} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ))
                )}
                <View style={{ height: spacing.xxxl }} />
            </ScrollView>

            {/* Add Product Modal */}
            <Modal
                visible={showAddProduct}
                onClose={() => setShowAddProduct(false)}
                title="Add New Product"
            >
                <Input
                    label="Product Name"
                    placeholder="Enter product name"
                    value={productForm.name}
                    onChangeText={(text) => setProductForm({ ...productForm, name: text })}
                    required
                />
                <Input
                    label="Price"
                    placeholder="Enter price"
                    value={productForm.price}
                    onChangeText={(text) => setProductForm({
                        ...productForm,
                        price: text.replace(/[^0-9.]/g, ''),
                    })}
                    keyboardType="decimal-pad"
                    prefix="₹"
                    required
                />
                <Button
                    title="Add Product"
                    onPress={handleAddProduct}
                    style={{ marginTop: spacing.md }}
                />
            </Modal>

            {/* Edit Product Modal */}
            <Modal
                visible={!!editingProduct}
                onClose={() => {
                    setEditingProduct(null);
                    setProductForm({ name: '', price: '' });
                }}
                title="Edit Product"
            >
                <Input
                    label="Product Name"
                    placeholder="Enter product name"
                    value={productForm.name}
                    onChangeText={(text) => setProductForm({ ...productForm, name: text })}
                    required
                />
                <Input
                    label="Price"
                    placeholder="Enter price"
                    value={productForm.price}
                    onChangeText={(text) => setProductForm({
                        ...productForm,
                        price: text.replace(/[^0-9.]/g, ''),
                    })}
                    keyboardType="decimal-pad"
                    prefix="₹"
                    required
                />
                <Button
                    title="Update Product"
                    onPress={handleUpdateProduct}
                    style={{ marginTop: spacing.md }}
                />
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray[50],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[100],
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        fontSize: fontSize.xl,
        fontWeight: '600',
        color: colors.gray[800],
        flex: 1,
        marginLeft: spacing.sm,
    },
    productList: {
        flex: 1,
        padding: spacing.md,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl * 2,
    },
    emptyTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.gray[600],
        marginTop: spacing.lg,
    },
    emptyText: {
        fontSize: fontSize.sm,
        color: colors.gray[400],
        marginTop: spacing.sm,
    },
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
        padding: spacing.md,
    },
    productInfo: {
        flex: 1,
    },
    productHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    productName: {
        fontSize: fontSize.md,
        fontWeight: '500',
        color: colors.gray[800],
        marginRight: spacing.sm,
    },
    productPrice: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.primary.blue,
        marginTop: spacing.xs,
    },
    productActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: spacing.sm,
        marginLeft: spacing.xs,
    },
});

export default ProductsScreen;
