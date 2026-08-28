import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TypingIndicatorProps {
  usernames: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ usernames }) => {
  if (!usernames || usernames.length === 0) return null;

  const text =
    usernames.length === 1
      ? `${usernames[0]} is typing...`
      : `${usernames.join(', ')} are typing...`;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  bubble: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#818CF8',
    marginHorizontal: 1.5,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
  text: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
