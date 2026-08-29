import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { socketService } from './socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private targetUserId: string | null = null;
  private pendingCandidates: RTCIceCandidate[] = [];

  /**
   * Initialize local audio media stream (Microphone)
   */
  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      return this.localStream;
    }

    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.localStream = stream as MediaStream;
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      console.log('✅ Microphone access granted, local stream ready');
      return this.localStream;
    } catch (err) {
      console.warn('❌ Failed to get user media (microphone):', err);
      throw err;
    }
  }

  /**
   * Create RTCPeerConnection and attach audio tracks
   */
  async createPeerConnection(targetUserId: string): Promise<RTCPeerConnection> {
    console.log(`🔗 Creating RTCPeerConnection for target user: ${targetUserId}`);
    this.targetUserId = targetUserId;
    this.closeConnection(false); // Close previous connection but keep state clean

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnection = pc;

    // Get microphone stream & attach audio tracks
    const stream = await this.getLocalStream();
    stream.getAudioTracks().forEach((track) => {
      console.log('🎙️ Attaching local audio track to PeerConnection:', track.id);
      pc.addTrack(track, stream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event: any) => {
      if (event.candidate && this.targetUserId) {
        console.log('❄️ Generated local ICE candidate, sending to peer...');
        const socket = socketService.getSocket();
        socket?.emit('call:signal', {
          recipientId: this.targetUserId,
          signal: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
          type: 'candidate',
        });
      }
    };

    // Handle remote audio stream
    pc.ontrack = (event: any) => {
      console.log('🔊 WebRTC ontrack event received. Track kind:', event.track?.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else if (event.track) {
        this.remoteStream = new MediaStream([event.track]);
      }
      if (event.track) {
        event.track.enabled = true;
      }
      console.log('🔊 Remote audio stream established and enabled!');
    };

    pc.onconnectionstatechange = () => {
      console.log('📶 WebRTC Connection State:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 WebRTC ICE Connection State:', pc.iceConnectionState);
    };

    return pc;
  }

  /**
   * Start call as caller -> creates WebRTC Offer
   */
  async startCall(targetUserId: string): Promise<void> {
    console.log(`📞 Starting WebRTC call to: ${targetUserId}`);
    this.pendingCandidates = [];
    const pc = await this.createPeerConnection(targetUserId);

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await pc.setLocalDescription(offer);
    console.log('📝 Local description (Offer) set, sending offer signal...');

    const socket = socketService.getSocket();
    socket?.emit('call:signal', {
      recipientId: targetUserId,
      signal: offer,
      type: 'offer',
    });
  }

  /**
   * Handle incoming WebRTC Offer -> creates WebRTC Answer
   */
  async handleOffer(callerId: string, offer: any): Promise<void> {
    console.log(`📥 Handling incoming WebRTC offer from: ${callerId}`);
    const pc = await this.createPeerConnection(callerId);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('📝 Remote description (Offer) set on recipient');

    // Flush any ICE candidates that arrived before offer was set
    await this.flushPendingCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('📝 Local description (Answer) set on recipient, sending answer signal...');

    const socket = socketService.getSocket();
    socket?.emit('call:signal', {
      recipientId: callerId,
      signal: answer,
      type: 'answer',
    });
  }

  /**
   * Handle incoming WebRTC Answer (on caller side)
   */
  async handleAnswer(answer: any): Promise<void> {
    if (this.peerConnection) {
      console.log('📥 Setting remote description (Answer) on caller');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.flushPendingCandidates();
    } else {
      console.warn('⚠️ handleAnswer called but peerConnection is null');
    }
  }

  /**
   * Handle incoming ICE Candidate (with robust queueing)
   */
  async handleCandidate(candidate: any): Promise<void> {
    if (!candidate) return;
    try {
      const iceCandidate = new RTCIceCandidate(candidate);

      if (this.peerConnection && this.peerConnection.remoteDescription) {
        console.log('🧊 Adding ICE candidate directly');
        await this.peerConnection.addIceCandidate(iceCandidate);
      } else {
        console.log('⏳ Queued ICE candidate (waiting for remoteDescription)');
        this.pendingCandidates.push(iceCandidate);
      }
    } catch (err) {
      console.warn('⚠️ Error handling ICE candidate:', err);
    }
  }

  /**
   * Flush queued candidates once remote description is set
   */
  private async flushPendingCandidates(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    console.log(`🚀 Flushing ${this.pendingCandidates.length} queued ICE candidates`);
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(candidate);
        } catch (err) {
          console.warn('⚠️ Error adding queued candidate:', err);
        }
      }
    }
  }

  /**
   * Mute / Unmute microphone
   */
  setMuted(isMuted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      console.log(`🎙️ Microphone ${isMuted ? 'Muted' : 'Unmuted'}`);
    }
  }

  /**
   * Cleanup and close peer connection & stop audio tracks
   */
  closeConnection(stopLocalStream: boolean = true): void {
    this.pendingCandidates = [];

    if (stopLocalStream && this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.targetUserId = null;
    console.log('🛑 WebRTC connection closed and cleaned up');
  }
}

export const webrtcService = new WebRTCService();
