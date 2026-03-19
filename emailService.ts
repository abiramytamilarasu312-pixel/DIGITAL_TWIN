import emailjs from '@emailjs/browser';

let lastAlertTime = 0;

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_USER_ID;

export async function sendAlert(data: any) {
  try {
    const now = Date.now();

    // ⏱️ Prevent spam (1 email every 10 seconds)
    if (now - lastAlertTime < 10000) {
      return;
    }

    lastAlertTime = now;

    console.log("Sending email with data:", data);

    let category = '';
    let message = '';

    // 🔍 Detect which parameter triggered alert
    if (data.vibrationAlert) {
      category = 'VIBRATION';
      message = `Vibration RMS reached ${data.vibration?.toFixed(3)}`;
    } 
    else if (data.noiseAlarm) {
      category = 'SOUND';
      message = `Sound level reached ${data.soundLevel?.toFixed(3)}`;
    } 
    else if (data.temperature > 35) {
      category = 'TEMPERATURE';
      message = `Temperature reached ${data.temperature?.toFixed(1)} °C`;
    } 
    else {
      return; // ❌ No alert condition → no email
    }

    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        machine_name: 'CNC Machine',
        alert_type: 'CRITICAL',
        category: category,
        message: message,
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