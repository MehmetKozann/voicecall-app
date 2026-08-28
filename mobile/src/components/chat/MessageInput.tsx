import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { VoiceRecorder } from './VoiceRecorder';
import { MediaPickerService, PickedMedia } from '../../services/mediaPicker';

interface MessageInputProps {
  onSendText: (text: string) => void;
  onSendMedia: (media: PickedMedia, type: 'IMAGE' | 'FILE') => void;
  onSendVoice: (voiceFile: { uri: string; name: string; type: string; duration: number }) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendText,
  onSendMedia,
  onSendVoice,
  onTypingStart,
  onTypingStop,
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (val: string) => {
    setText(val);

    if (val.trim().length > 0) {
      onTypingStart();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        onTypingStop();
      }, 1500);
    } else {
      onTypingStop();
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSendText(text.trim());
    setText('');
    onTypingStop();
  };

  const pickGallery = async () => {
    setShowAttachMenu(false);
    const media = await MediaPickerService.pickImageFromGallery();
    if (media) onSendMedia(media, 'IMAGE');
  };

  const pickCamera = async () => {
    setShowAttachMenu(false);
    const media = await MediaPickerService.takePhoto();
    if (media) onSendMedia(media, 'IMAGE');
  };

  const pickDocument = async () => {
    setShowAttachMenu(false);
    const doc = await MediaPickerService.pickDocument();
    if (doc) onSendMedia(doc, 'FILE');
  };

  if (isRecording) {
    return (
      <VoiceRecorder
        onSend={(voice) => {
          setIsRecording(false);
          onSendVoice(voice);
        }}
        onCancel={() => setIsRecording(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowAttachMenu(true)}
        style={styles.actionButton}
      >
        <Text style={styles.actionIcon}>+</Text>
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#64748B"
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={2000}
        />
      </View>

      {text.trim().length > 0 ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSend}
          style={styles.sendButton}
        >
          <Text style={styles.sendIcon}>➔</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsRecording(true)}
          style={styles.micButton}
        >
          <Text style={styles.micIcon}>🎤</Text>
        </TouchableOpacity>
      )}

      {/* Attachment Modal */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAttachMenu(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>Share Content</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity onPress={pickGallery} style={styles.optionItem}>
                  <View style={[styles.iconCircle, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={styles.optionEmoji}>🖼️</Text>
                  </View>
                  <Text style={styles.optionLabel}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={pickCamera} style={styles.optionItem}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EC4899' }]}>
                    <Text style={styles.optionEmoji}>📷</Text>
                  </View>
                  <Text style={styles.optionLabel}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={pickDocument} style={styles.optionItem}>
                  <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.optionEmoji}>📄</Text>
                  </View>
                  <Text style={styles.optionLabel}>Document</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  actionIcon: {
    color: '#818CF8',
    fontSize: 22,
    fontWeight: '600',
  },
  inputWrapper: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  input: {
    color: '#F8FAFC',
    fontSize: 15,
    padding: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  micIcon: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  menuTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  optionItem: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
});
