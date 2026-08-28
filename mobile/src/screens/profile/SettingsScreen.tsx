import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainNavigationProp } from '../../navigation/types';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [readReceipts, setReadReceipts] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Settings Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Push Notifications</Text>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: '#334155', true: '#6366F1' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>In-App Sounds</Text>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: '#334155', true: '#6366F1' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Send Read Receipts</Text>
          <Switch
            value={readReceipts}
            onValueChange={setReadReceipts}
            trackColor={{ false: '#334155', true: '#6366F1' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Transport Security</Text>
          <Text style={styles.statusBadge}>TLS 1.3 / WSS</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>1.0.0 (Production)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Real-Time Protocol</Text>
          <Text style={styles.rowValue}>Socket.IO v4</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  backIcon: {
    color: '#818CF8',
    fontSize: 34,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowLabel: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '500',
  },
  rowValue: {
    color: '#94A3B8',
    fontSize: 14,
  },
  statusBadge: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
});
