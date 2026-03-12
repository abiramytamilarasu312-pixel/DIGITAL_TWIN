
export interface ThingSpeakFeed {
  created_at: string;
  entry_id: number;

  // Real channel mapping
  field1: string; // RMS
  field2: string; // ALERT LEVEL
  field3: string; // HEALTH
  field4: string; // Sound_Level
  field5: string; // Temperature
  field6: string; // TEMP_alarm
  field7: string; // noise_alarm
  field8?: string;
}

interface ThingSpeakResponse {
  channel: {
    id: number;
    name: string;
    field1?: string;
    field2?: string;
    field3?: string;
    field4?: string;
    field5?: string;
    field6?: string;
    field7?: string;
    field8?: string;
  };
  feeds: ThingSpeakFeed[];
}

export const fetchThingSpeakData = async (
  channelId: string,
  readApiKey: string
): Promise<ThingSpeakFeed | null> => {
  if (!channelId || channelId.trim() === '') {
    console.error('ThingSpeak Fetch Error: channelId is missing');
    return null;
  }

  if (!readApiKey || readApiKey.trim() === '') {
    console.error('ThingSpeak Fetch Error: readApiKey is missing for private channel');
    return null;
  }

  const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${encodeURIComponent(
    readApiKey
  )}&results=1`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ThingSpeak request failed with status ${response.status}`);
    }

    const data: ThingSpeakResponse = await response.json();

    if (!data.feeds || data.feeds.length === 0) {
      console.warn('ThingSpeak Fetch Warning: no feed data returned');
      return null;
    }

    const latest = data.feeds[0];

    return {
      created_at: latest.created_at,
      entry_id: latest.entry_id,
      field1: latest.field1 ?? '0',
      field2: latest.field2 ?? '0',
      field3: latest.field3 ?? '100',
      field4: latest.field4 ?? '0',
      field5: latest.field5 ?? '24',
      field6: latest.field6 ?? '0',
      field7: latest.field7 ?? '0',
      field8: latest.field8
    };
  } catch (error) {
    console.error('ThingSpeak Fetch Error:', error);
    return null;
  }
};