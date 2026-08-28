import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Conversation } from '../../types/chat.types';
import { Avatar } from '../common/Avatar';

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onPress,
}) => {
  const isDirect = conversation.type === 'DIRECT';
  const name = isDirect
    ? conversation.otherMember?.username || 'Chat'
    : conversation.title || 'Group Chat';
  const isOnline = isDirect ? !!conversation.otherMember?.isOnline : false;
  const avatarUrl = isDirect ? conversation.otherMember?.avatarUrl : conversation.avatarUrl;

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = () => {
    const msg = conversation.lastMessage;
    if (!msg) return 'No messages yet';
    if (msg.type === 'IMAGE') return '📷 Photo';
    if (msg.type === 'VOICE') return '🎤 Voice message';
    if (msg.type === 'FILE') return '📄 Document';
    return msg.content || '';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.container}
    >
      <Avatar
        name={name}
        url={avatarUrl}
        size={52}
        isOnline={isOnline}
        showOnlineBadge={isDirect}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.time}>{formatTime(conversation.updatedAt)}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {getLastMessagePreview()}
          </Text>

          {conversation.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: '#94A3B8',
    fontSize: 14,
    flex: 1,
  },
  badge: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
