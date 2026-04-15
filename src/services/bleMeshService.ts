import NetInfo from '@react-native-community/netinfo';
import { BleManager, Device } from 'react-native-ble-plx';

const manager = new BleManager();

// Store received messages to prevent duplicates
const receivedMessages = new Set<string>();

// ---------------- START SCAN (DEVICE B / Relay) ----------------
export const startMeshScan = () => {
  console.log("📡 SCANNING STARTED (SIMULATED)");

  manager.startDeviceScan(null, null, async (error: any, device: Device | null) => {
    if (error) {
      console.log("Scan error:", error);
      return;
    }

    if (!device?.name) return;

    // Only accept payloads starting with "C|"
    if (!device.name.startsWith("C|")) return;

    console.log("📥 FOUND PAYLOAD:", device.name);

    try {
      const parts = device.name.split("|");
      const latitude = parseFloat(parts[1]);
      const longitude = parseFloat(parts[2]);
      const id = `${latitude}-${longitude}`;

      // Deduplicate
      if (receivedMessages.has(id)) return;
      receivedMessages.add(id);

      console.log("📍 LOCATION RECEIVED:", latitude, longitude);

      // Check internet
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        console.log("📴 No internet, will hold payload for later");
        return;
      }

      // Forward to server
      await fetch("https://rescuelink-backend-j0gz.onrender.com/api/v1/crash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude,
          longitude,
          source: "ble_relay",
          type: "CRASH",
          timestamp: new Date().toISOString(),
        }),
      });

      console.log("✅ FORWARDED TO SERVER");

    } catch (err) {
      console.log("Parse / Forward error:", err);
    }
  });
};

// ---------------- STOP SCAN ----------------
export const stopMeshScan = () => {
  manager.stopDeviceScan();
  console.log("🛑 SCAN STOPPED");
};

// ---------------- BROADCAST (DEVICE A / Victim) ----------------
export const broadcastMeshPayload = (payload: { latitude: number; longitude: number }) => {
  try {
    const lat = payload.latitude.toFixed(4);
    const lng = payload.longitude.toFixed(4);

    const message = `C|${lat}|${lng}`;
    console.log("📡 BROADCASTING SIMULATED PAYLOAD:", message);

    // ⚠️ DEMO ONLY: since BLE peripheral not supported
    // we use global var to simulate broadcast
    if (!global.__SIMULATED_MESH_MESSAGES__) {
      global.__SIMULATED_MESH_MESSAGES__ = [];
    }

    global.__SIMULATED_MESH_MESSAGES__.push({ message, timestamp: Date.now() });

  } catch (e) {
    console.log("Broadcast error:", e);
  }
};

// ---------------- SIMULATE RELAY POLLING ----------------
export const relaySimulatedMesh = async () => {
  if (!global.__SIMULATED_MESH_MESSAGES__) return;

  const messages = global.__SIMULATED_MESH_MESSAGES__;
  for (const msgObj of messages) {
    // Deduplicate
    if (receivedMessages.has(msgObj.message)) continue;
    receivedMessages.add(msgObj.message);

    // Parse coordinates
    const parts = msgObj.message.split("|");
    const latitude = parseFloat(parts[1]);
    const longitude = parseFloat(parts[2]);

    console.log("🔁 RELAY PROCESSING MESSAGE:", latitude, longitude);

    // Forward to server if online
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      await fetch("https://rescuelink-backend-j0gz.onrender.com/api/v1/crash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          source: "ble_relay_sim",
          type: "CRASH",
          timestamp: new Date().toISOString(),
        }),
      });
      console.log("✅ RELAY FORWARDED TO SERVER");
    } else {
      console.log("📴 Relay offline, will retry later");
    }
  }
};