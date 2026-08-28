import { Platform } from 'react-native';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
} from 'react-native-audio-recorder-player';

class AudioService {
  private audioRecorderPlayer: AudioRecorderPlayer;
  private isRecording: boolean = false;
  private isPlaying: boolean = false;

  constructor() {
    this.audioRecorderPlayer = new AudioRecorderPlayer();
    this.audioRecorderPlayer.setSubscriptionDuration(0.1);
  }

  async startRecording(onProgress?: (durationSec: number) => void): Promise<string> {
    if (this.isRecording) return '';

    try {
      const audioSet = {
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
        AVNumberOfChannelsKeyIOS: 2,
        AVFormatIDKeyIOS: AVEncodingOption.aac,
      };

      const uri = await this.audioRecorderPlayer.startRecorder(undefined, audioSet);
      this.isRecording = true;

      this.audioRecorderPlayer.addRecordBackListener((e) => {
        const sec = Math.floor(e.currentPosition / 1000);
        if (onProgress) onProgress(sec);
      });

      return uri;
    } catch (err) {
      console.warn('Audio startRecording error:', err);
      return '';
    }
  }

  async stopRecording(): Promise<{ uri: string; durationSec: number }> {
    if (!this.isRecording) return { uri: '', durationSec: 0 };

    try {
      const result = await this.audioRecorderPlayer.stopRecorder();
      this.audioRecorderPlayer.removeRecordBackListener();
      this.isRecording = false;

      return {
        uri: result,
        durationSec: 0,
      };
    } catch (err) {
      console.warn('Audio stopRecording error:', err);
      this.isRecording = false;
      return { uri: '', durationSec: 0 };
    }
  }

  async startPlayer(uri: string, onProgress?: (currentSec: number, totalSec: number) => void): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.stopPlayer();
      }

      this.isPlaying = true;
      await this.audioRecorderPlayer.startPlayer(uri);

      this.audioRecorderPlayer.addPlayBackListener((e) => {
        const current = Math.floor(e.currentPosition / 1000);
        const total = Math.floor(e.duration / 1000);
        if (onProgress) onProgress(current, total);

        if (e.currentPosition >= e.duration && e.duration > 0) {
          this.stopPlayer();
        }
      });
    } catch (err) {
      console.warn('Audio startPlayer error:', err);
      this.isPlaying = false;
    }
  }

  async stopPlayer(): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.audioRecorderPlayer.stopPlayer();
        this.audioRecorderPlayer.removePlayBackListener();
        this.isPlaying = false;
      }
    } catch (err) {
      console.warn('Audio stopPlayer error:', err);
      this.isPlaying = false;
    }
  }
}

export const audioService = new AudioService();
