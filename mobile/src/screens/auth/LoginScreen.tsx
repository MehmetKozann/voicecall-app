import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const LoginScreen: React.FC = () => {
  const [name, setName] = useState('');
  const { quickLogin, isLoading, error, clearError } = useAuthStore();

  const handleStart = async () => {
    if (!name.trim()) return;
    await quickLogin(name.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.brandEmoji}>💬</Text>
          </View>
          <Text style={styles.title}>VoiceCall</Text>
          <Text style={styles.subtitle}>
            Enter your name to start private, real-time messaging
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Simple Name Form */}
        <View style={styles.form}>
          <Input
            label="Your Name or Nickname"
            placeholder="e.g. Mehmet, Alice, Bob"
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (error) clearError();
            }}
            autoFocus
            maxLength={30}
            onSubmitEditing={handleStart}
            returnKeyType="go"
          />

          <Button
            title="Start Chatting"
            onPress={handleStart}
            isLoading={isLoading}
            disabled={!name.trim()}
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            🔒 End-to-end transport encrypted via TLS & WSS
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandEmoji: {
    fontSize: 34,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  submitBtn: {
    marginTop: 12,
  },
  securityNote: {
    marginTop: 40,
    alignItems: 'center',
  },
  securityText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
});
