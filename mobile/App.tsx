import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CallOverlay } from './src/components/call/CallOverlay';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <AppNavigator />
      <CallOverlay />
    </SafeAreaProvider>
  );
};

export default App;
