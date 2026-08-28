const { io } = require('socket.io-client');

async function runTest() {
  console.log('--- Starting Phase 3 Integration Test ---');

  // 1. Login Alice & Bob
  const aliceRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'alice', password: 'SecurePassword123!' }),
  }).then((r) => r.json());

  const bobRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'bob', password: 'SecurePassword123!' }),
  }).then((r) => r.json());

  const aliceToken = aliceRes.tokens.accessToken;
  const bobToken = bobRes.tokens.accessToken;
  const aliceId = aliceRes.user.id;
  const bobId = bobRes.user.id;

  console.log(`[AUTH] Alice ID: ${aliceId}, Bob ID: ${bobId}`);

  // 2. Create Direct Conversation
  const convRes = await fetch('http://localhost:3000/api/v1/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aliceToken}`,
    },
    body: JSON.stringify({ participantId: bobId }),
  }).then((r) => r.json());

  const conversationId = convRes.id;
  console.log(`[CONVERSATION] Created/Retrieved Conversation ID: ${conversationId}`);

  // 3. Connect Alice and Bob to Socket.IO
  const aliceSocket = io('http://localhost:3000', {
    auth: { token: `Bearer ${aliceToken}` },
    transports: ['websocket'],
  });

  const bobSocket = io('http://localhost:3000', {
    auth: { token: `Bearer ${bobToken}` },
    transports: ['websocket'],
  });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    aliceSocket.on('connect', () => {
      console.log('[SOCKET] Alice connected to Socket.IO');
      check();
    });
    bobSocket.on('connect', () => {
      console.log('[SOCKET] Bob connected to Socket.IO');
      check();
    });
  });

  // 4. Join Conversation Rooms
  aliceSocket.emit('conversation:join', { conversationId });
  bobSocket.emit('conversation:join', { conversationId });
  await new Promise((r) => setTimeout(r, 100));

  // 5. Test Typing Indicator
  const typingPromise = new Promise((resolve) => {
    bobSocket.on('typing:update', (data) => {
      console.log('[TYPING] Bob received typing event:', data);
      if (data.isTyping && data.username === 'alice') {
        resolve();
      }
    });
  });
  aliceSocket.emit('typing:start', { conversationId });
  await typingPromise;

  // 6. Test Real-time Messaging (Alice -> Bob)
  let sentMessageId = null;
  const receiveMessagePromise = new Promise((resolve) => {
    bobSocket.on('message:new', (msg) => {
      console.log('[MESSAGE] Bob received message:new:', msg.content, `(ID: ${msg.id})`);
      sentMessageId = msg.id;
      resolve(msg);
    });
  });

  aliceSocket.emit(
    'message:send',
    {
      tempId: 'temp-12345',
      conversationId,
      content: 'Hello Bob! This is real-time messaging on NestJS + Socket.IO.',
      type: 'TEXT',
    },
    (ack) => {
      console.log('[MESSAGE:ACK] Alice received send ACK:', ack.success);
    }
  );

  const receivedMsg = await receiveMessagePromise;

  // 7. Test Delivery Receipt (Bob -> Alice)
  const deliveredPromise = new Promise((resolve) => {
    aliceSocket.on('message:status', (statusData) => {
      console.log('[RECEIPT] Alice received status update:', statusData);
      if (statusData.status === 'DELIVERED') {
        resolve();
      }
    });
  });
  bobSocket.emit('message:delivered', { messageId: receivedMsg.id, conversationId });
  await deliveredPromise;

  // 8. Test Read Receipt (Bob -> Alice)
  const readPromise = new Promise((resolve) => {
    aliceSocket.on('message:status', (statusData) => {
      if (statusData.status === 'READ') {
        console.log('[RECEIPT] Alice received read status confirmation');
        resolve();
      }
    });
  });
  bobSocket.emit('message:read', { conversationId, lastMessageId: receivedMsg.id });
  await readPromise;

  // 9. Verify REST Persistence
  const messagesList = await fetch(
    `http://localhost:3000/api/v1/conversations/${conversationId}/messages`,
    {
      headers: { Authorization: `Bearer ${aliceToken}` },
    }
  ).then((r) => r.json());

  console.log(`[REST] Fetched messages count: ${messagesList.messages.length}`);
  console.log(`[REST] Message content: "${messagesList.messages[0].content}", status: "${messagesList.messages[0].status}"`);

  // Cleanup
  aliceSocket.disconnect();
  bobSocket.disconnect();
  console.log('✅ ALL PHASE 3 REAL-TIME & REST TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
