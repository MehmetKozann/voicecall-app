import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export const SplashScreen: React.FC = () => {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>💬</Text>
        </View>
        <Text style={styles.title}>VoiceCall</Text>
        <Text style={styles.subtitle}>Private & Real-Time Messaging</Text>
      </View>

      <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366F1',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 38,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 6,
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});
