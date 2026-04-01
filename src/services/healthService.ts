export type ToolStatus = 'GOOD' | 'WARNING' | 'CRITICAL';

export interface TelemetryData {
  vibration: number;
  soundLevel: number;
  toolWear?: number;
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

  if (data.toolWear !== undefined && data.toolWear !== null) {
    // Case 1: Tool wear available
    health = 100 * (1 - (data.toolWear / WEAR_LIMIT));
  } else {
    // Case 2: Tool wear NOT available
    const vibration_norm = data.vibration / VIBRATION_BAD;
    const sound_norm = data.soundLevel / SOUND_BAD;
    health = 100 * (1 - (0.6 * vibration_norm + 0.4 * sound_norm));
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
