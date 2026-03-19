import emailjs from '@emailjs/browser';

let lastAlertTime = 0;

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_USER_ID;

export async function sendAlert(data: any) {
  try {
    const now = Date.now();

    // ⏱️ Prevent spam (1 email per 10 seconds)
    if (now - lastAlertTime < 10000) {
      return;
    }

    console.log("Checking alert conditions:", data);

    let messages: string[] = [];

    // ✅ Check all conditions (NOT else-if anymore)
    if (data.vibrationAlert) {
      messages.push(`• Vibration RMS: ${data.vibration?.toFixed(3)}`);
    }

    if (data.noiseAlarm) {
      messages.push(`• Sound Level: ${data.soundLevel?.toFixed(3)}`);
    }

    if (data.temperature > 35) {
      messages.push(`• Temperature: ${data.temperature?.toFixed(1)} °C`);
    }

    // ❌ No alert → no email
    if (messages.length === 0) {
      return;
    }

    // ⏱️ update time ONLY when sending email
    lastAlertTime = now;

    const finalMessage = messages.join('\n');

    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        machine_name: 'CNC Machine',
        alert_type: 'CRITICAL',
        category: 'MULTI-CONDITION',
        message: finalMessage,
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