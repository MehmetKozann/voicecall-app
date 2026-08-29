import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainNavigationProp } from '../../navigation/types';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { ConversationItem } from '../../components/chat/ConversationItem';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';

export const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const user = useAuthStore((state) => state.user);
  const {
    conversations,
    isLoadingConversations,
    fetchConversations,
    setupSocketListeners,
  } = useChatStore();

  useEffect(() => {
    fetchConversations();
    const unsub = setupSocketListeners();
    return () => unsub();
  }, [fetchConversations, setupSocketListeners]);

  const handleOpenChat = (conversation: any) => {
    const isDirect = conversation.type === 'DIRECT';
    const title = isDirect
      ? conversation.otherMember?.username || 'Chat'
      : conversation.title || 'Group Chat';
    const isOnline = isDirect ? !!conversation.otherMember?.isOnline : false;
    const avatarUrl = isDirect
      ? conversation.otherMember?.avatarUrl
      : conversation.avatarUrl;

    const otherMemberId = isDirect ? (conversation.otherMember?.id || conversation.members?.find((m: any) => m.userId !== user?.id)?.userId) : undefined;

    navigation.navigate('Chat', {
      conversationId: conversation.id,
      title,
      avatarUrl,
      isOnline,
      recipientId: otherMemberId,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.profileBtn}
        >
          <Avatar name={user?.username || 'U'} url={user?.avatarUrl} size={36} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsBtn}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => handleOpenChat(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingConversations}
            onRefresh={fetchConversations}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          !isLoadingConversations ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Start a private chat with someone to begin messaging securely.
              </Text>
              <Button
                title="Start New Chat"
                onPress={() => navigation.navigate('NewChat')}
                style={styles.newChatBtn}
              />
            </View>
          ) : null
        }
      />

      {/* Floating Action Button */}
      {conversations.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('NewChat')}
          style={styles.fab}
        >
          <Text style={styles.fabIcon}>✏️</Text>
        </TouchableOpacity>
      )}
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
  profileBtn: {
    padding: 2,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  settingsBtn: {
    padding: 6,
  },
  settingsIcon: {
    fontSize: 20,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  newChatBtn: {
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 22,
  },
});
