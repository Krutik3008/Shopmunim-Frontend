// Sign Up Screen with Phone + OTP authentication
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Keyboard,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import { colors, spacing, borderRadius } from '../../theme';
import { isValidPhone, isValidOTP } from '../../utils/helpers';
import { useRef } from 'react';
import { Animated } from 'react-native';

const SignUpScreen = ({ navigation }) => {
    const { login } = useAuth();
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [mockOtp, setMockOtp] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(true);

    // Toast notification state
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const [toastType, setToastType] = useState('success');
    const toastAnim = useRef(new Animated.Value(0)).current;
    const toastTimer = useRef(null);

    const showToast = (message, type = 'success') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
        Animated.spring(toastAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();
        toastTimer.current = setTimeout(() => {
            Animated.timing(toastAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setToastVisible(false));
        }, 3000);
    };

    const handleSendOTP = async () => {
        Keyboard.dismiss();
        if (!name.trim()) {
            showToast('Please enter your name');
            return;
        }
        if (!isValidPhone(phone)) {
            showToast('Please Enter a Valid Phone Number');
            return;
        }

        setLoading(true);
        try {
            console.log('Sending OTP to:', phone);
            const response = await authAPI.sendOTP(phone, name, false, termsAccepted);
            console.log('OTP Response:', response.data);
            const otpCode = response.data.mock_otp || '123456';
            setMockOtp(otpCode);
            showToast('OTP Sent Successfully');
            setStep('otp');
        } catch (error) {
            console.log('OTP Error:', error.response?.data || error.message);
            const errorDetail = error.response?.data?.detail || 'OTP Not Sent';
            showToast(errorDetail, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        Keyboard.dismiss();
        if (!isValidOTP(otp)) {
            showToast('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.verifyOTP(phone, otp, name, termsAccepted);
            await login(response.data.token, response.data.user);
        } catch (error) {
            showToast(error.response?.data?.detail || 'Invalid OTP', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneChange = (text) => {
        const cleaned = text.replace(/\D/g, '').slice(0, 10);
        setPhone(cleaned);
    };

    const handleOTPChange = (text) => {
        const cleaned = text.replace(/\D/g, '').slice(0, 6);
        setOtp(cleaned);
    };

    // Gradient-like Text using colored spans
    const GradientTitle = () => (
        <View style={styles.titleContainer}>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#3B82F6' }}>Sh</Text>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366F1' }}>op</Text>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#8B5CF6' }}>Mu</Text>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#A855F7' }}>ni</Text>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#EC4899' }}>m</Text>
        </View>
    );

    return (
        <LinearGradient
            colors={['#E0E7FF', '#EDE9FE', '#FCE7F3']}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <View style={styles.scrollContent}>
                    {/* Logo & Title */}
                    <View style={styles.header}>
                        <LinearGradient
                            colors={['#3B82F6', '#8B5CF6']}
                            style={styles.logoContainer}
                        >
                            <Ionicons name="layers-outline" size={28} color="#fff" />
                        </LinearGradient>
                        <GradientTitle />
                        <Text style={styles.subtitle}>Digital Credit & Payment Ledger</Text>
                    </View>

                    {/* Auth Card */}
                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Create Account</Text>
                        <Text style={styles.cardDescription}>
                            {step === 'phone'
                                ? 'Join ShopMunim to manage your ledgers digitally'
                                : 'Enter the OTP sent to your phone'}
                        </Text>

                        {step === 'phone' ? (
                            <View style={styles.form}>
                                <Input
                                    label="Name"
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChangeText={setName}
                                    required
                                    style={styles.input}
                                />
                                <Input
                                    label="Phone Number"
                                    placeholder="Enter 10-digit number"
                                    value={phone}
                                    onChangeText={handlePhoneChange}
                                    keyboardType="phone-pad"
                                    prefix="+91"
                                    required
                                    style={styles.input}
                                />
                                <Button
                                    title="Create Account"
                                    onPress={handleSendOTP}
                                    loading={loading}
                                    disabled={!phone || !name || !termsAccepted}
                                    size="md"
                                    icon={<Ionicons name="person-add" size={16} color="#fff" />}
                                    style={styles.button}
                                />
                                <TouchableOpacity
                                    style={styles.termsContainer}
                                    onPress={() => {
                                        const newVal = !termsAccepted;
                                        setTermsAccepted(newVal);
                                        if (!newVal) {
                                            showToast('Please accept Terms and Conditions', 'error');
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                                        {termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                    <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink}>Terms of Services</Text> and <Text style={styles.termsLink}>Privacy Policy</Text></Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.form}>
                                <Input
                                    label="Enter OTP"
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChangeText={handleOTPChange}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    required
                                    style={styles.input}
                                />
                                {mockOtp && (
                                    <Text style={styles.mockOtp}>Mock OTP: {mockOtp}</Text>
                                )}
                                <Button
                                    title="Verify & Join"
                                    onPress={handleVerifyOTP}
                                    loading={loading}
                                    disabled={!otp}
                                    size="md"
                                    icon={<Ionicons name="checkmark-circle" size={16} color="#fff" />}
                                    style={styles.button}
                                />
                                <Button
                                    title="Back to Phone Number"
                                    variant="ghost"
                                    onPress={() => {
                                        setStep('phone');
                                        setOtp('');
                                        setMockOtp('');
                                    }}
                                    style={styles.backButton}
                                />
                            </View>
                        )}

                        {step === 'phone' && (
                            <View style={styles.footerLinkContainer}>
                                <Text style={styles.footerText}>Already have an account? </Text>
                                <Button
                                    title="Login"
                                    variant="link"
                                    onPress={() => navigation.navigate('Login')}
                                    style={styles.linkButton}
                                    textStyle={styles.linkButtonText}
                                />
                            </View>
                        )}
                    </Card>

                    {/* Features */}
                    <View style={styles.features}>
                        <View style={styles.featureItem}>
                            <View style={styles.featureIcon}>
                                <Ionicons name="bar-chart-outline" size={20} color="#3B82F6" />
                            </View>
                            <Text style={styles.featureTitle}>Digital Ledger</Text>
                            <Text style={styles.featureText}>Track credits & payments</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <View style={styles.featureIcon}>
                                <Text style={styles.rupeeIcon}>₹</Text>
                            </View>
                            <Text style={styles.featureTitle}>UPI Payments</Text>
                            <Text style={styles.featureText}>Accept payments easily</Text>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Custom Toast Notification */}
            {toastVisible && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            opacity: toastAnim,
                            transform: [{
                                translateY: toastAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0]
                                })
                            }]
                        }
                    ]}
                >
                    <View style={styles.toastContent}>
                        <View style={[styles.toastIcon, toastType === 'error' && { backgroundColor: '#EF4444' }]}>
                            <Ionicons name={toastType === 'error' ? "alert-circle" : "checkmark-circle"} size={20} color="#fff" />
                        </View>
                        <Text style={styles.toastText}>{toastMessage}</Text>
                    </View>
                </Animated.View>
            )}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingVertical: 40,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    titleContainer: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    logoContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 14,
        color: colors.gray[600],
    },
    card: {
        padding: 20,
        marginHorizontal: 0,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.gray[800],
        textAlign: 'center',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: colors.gray[600],
        textAlign: 'center',
        marginBottom: 16,
    },
    form: {
        marginTop: 8,
    },
    input: {
        marginBottom: 12,
    },
    button: {
        marginTop: 8,
    },
    backButton: {
        marginTop: 8,
    },
    mockOtp: {
        fontSize: 12,
        color: '#3B82F6',
        textAlign: 'center',
        marginBottom: 8,
    },
    features: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 24,
    },
    featureItem: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 12,
        padding: 16,
        flex: 1,
        marginHorizontal: 6,
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    rupeeIcon: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3B82F6',
    },
    featureTitle: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.gray[700],
        marginBottom: 2,
    },
    featureText: {
        fontSize: 10,
        color: colors.gray[500],
        textAlign: 'center',
    },
    footerLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    footerText: {
        fontSize: 14,
        color: colors.gray[600],
    },
    linkButton: {
        minWidth: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
        height: 'auto',
    },
    linkButtonText: {
        color: colors.primary.blue,
        fontWeight: 'bold',
        fontSize: 14,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 40,
        right: 10,
        zIndex: 999,
        alignItems: 'flex-end',
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        gap: 10,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    toastIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#9CA3AF',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    checkboxChecked: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    termsText: {
        fontSize: 12,
        color: '#6B7280',
        flexShrink: 1,
    },
    termsLink: {
        color: '#3B82F6',
        fontWeight: '600',
    },
});

export default SignUpScreen;
