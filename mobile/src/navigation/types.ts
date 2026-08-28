import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Conversation } from '../types/chat.types';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  ChatList: undefined;
  Chat: {
    conversationId: string;
    title: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
  };
  NewChat: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export type ChatScreenRouteProp = RouteProp<MainStackParamList, 'Chat'>;
