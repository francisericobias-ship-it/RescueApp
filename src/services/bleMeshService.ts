import { BleManager } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Buffer } from 'buffer';

const manager = new BleManager();
const receivedMessages = new Set<string>();

/* ---------------- UUID CONFIG ---------------- */
const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcd1234-5678-90ab-cdef-1234567890ab";

/* ---------------- TYPES ---------------- */
export type MeshPayload = {
  id?: string;
  type: 'CRASH' | 'SOS';
  latitude?: number;
  longitude?: number;
  impact_force?: number;
  severity?: string;
  device_id?: string;
  timestamp?: number;
};

/* ---------------- START SCAN (DEVICE B) ---------------- */
export const startMeshScan = () => {
  console.log("📡 SCANNING STARTED");

  manager.startDeviceScan(null, null, async (error, device) => {
    if (error) {
      console.log("Scan error:", error);
      return;
    }

    if (!device?.name || device.name !== "RescueLink") return;

    console.log("📥 FOUND DEVICE:", device.id);

    try {
      manager.stopDeviceScan();

      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();

      const services = await connectedDevice.services();

      for (const service of services) {
        if (service.uuid !== SERVICE_UUID) continue;

        const characteristics = await service.characteristics();

        for (const char of characteristics) {
          if (char.uuid !== CHARACTERISTIC_UUID) continue;

          const value = await char.read();

          if (!value?.value) return;

          const decoded = Buffer.from(value.value, 'base64').toString('utf-8');
          const data: MeshPayload = JSON.parse(decoded);

          onReceiveMeshPayload(data);
        }
      }

    } catch (err) {
      console.log("Connection error:", err);
    }
  });
};

/* ---------------- STOP SCAN ---------------- */
export const stopMeshScan = () => {
  manager.stopDeviceScan();
};

/* ---------------- BROADCAST (DEVICE A) ---------------- */
export const broadcastMeshPayload = async (payload: MeshPayload) => {
  try {
    const message = {
      ...payload,
      id: payload.id || generateId(),
    };

    const encoded = Buffer.from(JSON.stringify(message)).toString('base64');

    console.log("📡 BROADCAST PAYLOAD:", message);

    // ⚠️ IMPORTANT:
    // BLE PLX cannot create peripheral directly
    // so we simulate using local characteristic cache (demo workaround)

    global.__BLE_MESH_CACHE__ = encoded;

  } catch (e) {
    console.log("Broadcast error:", e);
  }
};

/* ---------------- RECEIVE + FORWARD ---------------- */
const onReceiveMeshPayload = async (data: MeshPayload) => {
  console.log("📥 RECEIVED:", data);

  if (!data.id || receivedMessages.has(data.id)) return;
  receivedMessages.add(data.id);

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    console.log("📴 No internet, cannot forward");
    return;
  }

  try {
    await fetch("https://rescuelink-backend-j0gz.onrender.com/api/v1/crash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: data.latitude,
        longitude: data.longitude,
        impact_force: data.impact_force,
        severity: data.severity,
        device_id: data.device_id,
        timestamp: new Date().toISOString(),
        source: "ble_relay",
        packet_id: data.id,
      }),
    });

    console.log("✅ FORWARDED TO SERVER");

  } catch (e) {
    console.log("API error:", e);
  }
};

/* ---------------- HELPERS ---------------- */
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;