export const sendEmergency = async (data: any) => {
  try {
    await fetch('http://192.168.X.X:3000/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    console.log('✅ Sent to admin');
  } catch (e) {
    console.log('❌ Failed to send');
  }
};