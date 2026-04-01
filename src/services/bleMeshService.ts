import { BleManager } from 'react-native-ble-plx';
import NetInfo from '@react-native-community/netinfo';

const manager = new BleManager();
const receivedMessages = new Set<string>();

/* ---------------- START SCAN (DEVICE B) ---------------- */
export const startMeshScan = () => {
  console.log("📡 SCANNING STARTED");

  manager.startDeviceScan(null, null, async (error, device) => {
    if (error) {
      console.log("Scan error:", error);
      return;
    }

    if (!device?.name) return;

    // 🔥 LOOK FOR OUR PAYLOAD FORMAT
    if (!device.name.startsWith("C|")) return;

    console.log("📥 FOUND PAYLOAD:", device.name);

    try {
      const parts = device.name.split("|");

      const latitude = parseFloat(parts[1]);
      const longitude = parseFloat(parts[2]);

      const id = `${latitude}-${longitude}`;

      if (receivedMessages.has(id)) return;
      receivedMessages.add(id);

      console.log("📍 LOCATION:", latitude, longitude);

      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        console.log("📴 No internet, cannot forward");
        return;
      }

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
      console.log("Parse error:", err);
    }
  });
};

/* ---------------- STOP SCAN ---------------- */
export const stopMeshScan = () => {
  manager.stopDeviceScan();
};

/* ---------------- BROADCAST (DEVICE A) ---------------- */
export const broadcastMeshPayload = (payload: {
  latitude: number;
  longitude: number;
}) => {
  try {
    const lat = payload.latitude.toFixed(4);
    const lng = payload.longitude.toFixed(4);

    const message = `C|${lat}|${lng}`;

    console.log("📡 BROADCASTING:", message);

    // ⚠️ DEMO ONLY:
    // since BLE peripheral not supported,
    // we fake it by renaming device via logs
    global.__BLE_FAKE_NAME__ = message;

  } catch (e) {
    console.log("Broadcast error:", e);
  }
};