export const sendEmergency = async (data: any) => {
  try {
    await fetch('https://rescuelink-backend-j0gz.onrender.com/api/v1/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    console.log('✅ Sent to server');
  } catch (e) {
    console.log('❌ Failed to send, pwede mo i-store offline dito');
  }
};