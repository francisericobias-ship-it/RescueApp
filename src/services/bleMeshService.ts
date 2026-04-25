import NetInfo from '@react-native-community/netinfo';
import { BleManager, Device } from 'react-native-ble-plx';

const manager = new BleManager();

/* ---------------- TYPES ---------------- */
type MeshPayload = {
  latitude: number;
  longitude: number;
};

type RelayMessage = {
  message: string;
  timestamp: number;
};

/* ---------------- GLOBAL STORE ---------------- */
const getGlobalStore = (): RelayMessage[] => {
  const g = global as any;

  if (!g.__MESH_STORE__) {
    g.__MESH_STORE__ = [];
  }

  return g.__MESH_STORE__;
};

/* ---------------- DEDUP SYSTEM ---------------- */
const scanSeen = new Set<string>();
const relaySeen = new Set<string>();

const MAX_DEDUP_SIZE = 200;

/* SAFE DEDUP */
const safeAddDedup = (store: Set<string>, id: string) => {
  if (store.has(id)) return false;

  store.add(id);

  if (store.size > MAX_DEDUP_SIZE) {
    const first = store.values().next().value;
    store.delete(first);
  }

  return true;
};

/* ---------------- INTERNET CHECK ---------------- */
const isOnline = async () => {
  const net = await NetInfo.fetch();
  return !!net.isConnected;
};

/* ---------------- BROADCAST ---------------- */
const broadcast = (message: string) => {
  const store = getGlobalStore();

  store.push({
    message,
    timestamp: Date.now(),
  });

  if (store.length > 500) store.shift();

  console.log("📡 BROADCAST:", message);
};

/* =========================================================
   📡 SCANNER (RECEIVER / RELAY NODE)
========================================================= */
export const startMeshScan = (onReceive?: (payload: any) => void) => {
  console.log("📡 BLE SCAN STARTED");

  manager.startDeviceScan(null, null, async (error, device) => {
    if (error || !device) return;

    const name = device.name || device.localName;
    if (!name || typeof name !== 'string') return;

    if (!name.startsWith("C|")) return;

    try {
      const parts = name.split("|");

      const messageId = parts[1];
      const latitude = parseFloat(parts[2]);
      const longitude = parseFloat(parts[3]);
      const ttl = Number(parts[4] || 0);

      if (!messageId || isNaN(latitude) || isNaN(longitude)) return;

      /* ---------------- DEDUP ---------------- */
      if (!safeAddDedup(scanSeen, messageId)) return;

      console.log("📥 RECEIVED:", {
        messageId,
        latitude,
        longitude,
        ttl,
      });

      /* ---------------- SEND TO APP ---------------- */
      onReceive?.({
        id: messageId,
        latitude,
        longitude,
        ttl,
      });

      /* ---------------- RELAY LOGIC ---------------- */
      if (ttl > 0) {
        const newTTL = ttl - 1;

        const packet = `C|${messageId}|${latitude}|${longitude}|${newTTL}`;

        setTimeout(() => {
          broadcast(packet);
          console.log("🔁 RELAYED:", newTTL);
        }, 300);
      }

      /* ---------------- SERVER GATEWAY ---------------- */
      if (await isOnline()) {
        await fetch(
          "https://rescuelink-backend-j0gz.onrender.com/api/v1/crash",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              source: "ble_mesh",
              type: "CRASH",
              packet_id: messageId,
            }),
          }
        );

        console.log("✅ SENT TO SERVER");
      }

    } catch (err) {
      console.log("Parse error:", err);
    }
  });
};

/* =========================================================
   🛑 STOP SCAN
========================================================= */
export const stopMeshScan = () => {
  manager.stopDeviceScan();
  console.log("🛑 BLE SCAN STOPPED");
};

/* =========================================================
   📤 ORIGIN BROADCAST
========================================================= */
export const broadcastMeshPayload = (payload: MeshPayload) => {
  const messageId = `${Date.now()}`;
  const ttl = 3;

  const message = `C|${messageId}|${payload.latitude}|${payload.longitude}|${ttl}`;

  broadcast(message);

  console.log("🚨 ORIGIN:", message);
};

/* =========================================================
   🔁 RELAY ENGINE
========================================================= */
export const relaySimulatedMesh = async () => {
  const store = getGlobalStore();
  const snapshot = [...store];

  for (const item of snapshot) {
    try {
      const parts = item.message.split("|");

      const messageId = parts[1];
      const latitude = parseFloat(parts[2]);
      const longitude = parseFloat(parts[3]);
      const ttl = Number(parts[4] || 0);

      if (!messageId || isNaN(latitude) || isNaN(longitude)) continue;

      /* ---------------- DEDUP ---------------- */
      if (!safeAddDedup(relaySeen, messageId)) continue;

      console.log("🔁 RELAY ENGINE:", messageId);

      /* ---------------- RELAY ---------------- */
      if (ttl > 0) {
        const newTTL = ttl - 1;

        const relayPacket = `C|${messageId}|${latitude}|${longitude}|${newTTL}`;

        setTimeout(() => {
          broadcast(relayPacket);
        }, 200);
      }

      /* ---------------- SERVER RELAY ---------------- */
      if (await isOnline()) {
        await fetch(
          "https://rescuelink-backend-j0gz.onrender.com/api/v1/crash",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              source: "relay_engine",
              type: "CRASH",
              packet_id: messageId,
            }),
          }
        );

        console.log("✅ ENGINE SENT");
      }

    } catch (err) {
      console.log("Relay error:", err);
    }
  }
};