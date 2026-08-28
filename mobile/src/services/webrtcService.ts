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
  ],
};

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private targetUserId: string | null = null;

  /**
   * Initialize local audio media stream
   */
  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.localStream = stream as MediaStream;
      return this.localStream;
    } catch (err) {
      console.warn('Failed to get user media (microphone):', err);
      throw err;
    }
  }

  /**
   * Create RTCPeerConnection and attach tracks
   */
  async createPeerConnection(targetUserId: string): Promise<RTCPeerConnection> {
    this.targetUserId = targetUserId;
    this.closeConnection();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnection = pc;

    // Get microphone stream & add tracks
    const stream = await this.getLocalStream();
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event: any) => {
      if (event.candidate && this.targetUserId) {
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
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log('🔊 WebRTC Remote audio stream connected');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection state:', pc.connectionState);
    };

    return pc;
  }

  /**
   * Start call as caller -> creates WebRTC Offer
   */
  async startCall(targetUserId: string): Promise<void> {
    const pc = await this.createPeerConnection(targetUserId);
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await pc.setLocalDescription(offer);

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
    const pc = await this.createPeerConnection(callerId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

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
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  /**
   * Handle incoming ICE Candidate
   */
  async handleCandidate(candidate: any): Promise<void> {
    if (this.peerConnection && candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
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
    }
  }

  /**
   * Cleanup and close peer connection & stop audio tracks
   */
  closeConnection(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.targetUserId = null;
  }
}

export const webrtcService = new WebRTCService();
