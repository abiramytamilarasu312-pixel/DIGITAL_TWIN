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
}

const WEAR_LIMIT = 0.5; // mm
const VIBRATION_BAD = 0.6; // g
const SOUND_BAD = 0.5;

export const calculateToolHealth = (data: TelemetryData): HealthResult => {
  let health = 100;

  // Prioritize toolHealth if directly provided in telemetry
  if (data.toolHealth !== undefined && data.toolHealth !== null) {
    health = data.toolHealth;
  } else {
    // Case 1: Tool wear available
    const hasWear = data.toolWear !== undefined && data.toolWear !== null;
    let wearHealth = 100;
    if (hasWear) {
      wearHealth = 100 * (1 - (data.toolWear! / WEAR_LIMIT));
    }

    // Case 2: Tool wear NOT available (or we need to check vibration/sound for override)
    const vibration_norm = data.vibration / VIBRATION_BAD;
    const sound_norm = data.soundLevel / SOUND_BAD;
    const sensorHealth = 100 * (1 - (0.6 * vibration_norm + 0.4 * sound_norm));

    // CRITICAL FIX: If toolHealth from wear is 100 (e.g. toolWear is 0 or missing),
    // but vibration/sound sensors indicate degradation, use sensorHealth.
    if (hasWear && wearHealth < 100) {
      health = wearHealth;
    } else {
      health = sensorHealth;
    }
  }

  // Clamp between 0-100%
  health = Math.max(0, Math.min(100, health));

  let status: ToolStatus = 'GOOD';
  if (health < 40) {
    status = 'CRITICAL';
  } else if (health <= 70) {
    status = 'WARNING';
  }

  return {
    toolHealth: parseFloat(health.toFixed(2)),
    status
  };
};
