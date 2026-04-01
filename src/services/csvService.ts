import Papa from 'papaparse';
import { TelemetryData } from './healthService';

export const parseCSVData = (csvString: string): TelemetryData[] => {
  const results = Papa.parse(csvString, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  return results.data.map((row: any) => ({
    vibration: row.vibration || 0,
    soundLevel: row.soundLevel || 0,
    toolWear: row.toolWear !== undefined ? row.toolWear : undefined,
    toolHealth: row.toolHealth !== undefined ? row.toolHealth : undefined,
    rpm: row.rpm !== undefined ? row.rpm : undefined,
    timestamp: row.timestamp || new Date().toISOString(),
  }));
};
