import { create } from 'zustand';
import { socketService } from '../services/socket';
import { webrtcService } from '../services/webrtcService';

export type CallStatus = 'IDLE' | 'CALLING' | 'INCOMING' | 'CONNECTED' | 'ENDED';

interface CallParticipant {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface CallState {
  status: CallStatus;
  conversationId: string | null;
  remoteParticipant: CallParticipant | null;
  pendingOffer: any | null;
  isCaller: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  duration: number; // in seconds

  // Actions
  startCall: (
    recipientId: string,
    recipientName: string,
    conversationId: string,
    recipientAvatar?: string | null,
  ) => Promise<void>;
  incomingCall: (data: {
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    conversationId: string;
    offer?: any;
  }) => void;
  setPendingOffer: (offer: any) => void;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  incrementDuration: () => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  status: 'IDLE',
  conversationId: null,
  remoteParticipant: null,
  pendingOffer: null,
  isCaller: false,
  isMuted: false,
  isSpeakerOn: false,
  duration: 0,

  startCall: async (recipientId, recipientName, conversationId, recipientAvatar) => {
    set({
      status: 'CALLING',
      conversationId,
      remoteParticipant: {
        id: recipientId,
        name: recipientName,
        avatarUrl: recipientAvatar,
      },
      isCaller: true,
      isMuted: false,
      isSpeakerOn: false,
      duration: 0,
    });

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('call:initiate', {
        recipientId,
        conversationId,
        isVideo: false,
      });
    }

    try {
      await webrtcService.startCall(recipientId);
    } catch (err) {
      console.warn('WebRTC startCall error:', err);
    }
  },

  incomingCall: ({ callerId, callerName, callerAvatar, conversationId, offer }) => {
    // Only accept if not in an active call
    if (get().status !== 'IDLE') return;

    set({
      status: 'INCOMING',
      conversationId,
      remoteParticipant: {
        id: callerId,
        name: callerName,
        avatarUrl: callerAvatar,
      },
      pendingOffer: offer || null,
      isCaller: false,
      isMuted: false,
      isSpeakerOn: false,
      duration: 0,
    });
  },

  setPendingOffer: (offer) => set({ pendingOffer: offer }),

  acceptCall: async () => {
    const { remoteParticipant, conversationId, pendingOffer } = get();
    if (!remoteParticipant) return;

    set({ status: 'CONNECTED', duration: 0 });

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('call:accept', {
        callerId: remoteParticipant.id,
        conversationId,
      });
    }

    if (pendingOffer) {
      try {
        await webrtcService.handleOffer(remoteParticipant.id, pendingOffer);
      } catch (err) {
        console.warn('WebRTC handleOffer error:', err);
      }
    }
  },

  rejectCall: (reason = 'declined') => {
    const { remoteParticipant, conversationId } = get();
    if (remoteParticipant) {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('call:reject', {
          callerId: remoteParticipant.id,
          conversationId,
          reason,
        });
      }
    }
    webrtcService.closeConnection();
    set({ status: 'ENDED' });
    setTimeout(() => get().resetCall(), 1200);
  },

  endCall: () => {
    const { remoteParticipant, conversationId, duration } = get();
    if (remoteParticipant) {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('call:end', {
          peerId: remoteParticipant.id,
          conversationId,
          duration,
        });
      }
    }
    webrtcService.closeConnection();
    set({ status: 'ENDED' });
    setTimeout(() => get().resetCall(), 1200);
  },

  toggleMute: () => {
    const newMute = !get().isMuted;
    webrtcService.setMuted(newMute);
    set({ isMuted: newMute });
  },

  toggleSpeaker: () => set((state) => ({ isSpeakerOn: !state.isSpeakerOn })),
  incrementDuration: () => set((state) => ({ duration: state.duration + 1 })),

  resetCall: () => {
    webrtcService.closeConnection();
    set({
      status: 'IDLE',
      conversationId: null,
      remoteParticipant: null,
      pendingOffer: null,
      isCaller: false,
      isMuted: false,
      isSpeakerOn: false,
      duration: 0,
    });
  },
}));
