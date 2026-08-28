import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CallOverlay } from './src/components/call/CallOverlay';
import { socketService } from './src/services/socket';
import { useCallStore } from './src/store/callStore';
import { webrtcService } from './src/services/webrtcService';

const App: React.FC = () => {
  useEffect(() => {
    // Setup socket listeners for voice call signaling
    const socket = socketService.getSocket();
    if (!socket) return;

    const onIncoming = (data: any) => {
      useCallStore.getState().incomingCall({
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        conversationId: data.conversationId,
      });
    };

    const onAccepted = () => {
      useCallStore.setState({ status: 'CONNECTED', duration: 0 });
    };

    const onRejected = () => {
      webrtcService.closeConnection();
      useCallStore.setState({ status: 'ENDED' });
      setTimeout(() => useCallStore.getState().resetCall(), 1200);
    };

    const onEnded = () => {
      webrtcService.closeConnection();
      useCallStore.setState({ status: 'ENDED' });
      setTimeout(() => useCallStore.getState().resetCall(), 1200);
    };

    const onSignal = async (data: { senderId: string; signal: any; type: string }) => {
      if (data.type === 'offer') {
        useCallStore.getState().setPendingOffer(data.signal);
        if (useCallStore.getState().status === 'CONNECTED') {
          await webrtcService.handleOffer(data.senderId, data.signal);
        }
      } else if (data.type === 'answer') {
        await webrtcService.handleAnswer(data.signal);
      } else if (data.type === 'candidate') {
        await webrtcService.handleCandidate(data.signal);
      }
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);
    socket.on('call:signal', onSignal);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
      socket.off('call:signal', onSignal);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <AppNavigator />
      <CallOverlay />
    </SafeAreaProvider>
  );
};

export default App;
