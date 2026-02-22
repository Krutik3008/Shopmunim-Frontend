import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, ActionSheetIOS, Platform, Modal, Animated, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../context/AuthContext';
import { authAPI } from '../../../api';
import { colors, gradients, shadows } from '../../../theme';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const EditProfileScreen = () => {
    const navigation = useNavigation();
    const { user, updateProfile, updateUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [loading, setLoading] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [showPhotoSheet, setShowPhotoSheet] = useState(false);
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const existingPhoto = user?.profile_photo || null;

    const openSheet = () => {
        setShowPhotoSheet(true);
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
    };

    const closeSheet = (callback) => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => {
            setShowPhotoSheet(false);
            if (callback) callback();
        });
    };

    const pickImage = async (source) => {
        try {
            let result;

            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.5,
                    base64: true,
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Gallery access is required to choose a photo.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.5,
                    base64: true,
                });
            }

            if (!result.canceled && result.assets?.[0]) {
                setProfilePhoto(result.assets[0]);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const showImageOptions = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) pickImage('camera');
                    else if (buttonIndex === 2) pickImage('gallery');
                }
            );
        } else {
            openSheet();
        }
    };

    const handleRemovePhoto = async () => {
        setLoading(true);
        try {
            const result = await authAPI.removeProfilePhoto();
            console.log('Photo removal response:', result.data?.message);
            if (result.data?.user) {
                await updateUser(result.data.user);
                setProfilePhoto(null);
                Alert.alert('Success', 'Profile photo removed successfully');
            }
        } catch (error) {
            console.error('Photo removal failed:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to remove photo: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        setLoading(true);

        try {
            // 1. Upload photo if a new one was picked
            if (profilePhoto?.base64) {
                console.log('Uploading profile photo, base64 length:', profilePhoto.base64.length);
                try {
                    const photoResult = await authAPI.uploadProfilePhoto(profilePhoto.base64);
                    console.log('Photo upload response:', photoResult.data?.message);
                    if (photoResult.data?.user) {
                        await updateUser(photoResult.data.user);
                    }
                } catch (photoError) {
                    console.error('Photo upload failed:', photoError.response?.data || photoError.message);
                    setLoading(false);
                    Alert.alert('Error', 'Failed to upload photo: ' + (photoError.response?.data?.detail || photoError.message));
                    return;
                }
            }

            // 2. Update name
            const result = await updateProfile({ name });
            setLoading(false);

            if (result.success) {
                Alert.alert('Success', 'Profile updated successfully');
                navigation.goBack();
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error) {
            setLoading(false);
            console.error('Save error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to save changes. Please try again.');
        }
    };

    const getAvatarSource = () => {
        if (profilePhoto?.uri) return { uri: profilePhoto.uri };
        if (existingPhoto) return { uri: `data:image/jpeg;base64,${existingPhoto}` };
        return null;
    };

    const avatarSource = getAvatarSource();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.gray[800]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Modify Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity style={styles.avatarWrapper} onPress={showImageOptions} activeOpacity={0.8}>
                        <View style={styles.avatar}>
                            {avatarSource ? (
                                <Image source={avatarSource} style={styles.avatarImage} />
                            ) : (
                                <Ionicons name="person" size={42} color={colors.primary.purple} />
                            )}
                        </View>
                        <View style={styles.editBadge}>
                            <Ionicons name="camera" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={showImageOptions} activeOpacity={0.7}>
                        <Text style={styles.avatarLabel}>Tap to change photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
                <View style={styles.profileCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Display Name</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={18} color={colors.gray[400]} />
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your full name"
                                placeholderTextColor={colors.gray[400]}
                            />
                        </View>
                    </View>

                    <View style={[styles.inputGroup, { borderBottomWidth: 0, marginBottom: 0 }]}>
                        <Text style={styles.fieldLabel}>Verified Phone</Text>
                        <View style={[styles.inputWrapper, styles.disabledWrapper]}>
                            <Ionicons name="call-outline" size={18} color={colors.gray[300]} />
                            <TextInput
                                style={[styles.input, styles.disabledInput]}
                                value={phone}
                                editable={false}
                            />
                            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        </View>
                        <Text style={styles.helperText}>This cannot be modified for security reasons.</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8}>
                    <LinearGradient
                        colors={loading ? [colors.gray[300], colors.gray[300]] : gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveButton}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Apply Changes</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Custom Bottom Sheet for Photo Options */}
            <Modal visible={showPhotoSheet} transparent animationType="none" onRequestClose={() => closeSheet()}>
                {/* Backdrop */}
                <Animated.View style={[styles.sheetBackdrop, { opacity: fadeAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet()} />
                </Animated.View>

                {/* Sheet Content */}
                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.sheetHandle} />
                    <Text style={styles.sheetTitle}>Change Profile Photo</Text>
                    <Text style={styles.sheetSubtitle}>Choose how you'd like to update your photo</Text>

                    <View style={styles.sheetOptions}>
                        <TouchableOpacity
                            style={styles.sheetOption}
                            activeOpacity={0.7}
                            onPress={() => closeSheet(() => pickImage('camera'))}
                        >
                            <LinearGradient
                                colors={['#7C3AED', '#6D28D9']}
                                style={styles.sheetOptionIcon}
                            >
                                <Ionicons name="camera" size={22} color="#fff" />
                            </LinearGradient>
                            <View style={styles.sheetOptionText}>
                                <Text style={styles.sheetOptionTitle}>Take Photo</Text>
                                <Text style={styles.sheetOptionDesc}>Use your camera</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.gray[300]} />
                        </TouchableOpacity>

                        <View style={styles.sheetDivider} />

                        <TouchableOpacity
                            style={styles.sheetOption}
                            activeOpacity={0.7}
                            onPress={() => closeSheet(() => pickImage('gallery'))}
                        >
                            <LinearGradient
                                colors={['#2563EB', '#1D4ED8']}
                                style={styles.sheetOptionIcon}
                            >
                                <Ionicons name="images" size={22} color="#fff" />
                            </LinearGradient>
                            <View style={styles.sheetOptionText}>
                                <Text style={styles.sheetOptionTitle}>Choose from Gallery</Text>
                                <Text style={styles.sheetOptionDesc}>Pick an existing photo</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.gray[300]} />
                        </TouchableOpacity>

                        {(profilePhoto || existingPhoto) && (
                            <>
                                <View style={styles.sheetDivider} />
                                <TouchableOpacity
                                    style={styles.sheetOption}
                                    activeOpacity={0.7}
                                    onPress={() => closeSheet(() => handleRemovePhoto())}
                                >
                                    <View style={[styles.sheetOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                                        <Ionicons name="trash-outline" size={22} color="#EF4444" />
                                    </View>
                                    <View style={styles.sheetOptionText}>
                                        <Text style={[styles.sheetOptionTitle, { color: '#EF4444' }]}>Remove Photo</Text>
                                        <Text style={styles.sheetOptionDesc}>Use default avatar</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.gray[300]} />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    <TouchableOpacity style={styles.sheetCancel} activeOpacity={0.7} onPress={() => closeSheet()}>
                        <Text style={styles.sheetCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gray[50] },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.gray[900] },
    backButton: { padding: 4 },
    content: { flex: 1, padding: 16 },

    // Avatar
    avatarSection: { alignItems: 'center', marginTop: 12, marginBottom: 32 },
    avatarWrapper: { position: 'relative' },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        overflow: 'hidden',
        ...shadows.md,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 45,
    },
    editBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary.purple,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    avatarLabel: { fontSize: 13, color: colors.primary.blue, fontWeight: '600', marginTop: 12 },

    // Profile Card
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.gray[400],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
        marginLeft: 4
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...shadows.sm,
    },
    inputGroup: { marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.gray[50] },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray[500], marginBottom: 10 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray[50],
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: colors.gray[100]
    },
    disabledWrapper: { backgroundColor: '#F8FAFC' },
    input: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 10,
        fontSize: 15,
        color: colors.gray[900],
        fontWeight: '500',
    },
    disabledInput: { color: colors.gray[400] },
    helperText: { fontSize: 11, color: colors.gray[400], marginTop: 8, fontWeight: '500' },

    // Footer
    footer: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

    // Bottom Sheet
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        ...shadows.lg,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gray[200],
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.gray[900],
        textAlign: 'center',
    },
    sheetSubtitle: {
        fontSize: 13,
        color: colors.gray[400],
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 24,
    },
    sheetOptions: {
        backgroundColor: colors.gray[50],
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gray[100],
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    sheetOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetOptionText: {
        flex: 1,
        marginLeft: 14,
    },
    sheetOptionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.gray[900],
    },
    sheetOptionDesc: {
        fontSize: 12,
        color: colors.gray[400],
        marginTop: 2,
    },
    sheetDivider: {
        height: 1,
        backgroundColor: colors.gray[100],
        marginHorizontal: 16,
    },
    sheetCancel: {
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: colors.gray[50],
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray[100],
    },
    sheetCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.gray[500],
    },
});

export default EditProfileScreen;
