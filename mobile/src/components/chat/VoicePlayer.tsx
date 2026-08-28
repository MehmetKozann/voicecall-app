import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { audioService } from '../../services/audio';

interface VoicePlayerProps {
  url: string;
  duration?: number | null;
  isSent: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  url,
  duration = 0,
  isSent,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  const togglePlay = async () => {
    if (isPlaying) {
      await audioService.stopPlayer();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await audioService.startPlayer(url, (current, total) => {
        setCurrentPosition(current);
        if (total > 0) setTotalDuration(total);
      });
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={togglePlay}
        style={[
          styles.playButton,
          { backgroundColor: isSent ? '#4F46E5' : '#334155' },
        ]}
      >
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: totalDuration > 0 ? `${(currentPosition / totalDuration) * 100}%` : '0%',
                backgroundColor: isSent ? '#FFFFFF' : '#818CF8',
              },
            ]}
          />
        </View>
        <Text style={[styles.durationText, { color: isSent ? '#E0E7FF' : '#94A3B8' }]}>
          {formatSeconds(isPlaying ? currentPosition : totalDuration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 190,
    paddingVertical: 4,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  waveformContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
