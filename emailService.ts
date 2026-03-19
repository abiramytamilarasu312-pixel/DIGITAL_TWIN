import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_USER_ID;

export async function sendAlert(data: any) {

  // Alert condition
  if (
    data.temperature < 35 &&
    data.vibration < 0.3 &&
    data.noiseLevel < 0.15
  ) {
    return;
  }

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        status: 'ALERT',
        rpm: data.rpm,
        vibration: data.vibration,
        temperature: data.temperature,
        sound: data.noiseLevel,
        condition: data.condition,
      },
      {
        publicKey: PUBLIC_KEY,
      }
    );

    console.log("Email sent ✅");

  } catch (error) {
    console.error("Email failed ❌", error);
  }
}