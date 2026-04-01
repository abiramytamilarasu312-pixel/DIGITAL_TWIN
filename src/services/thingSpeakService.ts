import { TelemetryData } from './healthService';

export interface ThingSpeakConfig {
  channelId: string;
  readApiKey: string;
  fieldMapping: {
    vibration: string; // e.g., 'field1'
    soundLevel: string; // e.g., 'field2'
    toolWear?: string; // e.g., 'field3'
    toolHealth?: string; // e.g., 'field4'
    rpm?: string; // e.g., 'field5'
  };
}

export const fetchLatestThingSpeakData = async (config: ThingSpeakConfig): Promise<TelemetryData | null> => {
  try {
    const url = `https://api.thingspeak.com/channels/${config.channelId}/feeds.json?api_key=${config.readApiKey}&results=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch ThingSpeak data');
    
    const data = await response.json();
    const feed = data.feeds[0];
    
    if (!feed) return null;

    return {
      vibration: parseFloat(feed[config.fieldMapping.vibration]) || 0,
      soundLevel: parseFloat(feed[config.fieldMapping.soundLevel]) || 0,
      toolWear: config.fieldMapping.toolWear ? parseFloat(feed[config.fieldMapping.toolWear]) : undefined,
      toolHealth: config.fieldMapping.toolHealth ? parseFloat(feed[config.fieldMapping.toolHealth]) : undefined,
      rpm: config.fieldMapping.rpm ? parseFloat(feed[config.fieldMapping.rpm]) : undefined,
      timestamp: feed.created_at
    };
  } catch (error) {
    console.error('ThingSpeak Fetch Error:', error);
    return null;
  }
};
