// Error Boundary Component - Catches React errors and displays fallback UI
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.gray[50],
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.error,
        marginBottom: 12,
    },
    message: {
        fontSize: 14,
        color: colors.gray[600],
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        backgroundColor: colors.primary.blue,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;
