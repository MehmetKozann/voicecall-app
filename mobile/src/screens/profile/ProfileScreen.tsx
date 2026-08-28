import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainNavigationProp } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/common/Avatar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { MediaPickerService } from '../../services/mediaPicker';
import { uploadApi } from '../../api/uploadApi';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const { user, updateUser, logout } = useAuthStore();

  const [username, setUsername] = useState(user?.username || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handlePickAvatar = async () => {
    const media = await MediaPickerService.pickImageFromGallery();
    if (media) {
      try {
        const uploaded = await uploadApi.uploadFile({
          uri: media.uri,
          name: media.name,
          type: media.type,
        });
        await updateUser({ avatarUrl: uploaded.url });
      } catch (err) {
        console.warn('Avatar upload failed:', err);
      }
    }
  };

  const handleSave = async () => {
    if (!username.trim() || username === user?.username) return;
    setIsSaving(true);
    try {
      await updateUser({ username: username.trim() });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <Avatar name={user?.username || 'U'} url={user?.avatarUrl} size={96} />
        <TouchableOpacity activeOpacity={0.7} onPress={handlePickAvatar} style={styles.changePhotoBtn}>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Form */}
      <View style={styles.form}>
        <Input
          label="Email Address"
          value={user?.email}
          editable={false}
          style={styles.disabledInput}
        />

        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        {saveSuccess && (
          <Text style={styles.successText}>Profile updated successfully!</Text>
        )}

        <Button
          title="Save Changes"
          onPress={handleSave}
          isLoading={isSaving}
          disabled={!username.trim() || username === user?.username}
          style={styles.saveBtn}
        />

        <Button
          title="Sign Out"
          variant="danger"
          onPress={logout}
          style={styles.logoutBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    paddingBottom: 40,
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
  avatarSection: {
    alignItems: 'center',
    marginVertical: 28,
  },
  changePhotoBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  changePhotoText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    paddingHorizontal: 24,
  },
  disabledInput: {
    color: '#64748B',
  },
  successText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  saveBtn: {
    marginTop: 12,
  },
  logoutBtn: {
    marginTop: 16,
  },
});
