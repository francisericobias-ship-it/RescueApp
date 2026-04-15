import Bridgefy from 'bridgefy-react-native';
import NetInfo from '@react-native-community/netinfo';

export const initBridgefy = async () => {
  try {
    await Bridgefy.start();
    console.log("✅ Bridgefy started");

    Bridgefy.addListener('onMessageReceived', async (message: any) => {
      console.log("📥 RECEIVED:", message);

      const data = JSON.parse(message.content);

      const net = await NetInfo.fetch();

      if (net.isConnected) {
        await fetch('https://rescuelink-backend-j0gz.onrender.com/api/v1/crash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        console.log("✅ Sent to server");
      } else {
        console.log("📴 Still offline");
      }
    });

  } catch (e) {
    console.log("❌ Bridgefy error:", e);
  }
};

export const sendMessage = async () => {
  const payload = JSON.stringify({
    latitude: 14.5995,
    longitude: 120.9842,
    type: "CRASH",
    timestamp: new Date().toISOString()
  });

  console.log("📤 Sending...");

  await Bridgefy.sendMessage(payload);

  console.log("✅ Sent via Bridgefy");
};