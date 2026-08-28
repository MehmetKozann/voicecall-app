import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Message } from '../../types/chat.types';
import { VoicePlayer } from './VoicePlayer';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSent,
}) => {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStatus = () => {
    if (!isSent) return null;
    switch (message.status) {
      case 'PENDING':
        return <Text style={styles.statusIcon}>🕒</Text>;
      case 'SENT':
        return <Text style={styles.statusIcon}>✓</Text>;
      case 'DELIVERED':
        return <Text style={[styles.statusIcon, styles.deliveredIcon]}>✓✓</Text>;
      case 'READ':
        return <Text style={[styles.statusIcon, styles.readIcon]}>✓✓</Text>;
      case 'FAILED':
        return <Text style={[styles.statusIcon, styles.failedIcon]}>⚠️</Text>;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (message.type) {
      case 'IMAGE':
        const imageAttachment = message.attachments?.[0];
        return (
          <View style={styles.mediaContainer}>
            {imageAttachment && (
              <Image
                source={{ uri: imageAttachment.url }}
                style={styles.imageAttachment}
              />
            )}
            {message.content && <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>{message.content}</Text>}
          </View>
        );

      case 'VOICE':
        const voiceAttachment = message.attachments?.[0];
        return voiceAttachment ? (
          <VoicePlayer
            url={voiceAttachment.url}
            duration={voiceAttachment.duration}
            isSent={isSent}
          />
        ) : null;

      case 'FILE':
        const fileAttachment = message.attachments?.[0];
        return (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => fileAttachment && Linking.openURL(fileAttachment.url)}
            style={styles.fileContainer}
          >
            <Text style={styles.fileIcon}>📄</Text>
            <View style={styles.fileDetails}>
              <Text
                style={[styles.fileName, isSent ? styles.sentText : styles.receivedText]}
                numberOfLines={1}
              >
                {fileAttachment?.fileName || 'Attachment'}
              </Text>
              <Text style={styles.fileSize}>
                {fileAttachment?.fileSize ? `${Math.round(fileAttachment.fileSize / 1024)} KB` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        );

      case 'TEXT':
      default:
        return (
          <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
            {message.content}
          </Text>
        );
    }
  };

  return (
    <View style={[styles.container, isSent ? styles.sentContainer : styles.receivedContainer]}>
      <View style={[styles.bubble, isSent ? styles.sentBubble : styles.receivedBubble]}>
        {renderContent()}
        <View style={styles.metadata}>
          <Text style={[styles.timeText, isSent ? styles.sentTimeText : styles.receivedTimeText]}>
            {formatTime(message.createdAt)}
          </Text>
          {renderStatus()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 12,
    width: '100%',
    flexDirection: 'row',
  },
  sentContainer: {
    justifyContent: 'flex-end',
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sentBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  sentText: {
    color: '#FFFFFF',
  },
  receivedText: {
    color: '#F8FAFC',
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  imageAttachment: {
    width: 220,
    height: 160,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minWidth: 160,
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  sentTimeText: {
    color: '#C7D2FE',
  },
  receivedTimeText: {
    color: '#64748B',
  },
  statusIcon: {
    fontSize: 11,
    marginLeft: 4,
    color: '#C7D2FE',
  },
  deliveredIcon: {
    color: '#CBD5E1',
  },
  readIcon: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  failedIcon: {
    color: '#F87171',
  },
});
