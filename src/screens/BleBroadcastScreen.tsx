import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { startBroadcast } from '../services/bleBroadcastService';

export default function BleBroadcastScreen() {
  const [status, setStatus] = useState('Idle');

  const handleSend = () => {
    startBroadcast();
    setStatus('Broadcasting...');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Emergency Sender</Text>

      <Pressable style={styles.button} onPress={handleSend}>
        <Text style={styles.buttonText}>SEND EMERGENCY</Text>
      </Pressable>

      <Text style={styles.status}>Status: {status}</Text>
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
    marginBottom: 20,
  },
  button: {
    backgroundColor: 'red',
    padding: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  status: {
    marginTop: 20,
  },
});