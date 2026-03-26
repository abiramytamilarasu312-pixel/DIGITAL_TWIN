
export interface HealthStatus {
  score: number;
  status: 'Healthy' | 'Moderate Wear' | 'Warning' | 'Replace Tool';
  color: string;
}

export const calculateToolHealth = (vibration: number, sound: number): HealthStatus => {
  // Simple algorithm based on user requirements
  // Health Score = 100 - vibration_factor - sound_factor
  
  let health = 100;
  
  // Vibration factor: 0.1-0.5 is normal, >0.5 is warning, >1.0 is critical
  const vibrationFactor = vibration * 15; 
  
  // Sound factor: 0-50 is normal, >50 is warning, >80 is critical
  const soundFactor = (sound / 100) * 10;
  
  health = health - vibrationFactor - soundFactor;
  health = Math.max(0, Math.min(100, health));
  
  let status: HealthStatus['status'] = 'Healthy';
  let color = '#10b981'; // Green
  
  if (health >= 90) {
    status = 'Healthy';
    color = '#10b981';
  } else if (health >= 70) {
    status = 'Moderate Wear';
    color = '#eab308'; // Yellow
  } else if (health >= 50) {
    status = 'Warning';
    color = '#f97316'; // Orange
  } else {
    status = 'Replace Tool';
    color = '#ef4444'; // Red
  }
  
  return { score: health, status, color };
};
