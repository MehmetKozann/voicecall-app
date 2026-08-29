import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChatScreenRouteProp, MainNavigationProp } from '../../navigation/types';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socket';
import { uploadApi } from '../../api/uploadApi';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { MessageInput } from '../../components/chat/MessageInput';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { Avatar } from '../../components/common/Avatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { PickedMedia } from '../../services/mediaPicker';

import { useCallStore } from '../../store/callStore';

export const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<MainNavigationProp>();
  const { conversationId, title, avatarUrl, isOnline: initialOnline, recipientId } = route.params;

  const currentUserId = useAuthStore((state) => state.user?.id);
  const {
    messages,
    conversations,
    typingUsers,
    isLoadingMessages,
    setActiveConversation,
    sendMessage,
  } = useChatStore();
  const startCall = useCallStore((state) => state.startCall);

  const conversationMessages = messages[conversationId] || [];
  const activeTyping = typingUsers[conversationId] || {};
  const typingUsernames = Object.values(activeTyping);

  // Find other participant for calling
  const currentConv = conversations.find((c) => c.id === conversationId);
  const otherMember = currentConv?.members?.find((m) => m.userId !== currentUserId)?.user;

  const handleStartCall = () => {
    const targetUserId = recipientId || otherMember?.id || currentConv?.members?.find((m) => m.userId !== currentUserId)?.userId;
    if (targetUserId) {
      console.log('Initiating voice call to user:', targetUserId);
      startCall(targetUserId, title, conversationId, avatarUrl);
    } else {
      console.warn('Cannot start call: target user ID not found');
    }
  };

  useEffect(() => {
    setActiveConversation(conversationId);
    return () => {
      setActiveConversation(null);
    };
  }, [conversationId, setActiveConversation]);

  // Send Text Message
  const handleSendText = (text: string) => {
    sendMessage(conversationId, text, 'TEXT');
  };

  // Send Image or File Attachment
  const handleSendMedia = async (media: PickedMedia, type: 'IMAGE' | 'FILE') => {
    try {
      const uploaded = await uploadApi.uploadFile({
        uri: media.uri,
        name: media.name,
        type: media.type,
      });

      await sendMessage(conversationId, undefined, type, uploaded);
    } catch (err) {
      console.warn('Failed to upload media:', err);
    }
  };

  // Send Voice Note
  const handleSendVoice = async (voice: {
    uri: string;
    name: string;
    type: string;
    duration: number;
  }) => {
    try {
      const uploaded = await uploadApi.uploadFile({
        uri: voice.uri,
        name: voice.name,
        type: voice.type,
        duration: voice.duration,
      });

      await sendMessage(conversationId, undefined, 'VOICE', uploaded);
    } catch (err) {
      console.warn('Failed to upload voice note:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Avatar
          name={title}
          url={avatarUrl}
          size={40}
          isOnline={initialOnline}
          showOnlineBadge
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerStatus}>
            {initialOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        {/* Voice Call Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleStartCall}
          style={styles.callBtn}
        >
          <Text style={styles.callBtnIcon}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Message List */}
      {isLoadingMessages && conversationMessages.length === 0 ? (
        <LoadingSpinner fullScreen={false} message="Loading conversation..." />
      ) : (
        <FlatList
          data={conversationMessages}
          keyExtractor={(item) => item.id || item.tempId || String(Math.random())}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isSent={item.senderId === currentUserId}
            />
          )}
          inverted
          contentContainerStyle={styles.messagesList}
        />
      )}

      {/* Typing Indicator */}
      <TypingIndicator usernames={typingUsernames} />

      {/* Input Bar */}
      <MessageInput
        onSendText={handleSendText}
        onSendMedia={handleSendMedia}
        onSendVoice={handleSendVoice}
        onTypingStart={() => socketService.sendTypingStart(conversationId)}
        onTypingStop={() => socketService.sendTypingStop(conversationId)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 54,
    paddingBottom: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  backIcon: {
    color: '#818CF8',
    fontSize: 34,
    fontWeight: '300',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  headerStatus: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 1,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  callBtnIcon: {
    fontSize: 18,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
});
