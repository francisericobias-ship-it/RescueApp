import { BleManager, Device, Subscription } from 'react-native-ble-plx';

class BleMeshService {
  private manager: BleManager;
  private device: Device | null = null;
  private subscriptions: Subscription[] = [];

  constructor() {
    this.manager = new BleManager();
  }

  scanAndConnect(targetName: string) {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Scan error:', error);
        return;
      }

      if (device && device.name === targetName) {
        this.manager.stopDeviceScan();
        device
          .connect()
          .then((connectedDevice) => {
            this.device = connectedDevice;
            return connectedDevice.discoverAllServicesAndCharacteristics();
          })
          .then(() => {
            console.log('Connected to device:', this.device?.name);
            // Here you can start subscribing to characteristics for mesh messages
          })
          .catch((error) => {
            console.log('Connection error:', error);
          });
      }
    });
  }

  sendMessage(message: string) {
    if (!this.device) return;

    // Example: write message to a specific characteristic
    const serviceUUID = 'YOUR_SERVICE_UUID';
    const characteristicUUID = 'YOUR_CHARACTERISTIC_UUID';

    this.device.writeCharacteristicWithResponseForService(
      serviceUUID,
      characteristicUUID,
      Buffer.from(message).toString('base64')
    ).then((characteristic) => {
      console.log('Message sent:', message);
    }).catch((error) => {
      console.log('Send message error:', error);
    });
  }

  subscribeToMessages() {
    if (!this.device) return;

    const serviceUUID = 'YOUR_SERVICE_UUID';
    const characteristicUUID = 'YOUR_CHARACTERISTIC_UUID';

    this.device.monitorCharacteristicForService(
      serviceUUID,
      characteristicUUID,
      (error, characteristic) => {
        if (error) {
          console.log('Subscription error:', error);
          return;
        }
        const message = Buffer.from(characteristic?.value || '', 'base64').toString('utf8');
        console.log('Received message:', message);
        // Handle incoming messages here
      }
    );
  }

  disconnect() {
    if (this.device) {
      this.device.cancelConnection();
    }
    this.manager.destroy();
  }
}

export const bleMeshService = new BleMeshService();