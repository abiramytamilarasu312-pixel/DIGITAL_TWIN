
export enum MachineHealth {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface Material {
  id: string;
  name: string;
  hardnessFactor: number;
  thermalFactor: number;
}

export interface ToolGrade {
  id: string;
  name: string;
  durabilityFactor: number;
  heatResistance: number;
}

export interface TelemetryData {
  timestamp: number;
  rpm: number;
  feedRate: number;
  spindleLoad: number;
  vibration: number;
  vibrationAlert: boolean;
  machineHealth: number;
  noiseLevel: number;
  noiseAlarm: boolean;
  temperature: number;
  toolWear: number;
  current: number;
  powerConsumption: number;
  forces: {
    fx: number;
    fy: number;
    fz: number;
  };
}

export interface AIDiagnosticResponse {
  healthStatus: string;
  anomaliesDetected: string[];
  prediction: string;
  recommendedActions: string[];
  summary: string;
}

export interface MaterialTest {
  isActive: boolean;
  durationSeconds: number;
  targetWear: number;
  startTime: number | null;
  scenario?: 'NORMAL' | 'AGGRESSIVE' | 'THERMAL' | 'IMPACT';
  testTitle?: string;
  researcherName?: string;
  batchId?: string;
  customWearMultiplier?: number;
  customHeatMultiplier?: number;
}

export interface DiscoveredDevice {
  id: string;
  name: string;
  ip: string;
  port: string;
  latency: number;
  lastSeen: number;
  status: 'ONLINE' | 'OFFLINE';
}

export interface ManualControlState {
  spindleRpm: number;
  feedRate: number;
  depthOfCut: number;
  lengthX: number;
  lengthY: number;
  stepOver: number;
  coolantEnabled: boolean;
  gCodeProgram: string;
  isExecutingGCode: boolean;
  currentLine: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

export interface ConventionalMillingState {
  spindleSpeed: number;
  feedRate: number;
  depthOfCut: number;
  stepOver: number;
  toolType: string;
  material: string;
  isLiveDemoActive: boolean;
}

export interface TwinState {
  id: string;
  name: string;
  model: string;
  machineType: 'CNC' | 'CONVENTIONAL';
  isMachineOn: boolean;
  health: MachineHealth;
  status: 'IDLE' | 'RUNNING' | 'ERROR' | 'MAINTENANCE';
  mode: 'SIMULATED' | 'ESP32' | 'OFFLINE_CSV' | 'PREDICTED_SIMULATION';
  wifiStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  discoveredDevices: DiscoveredDevice[];
  cloudSync: 'SYNCED' | 'SYNCING' | 'ERROR' | 'OFFLINE';
  lastSyncTimestamp?: number;
  lastCommandSent: string | null;
  hasReceivedInput: boolean;
  telemetry: TelemetryData;
  csvPlayback: {
    isActive: boolean;
    data: TelemetryData[];
    currentIndex: number;
    fileName: string | null;
  };
  predictedSimulation: {
    isActive: boolean;
    feedRate: number;
    depthOfCut: number;
    spindleSpeed: number;
    material: Material;
    toolGrade: ToolGrade;
    predictionData: TelemetryData[];
    wearThreshold: number;
    estimatedTimeToWear: number | null;
    currentIndex: number;
  };
  materialTest: MaterialTest;
  manualControl: ManualControlState;
  conventionalMilling: ConventionalMillingState;
  config: {
    material: Material;
    toolGrade: ToolGrade;
    simulationSpeed: number;
    enabledSensors: {
      vibration: boolean;
      temperature: boolean;
      forces: boolean;
      spindleLoad: boolean;
    };
    thresholds: {
      temperature: number;
      vibrationRms: number;
      goodRms: number;
      badRms: number;
      force: number;
      forceX: number;
      forceY: number;
      forceZ: number;
      toolWear: number;
      soundLimit: number;
    };
    thingSpeakKey: string;
    thingSpeakReadKey: string;
    thingSpeakChannelId: string;
    wifiEnabled: boolean;
    wifiSsid: string;
    wifiPassword: string;
    espIp: string;
    espPort: string;
    wifiProtocol: 'HTTP_POLL' | 'WEBSOCKET';
    aiSimulation: {
      wearRateMultiplier: number;
      thermalSensitivity: number;
      forceImpactFactor: number;
    };
  };
  predictions: {
    rul: number;
    failureProbability: number;
    nextMaintenanceDate: string;
    anomalyDetected: boolean;
  };
}

export interface ChartDataPoint {
  time: string;
  value: number;
}