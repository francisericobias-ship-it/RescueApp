import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { startScanning, stopScanning } from '../services/bleScanService';
import { sendEmergency } from '../services/emergencyApi';

export default function BleReceiverScreen() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    startScanning((received) => {
      setData(received);
      sendEmergency(received);
    });

    return () => stopScanning();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Receiver</Text>
      <Text>Listening for emergency signals...</Text>

      {data && (
        <Text style={styles.data}>
          {JSON.stringify(data, null, 2)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    marginBottom: 10,
  },
  data: {
    marginTop: 20,
    fontSize: 12,
  },
});