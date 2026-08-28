import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainNavigationProp } from '../../navigation/types';
import { userApi } from '../../api/userApi';
import { useChatStore } from '../../store/chatStore';
import { Avatar } from '../../components/common/Avatar';
import { User } from '../../types/user.types';

export const NewChatScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const createDirectChat = useChatStore((state) => state.createDirectChat);

  const loadUsers = React.useCallback(async (text: string = '') => {
    setIsSearching(true);
    try {
      const users = await userApi.searchUsers(text.trim());
      setResults(users);
    } catch (err) {
      console.warn('User search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers('');
  }, [loadUsers]);

  const handleSearch = (text: string) => {
    setQuery(text);
    loadUsers(text);
  };

  const handleSelectUser = async (user: User) => {
    try {
      const conv = await createDirectChat(user.id);
      navigation.replace('Chat', {
        conversationId: conv.id,
        title: user.username,
        avatarUrl: user.avatarUrl,
        isOnline: user.isOnline,
      });
    } catch (err) {
      console.warn('Failed to start conversation:', err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Conversation</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or email..."
          placeholderTextColor="#64748B"
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoFocus
        />
        {isSearching && <ActivityIndicator color="#6366F1" size="small" />}
      </View>

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleSelectUser(item)}
            style={styles.userItem}
          >
            <Avatar name={item.username} url={item.avatarUrl} size={46} isOnline={item.isOnline} showOnlineBadge />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.trim().length > 0 && !isSearching ? (
            <View style={styles.emptyResults}>
              <Text style={styles.emptyText}>No users found matching "{query}"</Text>
            </View>
          ) : null
        }
      />
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: '#818CF8',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#F8FAFC',
    fontSize: 15,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  userInfo: {
    marginLeft: 14,
  },
  username: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  email: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  emptyResults: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});
