let lastAlertTime = 0;

import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_USER_ID;

export async function sendAlert(data: any) {

const now = Date.now();

// prevent spam (1 email per 30 seconds)
if (now - lastAlertTime < 30000) {
  return;
}

lastAlertTime = now;
  console.log("Sending email with data:", data);

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        machine_name: 'CNC Machine',
        alert_type: 'CRITICAL',
        category: 'VIBRATION',
        message: `Vibration RMS reached ${data.vibration?.toFixed(3)}`,
        timestamp: new Date().toLocaleString()
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