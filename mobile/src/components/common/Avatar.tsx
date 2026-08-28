import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
  isOnline?: boolean;
  showOnlineBadge?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  url,
  size = 48,
  isOnline = false,
  showOnlineBadge = false,
}) => {
  const getInitials = (str: string) => {
    if (!str) return '?';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const getBackgroundColor = (str: string) => {
    const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
  };

  const badgeSize = Math.max(10, Math.floor(size * 0.28));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {url ? (
        <Image source={{ uri: url }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: getBackgroundColor(name),
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{getInitials(name)}</Text>
        </View>
      )}

      {showOnlineBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: isOnline ? '#10B981' : '#64748B',
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
});
