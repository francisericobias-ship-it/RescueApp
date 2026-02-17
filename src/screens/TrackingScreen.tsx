import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function TrackingScreen({ navigation }: any) {
  const [location, setLocation] = useState({ latitude: 0, longitude: 0 });

  useEffect(() => {
    // Placeholder for location tracking
    setLocation({ latitude: 14.6091, longitude: 120.9898 }); // sample coords
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tracking Active</Text>
      <Text>Latitude: {location.latitude}</Text>
      <Text>Longitude: {location.longitude}</Text>
      <Button title="Stop Tracking" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});
