export type ToolStatus = 'GOOD' | 'WARNING' | 'CRITICAL';

export interface TelemetryData {
  vibration: number;
  soundLevel: number;
  toolWear?: number;
  toolHealth?: number;
  rpm?: number;
  timestamp: string | number;
}

export interface HealthResult {
  toolHealth: number;
  status: ToolStatus;
  estimatedToolWear?: number;
  predictedMaxTime?: number; // in minutes
}

const WEAR_LIMIT = 0.5; // mm
const VIBRATION_BAD = 0.6; // g
const SOUND_BAD = 0.5;
const VIBRATION_WEAR_COEFF = 0.0005; // mm per g per second (approx)

export const estimateToolWear = (vibration: number, durationSeconds: number = 1): number => {
  // Simple estimation: wear increases with vibration intensity over time
  return vibration * VIBRATION_WEAR_COEFF * durationSeconds;
};

export const predictMaxOperationTime = (history: TelemetryData[]): number => {
  if (history.length < 5) return 480; // Default 8 hours if not enough data

  // Calculate average wear rate or vibration trend
  const recentData = history.slice(-10);
  const avgVibration = recentData.reduce((acc, d) => acc + d.vibration, 0) / recentData.length;
  
  // If vibration is very high, time is short
  if (avgVibration > VIBRATION_BAD) return Math.max(5, 60 * (1 - (avgVibration - VIBRATION_BAD)));
  
  // Linear extrapolation based on vibration
  const remainingHealth = 1 - (avgVibration / VIBRATION_BAD);
  return Math.max(10, remainingHealth * 480); // Max 8 hours
};

export const calculateToolHealth = (data: TelemetryData, history: TelemetryData[] = []): HealthResult => {
  let health = 100;

  // 1. Base health from vibration and sound (Real-time sensors)
  const vibration_norm = data.vibration / VIBRATION_BAD;
  const sound_norm = data.soundLevel / SOUND_BAD;
  
  // Weighted sensor health (vibration is more critical)
  let sensorHealth = 100 * (1 - (0.7 * vibration_norm + 0.3 * sound_norm));

  // 2. Health from tool wear if available
  const hasWear = data.toolWear !== undefined && data.toolWear !== null;
  let wearHealth = 100;
  if (hasWear) {
    wearHealth = 100 * (1 - (data.toolWear! / WEAR_LIMIT));
  }

  // 3. Reliability logic: 
  // If we have direct toolHealth, use it but cap it by sensor health if sensors are screaming
  if (data.toolHealth !== undefined && data.toolHealth !== null) {
    health = Math.min(data.toolHealth, sensorHealth + 20); // Allow some buffer but don't ignore sensors
  } else if (hasWear && data.toolWear! > 0) {
    // Combine wear and sensor health
    health = Math.min(wearHealth, sensorHealth);
  } else {
    health = sensorHealth;
  }

  // Clamp between 0-100%
  health = Math.max(0, Math.min(100, health));

  let status: ToolStatus = 'GOOD';
  if (health < 30 || data.vibration > VIBRATION_BAD * 1.5) {
    status = 'CRITICAL';
  } else if (health <= 65 || data.vibration > VIBRATION_BAD) {
    status = 'WARNING';
  }

  // Estimate wear for this point
  const estimatedWear = estimateToolWear(data.vibration);
  
  // Predict max time based on history
  const predictedMaxTime = predictMaxOperationTime([...history, data]);

  return {
    toolHealth: parseFloat(health.toFixed(2)),
    status,
    estimatedToolWear: parseFloat(estimatedWear.toFixed(5)),
    predictedMaxTime: Math.round(predictedMaxTime)
  };
};
