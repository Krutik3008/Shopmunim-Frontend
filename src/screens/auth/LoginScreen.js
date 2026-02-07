// Login Screen with Phone + OTP authentication
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import { colors, spacing, borderRadius } from '../../theme';
import { isValidPhone, isValidOTP } from '../../utils/helpers';

const LoginScreen = () => {
    const { login } = useAuth();
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [mockOtp, setMockOtp] = useState('');

    const handleSendOTP = async () => {
        if (!isValidPhone(phone)) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);
        try {
            console.log('Sending OTP to:', phone);
            const response = await authAPI.sendOTP(phone, name || undefined);
            console.log('OTP Response:', response.data);
            const otpCode = response.data.mock_otp || '123456';
            setMockOtp(otpCode);
            setStep('otp');
            // Show alert after state update
            // setTimeout(() => {
            //     Alert.alert('OTP Sent!', 'Please check your phone for OTP');
            // }, 100);
        } catch (error) {
            console.log('OTP Error:', error.response?.data || error.message);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to send OTP. Check backend connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!isValidOTP(otp)) {
            Alert.alert('Error', 'Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.verifyOTP(phone, otp, name || undefined);
            await login(response.data.token, response.data.user);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.detail || 'Invalid OTP');
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
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
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
                        <Text style={styles.cardTitle}>Welcome</Text>
                        <Text style={styles.cardDescription}>
                            {step === 'phone'
                                ? 'Enter your phone number to get started'
                                : 'Enter the OTP sent to your phone'}
                        </Text>

                        {step === 'phone' ? (
                            <View style={styles.form}>
                                <Input
                                    label="Name (Optional)"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChangeText={setName}
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
                                    title="Send OTP"
                                    onPress={handleSendOTP}
                                    loading={loading}
                                    disabled={!phone}
                                    size="md"
                                    icon={<Ionicons name="send" size={16} color="#fff" />}
                                    style={styles.button}
                                />
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
                                    title="Verify & Continue"
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
                </ScrollView>
            </KeyboardAvoidingView>
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
    title: {
        fontSize: 32,
        fontWeight: 'bold',
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
});

export default LoginScreen;
