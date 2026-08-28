import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { audioService } from '../../services/audio';

interface VoiceRecorderProps {
  onSend: (audioFile: { uri: string; name: string; type: string; duration: number }) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSend,
  onCancel,
}) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const init = async () => {
      await audioService.startRecording((sec) => setDuration(sec));
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    };

    init();

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const handleCancel = async () => {
    await audioService.stopRecording();
    onCancel();
  };

  const handleSend = async () => {
    const res = await audioService.stopRecording();
    if (res.uri) {
      onSend({
        uri: res.uri,
        name: `voice_${Date.now()}.m4a`,
        type: 'audio/m4a',
        duration: Math.max(1, duration),
      });
    } else {
      onCancel();
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

      <View style={styles.recordingStatus}>
        <View style={styles.redDot} />
        <Text style={styles.timerText}>{formatSeconds(duration)}</Text>
      </View>

      <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
        <Text style={styles.sendIcon}>➔</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  timerText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
