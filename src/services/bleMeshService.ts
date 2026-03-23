import { BleManager } from 'react-native-ble-plx';
import NetInfo from '@react-native-community/netinfo';

const manager = new BleManager();

/* ---------------- CONFIG ---------------- */

const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const CHARACTERISTIC_UUID = "abcd1234-5678-90ab-cdef-1234567890ab";

/* ---------------- CACHE ---------------- */

const receivedMessages = new Set();

/* ---------------- START SCAN ---------------- */

export const startMeshScan = () => {

  manager.startDeviceScan(null, null, (error, device) => {

    if (error) {
      console.log("BLE Scan error:", error);
      return;
    }

    if (device?.name?.includes("RescueLink")) {

      console.log("Found device:", device.name);

      connectToDevice(device);

    }

  });

};

/* ---------------- STOP SCAN ---------------- */

export const stopMeshScan = () => {
  manager.stopDeviceScan();
};

/* ---------------- CONNECT ---------------- */

const connectToDevice = async (device) => {

  try {

    const connected = await device.connect();
    const discovered = await connected.discoverAllServicesAndCharacteristics();

    monitorIncoming(discovered);

  } catch (err) {
    console.log("Connection error:", err);
  }

};

/* ---------------- MONITOR INCOMING ---------------- */

const monitorIncoming = (device) => {

  device.monitorCharacteristicForService(
    SERVICE_UUID,
    CHARACTERISTIC_UUID,
    (error, characteristic) => {

      if (error) {
        console.log("Monitor error:", error);
        return;
      }

      if (!characteristic?.value) return;

      try {

        const decoded = atob(characteristic.value);
        const data = JSON.parse(decoded);

        onReceiveSOS(data);

      } catch (e) {
        console.log("Decode error:", e);
      }

    }
  );

};

/* ---------------- BROADCAST ---------------- */

export const broadcastSOS = async (payload) => {

  try {

    const message = {
      ...payload,
      id: payload.id || generateId(),
      ttl: payload.ttl ?? 3, // max hops
    };

    const encoded = btoa(JSON.stringify(message));

    const devices = await manager.connectedDevices([SERVICE_UUID]);

    devices.forEach(async (device) => {

      try {

        await device.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          encoded
        );

      } catch (err) {
        console.log("Write error:", err);
      }

    });

    console.log("Broadcasted:", message);

  } catch (e) {
    console.log("Broadcast error:", e);
  }

};

/* ---------------- RECEIVE + RELAY ---------------- */

export const onReceiveSOS = async (data) => {

  console.log("Received:", data);

  /* ---------- DUPLICATE CHECK ---------- */
  if (receivedMessages.has(data.id)) {
    console.log("Duplicate ignored");
    return;
  }

  receivedMessages.add(data.id);

  /* ---------- TTL CHECK ---------- */
  if (data.ttl <= 0) {
    console.log("TTL expired");
    return;
  }

  /* ---------- DECREASE TTL ---------- */
  data.ttl -= 1;

  /* ---------- RELAY ---------- */
  broadcastSOS(data);

  /* ---------- SEND TO SERVER IF ONLINE ---------- */
  const net = await NetInfo.fetch();

  if (net.isConnected) {

    console.log("Forwarding to API...");

    try {

      await fetch("https://rescuelink-backend-j0gz.onrender.com/api/v1/sos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

    } catch (e) {
      console.log("API error:", e);
    }

  }

};

/* ---------------- HELPERS ---------------- */

const generateId = () => {
  return `${Date.now()}-${Math.random()}`;
};