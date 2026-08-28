import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useCallStore } from '../../store/callStore';
import { Avatar } from '../common/Avatar';

export const CallOverlay: React.FC = () => {
  const {
    status,
    remoteParticipant,
    isCaller,
    isMuted,
    isSpeakerOn,
    duration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    incrementDuration,
  } = useCallStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for avatar during calling / incoming
  useEffect(() => {
    if (status === 'CALLING' || status === 'INCOMING') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  // Duration timer when call is connected
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'CONNECTED') {
      timer = setInterval(() => {
        incrementDuration();
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, incrementDuration]);

  if (status === 'IDLE') return null;

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'CALLING':
        return 'Calling...';
      case 'INCOMING':
        return 'Incoming Voice Call';
      case 'CONNECTED':
        return formatDuration(duration);
      case 'ENDED':
        return 'Call Ended';
      default:
        return '';
    }
  };

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <SafeAreaView style={styles.container}>
        {/* Header Info */}
        <View style={styles.header}>
          <Text style={styles.hdBadge}>🔒 End-to-End Encrypted Voice</Text>
        </View>

        {/* Center User Profile */}
        <View style={styles.centerContent}>
          <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.avatarBorder}>
              <Avatar
                name={remoteParticipant?.name || 'User'}
                url={remoteParticipant?.avatarUrl}
                size={120}
              />
            </View>
          </Animated.View>

          <Text style={styles.callerName}>{remoteParticipant?.name || 'Voice Call'}</Text>
          <Text style={[styles.callStatus, status === 'CONNECTED' && styles.connectedStatus]}>
            {getStatusText()}
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.controlsContainer}>
          {status === 'INCOMING' ? (
            <View style={styles.incomingButtons}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => rejectCall('declined')}
                style={[styles.actionBtn, styles.declineBtn]}
              >
                <Text style={styles.btnIcon}>✕</Text>
                <Text style={styles.btnLabel}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={acceptCall}
                style={[styles.actionBtn, styles.acceptBtn]}
              >
                <Text style={styles.btnIcon}>📞</Text>
                <Text style={styles.btnLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activeCallControls}>
              <View style={styles.auxControls}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={toggleMute}
                  style={[styles.auxBtn, isMuted && styles.auxBtnActive]}
                >
                  <Text style={styles.auxIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
                  <Text style={styles.auxLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={toggleSpeaker}
                  style={[styles.auxBtn, isSpeakerOn && styles.auxBtnActive]}
                >
                  <Text style={styles.auxIcon}>{isSpeakerOn ? '🔊' : '🔈'}</Text>
                  <Text style={styles.auxLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={endCall}
                style={[styles.actionBtn, styles.endCallBtn]}
              >
                <Text style={styles.btnIcon}>📞</Text>
                <Text style={styles.btnLabel}>End Call</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
  },
  hdBadge: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    marginBottom: 28,
  },
  avatarBorder: {
    padding: 6,
    borderRadius: 70,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  callerName: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  callStatus: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  connectedStatus: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  controlsContainer: {
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  incomingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  activeCallControls: {
    alignItems: 'center',
  },
  auxControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 36,
  },
  auxBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  auxBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  auxIcon: {
    fontSize: 26,
  },
  auxLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  declineBtn: {
    backgroundColor: '#EF4444',
  },
  endCallBtn: {
    backgroundColor: '#EF4444',
    transform: [{ rotate: '135deg' }],
  },
  btnIcon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  btnLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
