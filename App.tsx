
import { sendAlert } from './emailService';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { TelemetryData, TwinState, MachineHealth, Material, ToolGrade, DiscoveredDevice } from './types';
import { fetchThingSpeakData } from './services/thingspeak';
const MACHINE_CONFIG = {
  POLLING_INTERVAL_MS: 1000
};

import {
  Wifi, Cloud, AlertCircle, X, ShieldAlert, AlertTriangle, Info
} from 'lucide-react';
import emailjs from '@emailjs/browser';

const estimateToolWearMm = (
  vibration: number,
  soundLevel: number,
  previousWear: number = 0,
  isRunning: boolean = true
): number => {
  if (!isRunning) {
    return Math.max(0, previousWear);
  }

  // Base wear increment per cycle in mm
  const baseIncrement = 0.0015;

  // Sensor contribution
  const vibrationFactor = Math.max(0, vibration - 0.05) * 0.012;
  const soundFactor = Math.max(0, soundLevel - 0.03) * 0.010;

  // Total increment this cycle
  const increment = baseIncrement + vibrationFactor + soundFactor;

  // Clamp to a practical demo range
  return Math.min(0.50, Math.max(0, previousWear + increment));
};

const MATERIALS: Material[] = [
  { id: 'al6061', name: 'Aluminum 6061', hardnessFactor: 0.7 },
  { id: 'mild-steel', name: 'Mild Steel', hardnessFactor: 1.0 },
  { id: 'al7075', name: 'Aluminum 7075-T6', hardnessFactor: 0.85 },
  { id: 'st1045', name: 'Steel AISI 1045', hardnessFactor: 1.2 },
  { id: 'st4140', name: 'Chromoly 4140', hardnessFactor: 1.5 },
  { id: 'ss316', name: 'Stainless 316L', hardnessFactor: 1.1 },
  { id: 'ti64', name: 'Titanium Ti-6Al-4V', hardnessFactor: 2.2 },
  { id: 'd2steel', name: 'Tool Steel D2', hardnessFactor: 2.8 },
  { id: 'in718', name: 'Inconel 718', hardnessFactor: 3.5 },
  { id: 'ha-x', name: 'Hastelloy X', hardnessFactor: 3.8 },
  { id: 'gr-25', name: 'Cast Iron Gr 25', hardnessFactor: 1.1 },
  { id: 'peek', name: 'PEEK (Polymer)', hardnessFactor: 0.3 },
  { id: 'br360', name: 'Brass C360', hardnessFactor: 0.6 },
];

const TOOL_GRADES: ToolGrade[] = [
  { id: 'hss', name: 'HSS (Standard)', durabilityFactor: 0.5 },
  { id: 'uncoated', name: 'Carbide (Uncoated)', durabilityFactor: 2.0 },
  { id: 'carbide', name: 'Carbide (Micrograin)', durabilityFactor: 2.5 },
  { id: 'cobalt', name: 'Cobalt (M42)', durabilityFactor: 1.5 },
  { id: 'ticn', name: 'TiCN Coated', durabilityFactor: 3.2 },
  { id: 'altin', name: 'AlTiN Coated', durabilityFactor: 3.8 },
  { id: 'tialn', name: 'TiAlN (Nano)', durabilityFactor: 4.2 },
  { id: 'cermet', name: 'Cermet (Finishing)', durabilityFactor: 2.3 },
  { id: 'dlc', name: 'DLC Coated', durabilityFactor: 4.8 },
  { id: 'pcd', name: 'PCD Diamond', durabilityFactor: 5.0 },
  { id: 'ceramic', name: 'Ceramic (Si3N4)', durabilityFactor: 1.0 },
  { id: 'cbn', name: 'CBN (High Hardness)', durabilityFactor: 7.0 },
];

const INITIAL_TELEMETRY: TelemetryData = {
  timestamp: Date.now(),
  rpm: 0,
  feedRate: 0,
  spindleLoad: 0,
  vibration: 0,
  vibrationAlert: false,
  machineHealth: 100,
  soundLevel: 0,
  noiseAlarm: false,
  toolWear: 0,
  optimizedVibration: 0,
  optimizedNoise: 0,
  current: 0,
  powerConsumption: 0,
  forces: { fx: 0, fy: 0, fz: 0 }
};

const INITIAL_STATE: TwinState = {
  id: 'CNC-PRO-G3-001',
  name: 'Smart Factory Alpha - Unit 01',
  model: 'Acu-Drill Pro 5000 Edge',
  machineType: 'CNC',
  isMachineOn: true,
  health: MachineHealth.HEALTHY,
  status: 'IDLE',
  mode: 'SIMULATED',
  wifiStatus: 'DISCONNECTED',
  discoveredDevices: [],
  cloudSync: 'OFFLINE',
  lastSyncTimestamp: undefined,
  lastCommandSent: null,
  hasReceivedInput: false,
  telemetry: INITIAL_TELEMETRY,
  csvPlayback: {
    isActive: false,
    data: [],
    currentIndex: 0,
    fileName: null
  },
  predictedSimulation: {
    isActive: false,
    feedRate: 300,
    depthOfCut: 1.5,
    spindleSpeed: 1200,
    material: MATERIALS[1],
    toolGrade: TOOL_GRADES[0],
    predictionData: [],
    wearThreshold: 95,
    estimatedTimeToWear: null,
    exactWearTimestamp: null,
    estimatedOperationsRemaining: null,
    operationCycleTime: 60,
    currentIndex: 0,
    workpieceDimensions: {
      length: 100,
      width: 100,
      height: 50
    }
  },
  materialTest: {
    isActive: false,
    durationSeconds: 30,
    targetWear: 95,
    startTime: null,
    scenario: 'NORMAL',
    testTitle: 'Stability Analysis',
    researcherName: 'Dr. Edge Engineer',
    batchId: 'B-001',
    customWearMultiplier: 1.0
  },
  manualControl: {
    spindleRpm: 1200,
    feedRate: 300,
    depthOfCut: 1.5,
    lengthX: 100,
    lengthY: 100,
    heightZ: 50,
    stepOver: 0.5,
    coolantEnabled: false,
    gCodeProgram: '(Sample G-Code)\nG21 (Metric)\nG90 (Absolute)\nM03 S1200 (Spindle ON)\nG00 X0 Y0 Z5 (Rapid to start)\nG01 Z-1.5 F100 (Plunge)\nG01 X50 Y0 F300 (Cut line)\nG01 X50 Y50\nG01 X0 Y50\nG01 X0 Y0\nG00 Z5 (Retract)\nM05 (Spindle OFF)\nM30 (End)',
    isExecutingGCode: false,
    currentLine: 0,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    notificationEmails: []
  },
  conventionalMilling: {
    spindleSpeed: 110,
    feedRate: 200,
    depthOfCut: 1,
    stepOver: 0.5,
    toolType: 'End Mill',
    material: 'Aluminum 6061',
    isLiveDemoActive: false
  },
  config: {
    material: MATERIALS[1], // Mild steel default
    toolGrade: TOOL_GRADES[0], // HSS default
    simulationSpeed: 1.0,
    enabledSensors: {
      vibration: true,
      forces: true,
      spindleLoad: true
    },
    thresholds: {
      vibrationRms: 0.30,
      goodRms: 0.30,
      badRms: 0.40,
      force: 450,
      forceX: 250,
      forceY: 250,
      forceZ: 800,
      toolWear: 0.30,
      soundLimit: 0.15,
      spindleLoadLimit: 85
    },
    thingSpeakKey: 'OFCVHUDM9J3Z4OT1',
    thingSpeakReadKey: 'Z5TU5X0BLUQUTTMD',
    thingSpeakChannelId: '3277372',
    wifiEnabled: true,
    wifiSsid: '',
    wifiPassword: '',
    espIp: '192.168.1.100',
    espPort: '80',
    wifiProtocol: 'HTTP_POLL',
    aiSimulation: {
      wearRateMultiplier: 1.0,
      forceImpactFactor: 1.0
    }
  },
  predictions: {
    rul: 425.5,
    failureProbability: 0.02,
    nextMaintenanceDate: '2025-01-20',
    anomalyDetected: false
  }
};

interface Alarm {
  type: 'CRITICAL' | 'WARNING';
  category: 'VIBRATION' | 'WEAR' | 'SYSTEM' | 'LOAD' | 'FORCE' | 'SPEED' | 'NOISE';
  message: string;
  recommendations: string[];
}

interface NotificationItem {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  category: string;
  message: string;
  timestamp: number;
}

interface SessionLogEntry {
  id: string;
  mode: 'SIMULATED' | 'ESP32' | 'OFFLINE_CSV' | 'PREDICTED_SIMULATION';
  title: string;
  startTime: number;
  endTime: number | null;
  durationSec: number;
  maxVibration: number;
  maxSound: number;
  finalHealth: number;
  status: 'COMPLETED' | 'ABORTED' | 'RUNNING';
  sourceName?: string | null;
  fullHistory?: TelemetryData[];
}

const generatePredictionData = (
  feedRate: number,
  depthOfCut: number,
  spindleSpeed: number,
  material: Material,
  toolGrade: ToolGrade,
  wearThreshold: number,
  vibrationThreshold: number,
  soundThreshold: number,
  spindleLoadThreshold: number,
  operationCycleTime: number
): { data: TelemetryData[], estimatedTime: number, exactTimestamp: number, operationsRemaining: number } => {
  const data: TelemetryData[] = [];
  let currentWear = 0;
  let time = 0;
  const startTime = Date.now();
  
  const baseWearRate = 0.05; 
  const wearRate = baseWearRate * (feedRate / 200) * depthOfCut * (spindleSpeed / 800) * material.hardnessFactor / toolGrade.durabilityFactor;
  
  const baseVibration = 0.08 + (spindleSpeed / 4000) * (feedRate / 400);

  while (time < 3600) { 
    const wear = currentWear;
    const vib = baseVibration * (1 + (wear / 100) * 1.5) + (Math.random() * 0.01);
    const sound = (vib * 0.4) + (Math.random() * 0.005);
    
    // Optimized baseline values (ideal conditions)
    const optVib = baseVibration;
    const optSound = baseVibration * 0.4;

    const load = Math.min(100, (feedRate / 400) * depthOfCut * 15 * (1 + wear / 150));
    
    data.push({
      timestamp: startTime + time * 1000,
      rpm: spindleSpeed,
      feedRate: feedRate,
      spindleLoad: load,
      vibration: vib,
      vibrationAlert: vib > vibrationThreshold,
      machineHealth: Math.max(0, 100 - wear),
      soundLevel: sound,
      noiseAlarm: sound > soundThreshold,
      toolWear: wear,
      optimizedVibration: optVib,
      optimizedNoise: optSound,
      current: (spindleSpeed / 1200) * 4 + (feedRate / 150),
      powerConsumption: (spindleSpeed / 1200) * 1.5 + (feedRate / 400),
      forces: {
        fx: feedRate * depthOfCut * 0.4,
        fy: feedRate * depthOfCut * 0.2,
        fz: depthOfCut * 80
      }
    });
    
    if (wear >= wearThreshold || vib >= vibrationThreshold || sound >= soundThreshold || load >= spindleLoadThreshold) {
      break;
    }

    currentWear += wearRate;
    time += 1; 
  }
  
  const exactTimestamp = startTime + time * 1000;
  const operationsRemaining = Math.floor(time / Math.max(1, operationCycleTime));
  
  return { data, estimatedTime: time, exactTimestamp, operationsRemaining };
};

const App: React.FC = () => {
  const [twinState, setTwinState] = useState<TwinState>(INITIAL_STATE);
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const [sessionLog, setSessionLog] = useState<SessionLogEntry[]>([]);
  const currentSessionRef = useRef<SessionLogEntry | null>(null);

  const stateRef = useRef<TwinState>(INITIAL_STATE);
  const lastCloudSyncRef = useRef<number>(0);
  const notificationThrottleRef = useRef<Record<string, number>>({});

  useEffect(() => {
    stateRef.current = twinState;
  }, [twinState]);

  useEffect(() => {
  const savedLogs = localStorage.getItem('twin_session_log');

  if (savedLogs) {
    try {
      const parsed = JSON.parse(savedLogs);
      setSessionLog(parsed);
    } catch (err) {
      console.error('Failed to load saved session logs');
    }
  }
}, []);

useEffect(() => {
  localStorage.setItem('twin_session_log', JSON.stringify(sessionLog));
}, [sessionLog]);

  const addNotification = useCallback((type: 'CRITICAL' | 'WARNING' | 'INFO', category: string, message: string) => {
    const key = `${category}-${type}`;
    const now = Date.now();
    if (notificationThrottleRef.current[key] && now - notificationThrottleRef.current[key] < 5000) return;

    notificationThrottleRef.current[key] = now;
    const newNotif: NotificationItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      category,
      message,
      timestamp: now
    };

    setNotifications(prev => [newNotif, ...prev].slice(0, 5));

    // Send Email Notification if critical or warning
    if (
      type === 'CRITICAL' &&
      (category === 'VIBRATION' || category === 'NOISE') &&
      twinState.manualControl.notificationEmails.length > 0
    ) {
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const userId = import.meta.env.VITE_EMAILJS_USER_ID;

      if (serviceId && templateId && userId) {
        twinState.manualControl.notificationEmails.forEach(email => {
          emailjs.send(serviceId, templateId,{
            to_email: email,
            alert_type: type,
            category: category,
            message: message,
            machine_name: twinState.name,
            timestamp: new Date(now).toLocaleString(),
            vibration: twinState.telemetry.vibration?.toFixed(3),
            sound: twinState.telemetry.soundLevel?.toFixed(3),
            health: twinState.telemetry.machineHealth?.toFixed(1),
            rpm: twinState.telemetry.rpm?.toFixed(0)
          } , {
            publicKey: userId
          }).catch(err => console.error('Email Notification Error:', err));
        });
      } else {
        console.warn('EmailJS configuration missing. Please set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_USER_ID in environment variables.');
      }
    }

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 8000);
  }, []);

  const scanForDevices = useCallback(async () => {
    if (isScanning || !stateRef.current.config.wifiEnabled) return;
    setIsScanning(true);

    const { espIp, espPort } = stateRef.current.config;
    const discovered: DiscoveredDevice[] = [];

    try {
      const startTime = Date.now();
      await fetch(`http://${espIp}:${espPort}/telemetry`, {
        mode: 'no-cors',
        signal: AbortSignal.timeout(1500)
      });
      discovered.push({
        id: 'node-current',
        name: 'Acu-Drill Pro ESP32',
        ip: espIp,
        port: espPort,
        latency: Date.now() - startTime,
        lastSeen: Date.now(),
        status: 'ONLINE'
      });
    } catch (e) {
      // silent fail for soft scan
    }

    discovered.push({
      id: 'node-sim-01',
      name: 'Workshop B - Lathe-04',
      ip: '192.168.1.105',
      port: '80',
      latency: 42,
      lastSeen: Date.now(),
      status: 'ONLINE'
    });

    setTwinState(s => ({ ...s, discoveredDevices: discovered }));
    setTimeout(() => setIsScanning(false), 2000);
  }, [isScanning]);

  const handleConfigChange = useCallback((cfg: any) => {
    setTwinState(s => {
      const newState = { ...s };

      if (cfg.machineType) newState.machineType = cfg.machineType;
      if (cfg.hasOwnProperty('isMachineOn')) newState.isMachineOn = cfg.isMachineOn;

      if (cfg.materialTest) {
        newState.materialTest = { ...s.materialTest, ...cfg.materialTest };
      }

      if (cfg.manualControl) {
        newState.manualControl = { ...s.manualControl, ...cfg.manualControl };
        if (cfg.manualControl.isExecutingGCode === true) {
          newState.hasReceivedInput = true;
        }
      }

      if (cfg.conventionalMilling) {
        newState.conventionalMilling = { ...s.conventionalMilling, ...cfg.conventionalMilling };
      }

      if (cfg.csvPlayback) {
        newState.csvPlayback = { ...s.csvPlayback, ...cfg.csvPlayback };
      }

      if (cfg.predictedSimulation) {
        newState.predictedSimulation = { ...s.predictedSimulation, ...cfg.predictedSimulation };
      }

      if (cfg.thresholds) {
        newState.config = { ...s.config, thresholds: { ...s.config.thresholds, ...cfg.thresholds } };
      }

      if (cfg.aiSimulation) {
        newState.config = { ...s.config, aiSimulation: { ...s.config.aiSimulation, ...cfg.aiSimulation } };
      }

      if (
        cfg.material ||
        cfg.toolGrade ||
        cfg.hasOwnProperty('thingSpeakKey') ||
        cfg.hasOwnProperty('thingSpeakReadKey') ||
        cfg.hasOwnProperty('thingSpeakChannelId') ||
        cfg.hasOwnProperty('wifiEnabled') ||
        cfg.wifiSsid ||
        cfg.wifiPassword ||
        cfg.espIp ||
        cfg.espPort ||
        cfg.hasOwnProperty('simulationSpeed') ||
        cfg.hasOwnProperty('enabledSensors')
      ) {
        newState.config = { ...newState.config, ...cfg };
      }

      if (cfg.status) newState.status = cfg.status;
      return newState;
    });
  }, []);

  const handleCsvUpload = useCallback((file: File) => {
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target?.result as string;
    const lines = text
      .split(/\r?\n/)
      .filter(l => l.trim() !== '');

    if (lines.length <= 1) return;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    let previousWearMm = 0;
    const data: TelemetryData[] = lines.slice(1).map((line, idx) => {
      const values = line.split(',').map(v => v.trim());

      const row: any = {
        timestamp: Date.now() + idx * 1000,
        forces: { fx: 0, fy: 0, fz: 0 }
      };

      headers.forEach((header, i) => {
        const val = parseFloat(values[i]);
        if (isNaN(val)) return;

        // Generic headers
        if (header.includes('rpm')) row.rpm = val;
        else if (header.includes('feed')) row.feedRate = val;
        else if (header.includes('load')) row.spindleLoad = val;
        else if (header.includes('vibration') || header.includes('rms')) row.vibration = val;
        else if (header.includes('wear')) row.toolWear = val;
        else if (header.includes('current')) row.current = val;
        else if (header.includes('power')) row.powerConsumption = val;
        else if (header.includes('health')) row.machineHealth = val;
        else if (header.includes('sound') || header.includes('noise')) row.soundLevel = val;
        else if (header.includes('fx')) row.forces.fx = val;
        else if (header.includes('fy')) row.forces.fy = val;
        else if (header.includes('fz')) row.forces.fz = val;

        // ThingSpeak export headers
        else if (header === 'field1') row.vibration = val;       // RMS
        else if (header === 'field2') row.alertLevel = val;      // ALERT LEVEL
        else if (header === 'field3') row.machineHealth = val;   // HEALTH
        else if (header === 'field4') row.soundLevel = val;      // Sound_Level
        else if (header === 'field5') row.noiseAlarmFlag = val;  // noise_alarm
        else if (header === 'field6') row.toolWear = val;        // tool_wear
      });

      row.rpm = row.rpm ?? 0;
      row.feedRate = row.feedRate ?? 0;
      row.spindleLoad = row.spindleLoad ?? 0;
      row.vibration = row.vibration ?? 0;
      
      if (row.toolWear === undefined || row.toolWear === null || isNaN(row.toolWear)) {
        row.toolWear = estimateToolWearMm(
          row.vibration,
          row.soundLevel,
          previousWearMm,
          true
        );
      }

      previousWearMm = row.toolWear;
      
      row.current = row.current ?? 0;
      row.powerConsumption = row.powerConsumption ?? 0;
      row.machineHealth = row.machineHealth ?? 100;
      row.soundLevel = row.soundLevel ?? 0;

      row.vibrationAlert = row.vibration > stateRef.current.config.thresholds.vibrationRms;
      row.noiseAlarm =
        row.noiseAlarmFlag === 1 ||
        row.soundLevel > stateRef.current.config.thresholds.soundLimit;

      return row as TelemetryData;
    });

    if (stateRef.current.mode === 'PREDICTED_SIMULATION') {
      addNotification('INFO', 'SYSTEM', `Analysis data loaded: ${data.length} points. Updating prediction model.`);
      setTwinState(s => ({
        ...s,
        predictedSimulation: {
          ...s.predictedSimulation,
          predictionData: data,
          estimatedTimeToWear: data.length,
          currentIndex: 0
        }
      }));
      return;
    }

    addNotification('INFO', 'SYSTEM', `CSV loaded: ${data.length} rows. Offline CSV mode ready.`);

    setTwinState(s => ({
      ...s,
      mode: 'OFFLINE_CSV',
      hasReceivedInput: true,
      status: 'IDLE',
      csvPlayback: {
        isActive: false,
        data,
        currentIndex: 0,
        fileName: file.name
      }
    }));

    setHistory([]);
  };

  reader.readAsText(file);
}, [addNotification]);

  const startPredictedSimulation = useCallback(() => {
    const { feedRate, depthOfCut, spindleSpeed, material, toolGrade, wearThreshold, operationCycleTime } = stateRef.current.predictedSimulation;
    const { thresholds } = stateRef.current.config;
    
    const { data, estimatedTime, exactTimestamp, operationsRemaining } = generatePredictionData(
      feedRate,
      depthOfCut,
      spindleSpeed,
      material,
      toolGrade,
      wearThreshold,
      thresholds.vibrationRms,
      thresholds.soundLimit,
      thresholds.spindleLoadLimit,
      operationCycleTime
    );

    setTwinState(s => ({
      ...s,
      mode: 'PREDICTED_SIMULATION',
      status: 'RUNNING',
      hasReceivedInput: true,
      predictedSimulation: {
        ...s.predictedSimulation,
        isActive: true,
        predictionData: data,
        estimatedTimeToWear: estimatedTime,
        exactWearTimestamp: exactTimestamp,
        estimatedOperationsRemaining: operationsRemaining,
        currentIndex: 0
      }
    }));

    setHistory([]);
    addNotification('INFO', 'SYSTEM', `Predicted simulation started. Estimated tool life: ${estimatedTime}s`);
  }, [addNotification]);

  const handleSetMode = useCallback((mode: TwinState['mode']) => {
    if (mode === 'ESP32' && (!stateRef.current.config.thingSpeakChannelId || stateRef.current.config.thingSpeakChannelId.trim() === '')) {
      addNotification('WARNING', 'SYSTEM', 'ThingSpeak Channel ID is missing. Please configure it in the Setup tab.');
    }
    setTwinState(s => ({
      ...s,
      mode,
      status: (mode === 'OFFLINE_CSV' || mode === 'PREDICTED_SIMULATION') ? 'IDLE' : s.status
    }));
  }, [addNotification]);

  const handleSave = useCallback(() => {
    const stateToSave = {
      config: stateRef.current.config,
      manualControl: stateRef.current.manualControl,
      materialTest: stateRef.current.materialTest,
      conventionalMilling: stateRef.current.conventionalMilling,
      predictedSimulation: {
        feedRate: stateRef.current.predictedSimulation.feedRate,
        depthOfCut: stateRef.current.predictedSimulation.depthOfCut,
        spindleSpeed: stateRef.current.predictedSimulation.spindleSpeed,
        material: stateRef.current.predictedSimulation.material,
        toolGrade: stateRef.current.predictedSimulation.toolGrade,
        wearThreshold: stateRef.current.predictedSimulation.wearThreshold,
        operationCycleTime: stateRef.current.predictedSimulation.operationCycleTime,
        workpieceDimensions: stateRef.current.predictedSimulation.workpieceDimensions
      }
    };
    localStorage.setItem('twin_core_config', JSON.stringify(stateToSave));
    addNotification('INFO', 'SYSTEM', 'Configuration saved to local storage');
  }, [addNotification]);

  const syncToThingSpeak = useCallback(async (telemetry: TelemetryData, key: string, force: boolean = false) => {
    if (!key || key.trim() === '') {
      if (force) addNotification('WARNING', 'CLOUD', 'ThingSpeak API key missing');
      return;
    }

    const now = Date.now();
    if (!force && now - lastCloudSyncRef.current < 16000) return;
    lastCloudSyncRef.current = now;

    setTwinState(s => ({ ...s, cloudSync: 'SYNCING' }));

    try {
      const thresholds = stateRef.current.config.thresholds;

      const alertLevel =
        telemetry.vibration > thresholds.badRms ||
        telemetry.soundLevel > thresholds.soundLimit
          ? 2
          : telemetry.vibration > thresholds.goodRms
          ? 1
          : 0;

      const noiseAlarmFlag = telemetry.soundLevel > thresholds.soundLimit ? 1 : 0;

      const baseUrl = 'https://api.thingspeak.com/update';
      const params = new URLSearchParams({
        api_key: key,
        field1: (telemetry.vibration || 0).toFixed(3),        // RMS
        field2: alertLevel.toString(),                        // ALERT LEVEL
        field3: (telemetry.machineHealth || 100).toFixed(1), // HEALTH
        field4: (telemetry.soundLevel || 0).toFixed(3),      // Sound_Level
        field5: noiseAlarmFlag.toString(),
        field6: (telemetry.toolWear || 0).toFixed(3)
      });

      const response = await fetch(`${baseUrl}?${params.toString()}`);

      if (response.ok) {
        setTwinState(s => ({ ...s, cloudSync: 'SYNCED', lastSyncTimestamp: now }));
        if (force) addNotification('INFO', 'CLOUD', 'Manual sync successful');
      } else {
        setTwinState(s => ({ ...s, cloudSync: 'ERROR' }));
        if (force) addNotification('CRITICAL', 'CLOUD', 'Sync failed: API error');
      }
    } catch (e) {
      setTwinState(s => ({ ...s, cloudSync: 'ERROR' }));
      if (force) addNotification('CRITICAL', 'CLOUD', 'Sync failed: network error');
    }
  }, [addNotification]);

  useEffect(() => {
    const { telemetry, config, status, mode } = twinState;
    if (status === 'RUNNING' && (mode === 'SIMULATED' || mode === 'OFFLINE_CSV' || mode === 'PREDICTED_SIMULATION')) {
      syncToThingSpeak(telemetry, config.thingSpeakKey);
    }
  }, [twinState.telemetry, twinState.config.thingSpeakKey, twinState.status, twinState.mode, syncToThingSpeak]);

  const sendHardwareCommand = useCallback(async (action: string, value?: string) => {
    const { espIp, espPort } = stateRef.current.config;
    if (!espIp) return;

    const url = `http://${espIp}:${espPort}/control?action=${action}${value ? `&value=${value}` : ''}`;

    try {
      setTwinState(s => ({ ...s, lastCommandSent: `UPLINK [HTTP]: ${action}${value ? `=${value}` : ''}` }));
      await fetch(url, { mode: 'no-cors' });
    } catch (error) {
      setTwinState(s => ({ ...s, lastCommandSent: 'UPLINK ERROR: TARGET UNREACHABLE' }));
    }
  }, []);

  const resetMachine = useCallback(() => {
      if (currentSessionRef.current) {
    const endTime = Date.now();

    const abortedSession: SessionLogEntry = {
      ...currentSessionRef.current,
      endTime,
      durationSec: Math.round((endTime - currentSessionRef.current.startTime) / 1000),
      finalHealth: twinState.telemetry.machineHealth || 100,
      status: 'ABORTED'
    };

    setSessionLog(prev => [abortedSession, ...prev]);
    currentSessionRef.current = null;
  }
  
    setActiveAlarm(null);
    setNotifications([]);
    setHistory([]); 

    if (stateRef.current.mode === 'SIMULATED' || stateRef.current.mode === 'OFFLINE_CSV' || stateRef.current.mode === 'PREDICTED_SIMULATION') {
      setTwinState(prev => ({
        ...prev,
        status: 'IDLE',
        hasReceivedInput: false,
        health: MachineHealth.HEALTHY,
        telemetry: { ...INITIAL_TELEMETRY, timestamp: Date.now() },
        materialTest: { ...prev.materialTest, isActive: false, startTime: null },
        manualControl: { ...prev.manualControl, isExecutingGCode: false, currentLine: 0 },
        csvPlayback: { ...prev.csvPlayback, currentIndex: 0, isActive: false },
        predictedSimulation: { ...prev.predictedSimulation, isActive: false, currentIndex: 0 }
      }));
    } else {
      sendHardwareCommand('RESET_SYSTEM');
      setTwinState(prev => ({
        ...prev,
        status: 'IDLE',
        hasReceivedInput: false,
        health: MachineHealth.HEALTHY,
        telemetry: { ...INITIAL_TELEMETRY, timestamp: Date.now() },
        materialTest: { ...prev.materialTest, isActive: false, startTime: null },
        manualControl: { ...prev.manualControl, isExecutingGCode: false, currentLine: 0 },
        csvPlayback: { ...prev.csvPlayback, isActive: false, currentIndex: 0 },
        predictedSimulation: { ...prev.predictedSimulation, isActive: false, currentIndex: 0 }
      }));
    }
  }, [sendHardwareCommand, twinState.telemetry.machineHealth]);

  useEffect(() => {
    if (twinState.mode !== 'ESP32') return;

    const pollThingSpeak = async () => {
      const channelId = twinState.config.thingSpeakChannelId;
      
      if (!channelId || channelId.trim() === '') {
        setTwinState(s => ({ ...s, cloudSync: 'ERROR' }));
        return;
      }

      const data = await fetchThingSpeakData(
        channelId,
        twinState.config.thingSpeakReadKey || ''
      );

      if (data) {
        // REAL CHANNEL MAPPING:
        // field1 = RMS
        // field2 = ALERT LEVEL
        // field3 = HEALTH
        // field4 = Sound_Level
        // field5 = noise_alarm
        // field6 = tool_wear

        const vibration = parseFloat(data.field1) || 0;
        const alertLevel = parseFloat(data.field2) || 0;
        const healthFromESP = parseFloat(data.field3) || 100;
        const sound = parseFloat(data.field4) || 0;
        const noiseAlarm = parseFloat(data.field5) || 0;
        const toolWear = parseFloat(data.field6) || 0;
        const estimatedWearMm = estimateToolWearMm(
          vibration,
          sound,
          stateRef.current.telemetry.toolWear || 0,
          vibration > 0.02
        );

        const updatedTele: TelemetryData = {
          ...stateRef.current.telemetry,
          timestamp: Date.now(),
          vibration,
          soundLevel: sound,
          toolWear: toolWear,
          machineHealth: healthFromESP,
          vibrationAlert: vibration > stateRef.current.config.thresholds.vibrationRms,
          noiseAlarm: noiseAlarm === 1,
        };

        let health = MachineHealth.HEALTHY;
        if (healthFromESP < 50 || alertLevel >= 2 || noiseAlarm === 1) {
          health = MachineHealth.CRITICAL;
        } else if (healthFromESP < 70 || alertLevel === 1) {
          health = MachineHealth.WARNING;
        }

        setTwinState(s => {
          const isFirstInput = !s.hasReceivedInput;
          if (isFirstInput) setHistory([]);

          return {
            ...s,
            telemetry: updatedTele,
            health,
            cloudSync: 'SYNCED',
            lastSyncTimestamp: Date.now(),
            hasReceivedInput: true,
            status: vibration > 0.05 ? 'RUNNING' : 'IDLE'
          };
        });

        setHistory(prev => [...prev, updatedTele].slice(-50));

        if (alertLevel >= 2) {
          addNotification('CRITICAL', 'SYSTEM', 'Critical alert received from ThingSpeak/ESP32');
        } else if (alertLevel === 1) {
          addNotification('WARNING', 'SYSTEM', 'Warning alert received from ThingSpeak/ESP32');
        }
      } else {
        setTwinState(s => ({ ...s, cloudSync: 'ERROR' }));
        addNotification('CRITICAL', 'CLOUD', 'Data connection lost');
      }
    };

    pollThingSpeak();
    const interval = setInterval(pollThingSpeak, 5000);
    return () => clearInterval(interval);
  }, [twinState.mode, twinState.config.thingSpeakChannelId, addNotification]);

  useEffect(() => {
    const saved = localStorage.getItem('twin_core_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTwinState(s => ({
          ...s,
          config: { ...s.config, ...parsed.config },
          manualControl: { ...s.manualControl, ...parsed.manualControl },
          materialTest: { ...s.materialTest, ...parsed.materialTest },
          conventionalMilling: { ...s.conventionalMilling, ...parsed.conventionalMilling },
          predictedSimulation: parsed.predictedSimulation ? { 
            ...s.predictedSimulation, 
            ...parsed.predictedSimulation,
            workpieceDimensions: parsed.predictedSimulation.workpieceDimensions || s.predictedSimulation.workpieceDimensions
          } : s.predictedSimulation
        }));

        setTimeout(() => {
          addNotification('INFO', 'SYSTEM', 'Saved configuration loaded successfully');
        }, 1000);
      } catch (e) {
        console.error('Failed to load saved config', e);
      }
    }
  }, [addNotification]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stateToSave = {
        config: twinState.config,
        manualControl: twinState.manualControl,
        materialTest: twinState.materialTest,
        conventionalMilling: twinState.conventionalMilling,
        predictedSimulation: {
          feedRate: twinState.predictedSimulation.feedRate,
          depthOfCut: twinState.predictedSimulation.depthOfCut,
          spindleSpeed: twinState.predictedSimulation.spindleSpeed,
          material: twinState.predictedSimulation.material,
          toolGrade: twinState.predictedSimulation.toolGrade,
          wearThreshold: twinState.predictedSimulation.wearThreshold,
          operationCycleTime: twinState.predictedSimulation.operationCycleTime,
          workpieceDimensions: twinState.predictedSimulation.workpieceDimensions
        }
      };
      localStorage.setItem('twin_core_config', JSON.stringify(stateToSave));
    }, 2000);

    return () => clearTimeout(timer);
  }, [twinState.config, twinState.manualControl, twinState.materialTest, twinState.conventionalMilling]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (stateRef.current.mode === 'ESP32') return;

      setTwinState(prev => {
        if (prev.mode === 'PREDICTED_SIMULATION') {
          const { predictionData, currentIndex, isActive } = prev.predictedSimulation;
          if (predictionData.length === 0 || !isActive || prev.status !== 'RUNNING') return prev;

          const nextIndex = (currentIndex + 1) % predictionData.length;
          const nextTele = {
            ...predictionData[currentIndex],
            timestamp: Date.now()
          };

          if (currentSessionRef.current && prev.status === 'RUNNING') {
            currentSessionRef.current = {
              ...currentSessionRef.current,
              maxVibration: Math.max(currentSessionRef.current.maxVibration, nextTele.vibration || 0),
              maxSound: Math.max(currentSessionRef.current.maxSound, nextTele.soundLevel || 0),
              finalHealth: nextTele.machineHealth || 100,
              fullHistory: [...(currentSessionRef.current.fullHistory || []), nextTele]
            };
          }

          setHistory(h => [...h, nextTele].slice(-200));
          sendAlert(nextTele);

          if (nextIndex === 0) {
            return {
              ...prev,
              status: 'IDLE',
              predictedSimulation: { ...prev.predictedSimulation, isActive: false, currentIndex: 0 }
            };
          }

          return {
            ...prev,
            telemetry: nextTele,
            predictedSimulation: { ...prev.predictedSimulation, currentIndex: nextIndex }
          };
        }

        if (prev.mode === 'OFFLINE_CSV') {
          const { data, currentIndex, isActive } = prev.csvPlayback;
          if (data.length === 0 || !isActive || prev.status !== 'RUNNING') return prev;

          const nextIndex = (currentIndex + 1) % data.length;
          const nextTele = {
            ...data[currentIndex],
            timestamp: Date.now(),
            vibrationAlert: (data[currentIndex].vibration || 0) > prev.config.thresholds.vibrationRms,
            noiseAlarm: (data[currentIndex].soundLevel || 0) > prev.config.thresholds.soundLimit
          };

          if (currentSessionRef.current && prev.status === 'RUNNING') {
            currentSessionRef.current = {
              ...currentSessionRef.current,
              maxVibration: Math.max(currentSessionRef.current.maxVibration, nextTele.vibration || 0),
              maxSound: Math.max(currentSessionRef.current.maxSound, nextTele.soundLevel || 0),
              finalHealth: nextTele.machineHealth || 100,
              fullHistory: [...(currentSessionRef.current.fullHistory || []), nextTele]
           };
          }

          const thresholds = prev.config.thresholds;
          const enabledSensors = prev.config.enabledSensors;
          setHistory(h => [...h, nextTele].slice(-200));
          sendAlert(nextTele);

          if (prev.status === 'RUNNING' && !activeAlarm) {
            let alarm: Alarm | null = null;

            if ((nextTele.toolWear || 0) >= thresholds.toolWear) {
              alarm = {
                type: 'CRITICAL',
                category: 'WEAR',
                message: `CSV replay limit: Tool wear reached ${(nextTele.toolWear || 0).toFixed(1)}%`,
                recommendations: ['Tool change required']
              };
            } else if (enabledSensors.vibration && nextTele.vibration > thresholds.vibrationRms) {
              alarm = {
                type: 'CRITICAL',
                category: 'VIBRATION',
                message: `CSV replay limit: Vibration RMS reached ${(nextTele.vibration || 0).toFixed(2)}`,
                recommendations: [
                  'Inspect tool condition and seating',
                  'Check workholding stability',
                  'Verify spindle speed and feed rate alignment',
                  'Check for loose mechanical components'
                ]
              };
            } else if (enabledSensors.spindleLoad && (nextTele.spindleLoad || 0) > thresholds.spindleLoadLimit) {
              alarm = {
                type: 'CRITICAL',
                category: 'LOAD',
                message: `CSV replay limit: Spindle load reached ${(nextTele.spindleLoad || 0).toFixed(1)}%`,
                recommendations: [
                  'Reduce feed rate immediately',
                  'Inspect tool sharpness and wear',
                  'Check depth of cut parameters',
                  'Verify material hardness settings'
                ]
              };
            } else if ((nextTele.soundLevel || 0) > thresholds.soundLimit) {
              alarm = {
                type: 'CRITICAL',
                category: 'NOISE',
                message: `CSV replay limit: Sound level reached ${(nextTele.soundLevel || 0).toFixed(2)}`,
                recommendations: ['Inspect tool condition and cutting stability']
              };
            }

            if (alarm) {
              setActiveAlarm(alarm);
              addNotification('CRITICAL', alarm.category, alarm.message);
              return {
                ...prev,
                status: 'IDLE',
                telemetry: nextTele,
                csvPlayback: { ...prev.csvPlayback, currentIndex: nextIndex }
              };
            }
          }

          let health = MachineHealth.HEALTHY;
          if (
            (nextTele.toolWear || 0) > thresholds.toolWear * 0.8 ||
            (nextTele.vibration || 0) > thresholds.vibrationRms ||
            (nextTele.soundLevel || 0) > thresholds.soundLimit * 0.8 ||
            (nextTele.spindleLoad || 0) > thresholds.spindleLoadLimit * 0.8
          ) {
            health = MachineHealth.WARNING;
          }

          if (
            (nextTele.toolWear || 0) >= thresholds.toolWear ||
            (nextTele.vibration || 0) > thresholds.badRms ||
            (nextTele.soundLevel || 0) > thresholds.soundLimit ||
            (nextTele.spindleLoad || 0) > thresholds.spindleLoadLimit
          ) {
            health = MachineHealth.CRITICAL;
          }

          return {
            ...prev,
            telemetry: nextTele,
            health,
            csvPlayback: { ...prev.csvPlayback, currentIndex: nextIndex }
          };
        }

        const { material, toolGrade, simulationSpeed, enabledSensors, thresholds, aiSimulation } = prev.config;
        const {
          isActive,
          startTime,
          durationSeconds,
          targetWear: testTargetWear,
          customWearMultiplier: cWear
        } = prev.materialTest;
        const scenario = prev.materialTest.scenario || 'NORMAL';

        let isRunning = prev.status === 'RUNNING';
        let currentStatus = prev.status;
        let testActive = isActive;
        let nextManual = { ...prev.manualControl };
        let inputDetected = prev.hasReceivedInput;

        if (nextManual.isExecutingGCode) {
          isRunning = true;
          currentStatus = 'RUNNING';
          inputDetected = true;
          const lines = nextManual.gCodeProgram.split('\n');
          if (Math.random() > 0.9) {
            nextManual.currentLine = (nextManual.currentLine + 1) % lines.length;
          }
        }

        if (!inputDetected && !isRunning) return prev;
        if (!prev.hasReceivedInput && inputDetected) setHistory([]);

        if (isRunning && testActive && startTime) {
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed >= durationSeconds) {
            addNotification('INFO', 'SYSTEM', `Material test completed: time limit reached (${durationSeconds}s)`);
            isRunning = false;
            currentStatus = 'IDLE';
            testActive = false;
          }
        }

        const loadMod = material.hardnessFactor || 1;
        let wearMultiplier = (testActive ? 8 : 1) * (aiSimulation?.wearRateMultiplier || 1.0);
        let forceMultiplier = 1 * (aiSimulation?.forceImpactFactor || 1.0);

        if (testActive) {
          wearMultiplier *= cWear || 1.0;
        }

        if (testActive) {
          switch (scenario) {
            case 'AGGRESSIVE':
              wearMultiplier *= 3.0;
              forceMultiplier = 2.2;
              break;
            case 'IMPACT':
              wearMultiplier *= 6.0;
              forceMultiplier = 3.5;
              break;
          }
        }

        const wearMod =
          (loadMod / (toolGrade.durabilityFactor || 1)) *
          (isRunning ? 0.0008 : 0) *
          wearMultiplier *
          simulationSpeed;

        const noise = (val: number, range: number) => val + (Math.random() - 0.5) * range;
        const cycleSec = (Date.now() / 1000) % 4;
        const isCutting = isRunning && cycleSec > 0.5 && cycleSec < 3.0;
        const baseForce = isCutting ? 180 * loadMod * forceMultiplier : 0;

        const nextTele: TelemetryData = {
          timestamp: Date.now(),
          rpm: isRunning ? noise(3200, 50) : 0,
          feedRate: isRunning ? noise(450, 20) : 0,
          spindleLoad: isRunning && enabledSensors.spindleLoad ? noise(42 * loadMod * forceMultiplier, 10) : 0,
          vibration: isRunning && enabledSensors.vibration
            ? (
                prev.telemetry.vibration < 0.1
                  ? noise(0.15, 0.05)
                  : noise(Math.min(2.5, prev.telemetry.vibration + (0.02 * simulationSpeed * loadMod * forceMultiplier)), 0.01)
              )
            : noise(0.05, 0.02),
          vibrationAlert: false,
          machineHealth: Math.max(0, 100 - (prev.telemetry.toolWear * 0.5)),
          soundLevel: isRunning ? noise(0.10 + (wearMod * 2), 0.03) : 0.03,
          noiseAlarm: false,
          toolWear: estimateToolWearMm(
            isRunning && enabledSensors.vibration
              ? (
                  prev.telemetry.vibration < 0.1
                    ? noise(0.15, 0.05)
                    : noise(Math.min(2.5, prev.telemetry.vibration + (0.02 * simulationSpeed * loadMod * forceMultiplier)), 0.01)
                )
              : noise(0.05, 0.02),
            isRunning ? noise(0.10 + (wearMod * 2), 0.03) : 0.03,
            prev.telemetry.toolWear,
            isRunning
          ),
          current: isRunning ? noise(2.0 + (prev.telemetry.spindleLoad / 20), 0.2) : 0,
          powerConsumption: isRunning ? noise(4.8 * loadMod * forceMultiplier, 0.8) : 0.2,
          forces: {
            fx: isCutting && enabledSensors.forces ? noise(baseForce * 0.1, 10) : noise(0, 1),
            fy: isCutting && enabledSensors.forces ? noise(baseForce * 0.1, 10) : noise(0, 1),
            fz: isCutting && enabledSensors.forces ? noise(baseForce * 1.6, 40) : noise(0, 2)
          }
        };

        if (currentSessionRef.current && isRunning) {
          currentSessionRef.current = {
            ...currentSessionRef.current,
            maxVibration: Math.max(currentSessionRef.current.maxVibration, nextTele.vibration || 0),
            maxSound: Math.max(currentSessionRef.current.maxSound, nextTele.soundLevel || 0),
            finalHealth: nextTele.machineHealth || 100,
            fullHistory: [...(currentSessionRef.current.fullHistory || []), nextTele]
          };
        }

        nextTele.vibrationAlert = nextTele.vibration > thresholds.vibrationRms;
        nextTele.noiseAlarm = nextTele.soundLevel > thresholds.soundLimit;

        setHistory(h => [...h, nextTele].slice(-200));
        sendAlert(nextTele);

        if (isRunning && testActive && nextTele.toolWear >= testTargetWear) {
          addNotification('INFO', 'SYSTEM', `Material test completed: wear target reached (${testTargetWear}%)`);
          isRunning = false;
          currentStatus = 'IDLE';
          testActive = false;
        }

        if (isRunning && !activeAlarm) {
          let alarm: Alarm | null = null;

          if (nextTele.toolWear >= thresholds.toolWear) {
            alarm = {
              type: 'CRITICAL',
              category: 'WEAR',
              message: `Limit exceeded: Tool wear reached ${(nextTele.toolWear || 0).toFixed(1)}%`,
              recommendations: ['Tool change mandatory']
            };
          } else if (enabledSensors.vibration && nextTele.vibration > thresholds.vibrationRms) {
            alarm = {
              type: 'CRITICAL',
              category: 'VIBRATION',
              message: `Limit exceeded: Vibration RMS reached ${(nextTele.vibration || 0).toFixed(2)}`,
              recommendations: [
                'Inspect tool seating and condition',
                'Check cutting stability and workholding',
                'Optimize spindle speed and feed rate',
                'Verify machine structural integrity'
              ]
            };
          } else if (enabledSensors.spindleLoad && nextTele.spindleLoad > thresholds.spindleLoadLimit) {
            alarm = {
              type: 'CRITICAL',
              category: 'LOAD',
              message: `Limit exceeded: Spindle load reached ${(nextTele.spindleLoad || 0).toFixed(1)}%`,
              recommendations: [
                'Reduce feed rate and depth of cut',
                'Check tool condition for excessive wear',
                'Verify material properties and hardness',
                'Inspect spindle motor and drive system'
              ]
            };
          } else if (nextTele.soundLevel > thresholds.soundLimit) {
            alarm = {
              type: 'CRITICAL',
              category: 'NOISE',
              message: `Limit exceeded: Sound level reached ${(nextTele.soundLevel || 0).toFixed(2)}`,
              recommendations: ['Inspect cutting condition']
            };
          } else if (
            enabledSensors.forces &&
            (
              nextTele.forces.fx > thresholds.forceX ||
              nextTele.forces.fy > thresholds.forceY ||
              nextTele.forces.fz > thresholds.forceZ
            )
          ) {
            alarm = {
              type: 'CRITICAL',
              category: 'FORCE',
              message: 'Limit exceeded: Cutting force exceeds safety limits',
              recommendations: ['Reduce depth of cut']
            };
          }

          if (alarm) {
            setActiveAlarm(alarm);
            addNotification('CRITICAL', alarm.category, alarm.message);
            isRunning = false;
            currentStatus = 'IDLE';
            testActive = false;
          }
        }

        let health = MachineHealth.HEALTHY;
        if (
          nextTele.toolWear > thresholds.toolWear * 0.8 ||
          nextTele.vibration > thresholds.vibrationRms ||
          nextTele.soundLevel > thresholds.soundLimit * 0.8 ||
          (nextTele.spindleLoad || 0) > thresholds.spindleLoadLimit * 0.8
        ) {
          health = MachineHealth.WARNING;
        }

        if (
          nextTele.toolWear >= thresholds.toolWear ||
          nextTele.vibration > thresholds.badRms ||
          nextTele.soundLevel > thresholds.soundLimit ||
          (nextTele.spindleLoad || 0) > thresholds.spindleLoadLimit
        ) {
          health = MachineHealth.CRITICAL;
        }

        return {
          ...prev,
          status: currentStatus,
          health,
          telemetry: nextTele,
          hasReceivedInput: inputDetected,
          materialTest: { ...prev.materialTest, isActive: testActive },
          manualControl: nextManual
        };
      });
    }, MACHINE_CONFIG.POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeAlarm, addNotification]);

  const deleteSessionEntry = useCallback((id: string) => {
    setSessionLog(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const clearSessionLog = useCallback(() => {
    setSessionLog([]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const toggleMachine = useCallback(() => {
  const nextStatus = twinState.status === 'RUNNING' ? 'IDLE' : 'RUNNING';

  if (nextStatus === 'RUNNING') {
    currentSessionRef.current = {
      id: Math.random().toString(36).slice(2, 10),
      mode: twinState.mode,
      title:
        twinState.mode === 'OFFLINE_CSV'
          ? `CSV Replay - ${twinState.csvPlayback.fileName || 'Unnamed CSV'}`
          : twinState.mode === 'ESP32'
          ? 'Live ESP32 Operation'
          : 'Simulated Operation',
      startTime: Date.now(),
      endTime: null,
      durationSec: 0,
      maxVibration: 0,
      maxSound: 0,
      finalHealth: twinState.telemetry.machineHealth || 100,
      status: 'RUNNING',
      sourceName: twinState.mode === 'OFFLINE_CSV' ? twinState.csvPlayback.fileName : null,
      fullHistory: []
    };
  } else if (currentSessionRef.current) {
    const endTime = Date.now();

    const finishedSession: SessionLogEntry = {
      ...currentSessionRef.current,
      endTime,
      durationSec: Math.round((endTime - currentSessionRef.current.startTime) / 1000),
      finalHealth: twinState.telemetry.machineHealth || 100,
      status: 'COMPLETED'
    };

    setSessionLog(prev => [finishedSession, ...prev]);
    currentSessionRef.current = null;
  }

  if (twinState.mode === 'SIMULATED' || twinState.mode === 'OFFLINE_CSV' || twinState.mode === 'PREDICTED_SIMULATION') {
    setTwinState(prev => ({
      ...prev,
      status: nextStatus,
      hasReceivedInput: nextStatus === 'RUNNING' ? true : prev.hasReceivedInput,
      materialTest: {
        ...prev.materialTest,
        startTime: nextStatus === 'RUNNING' ? Date.now() : prev.materialTest.startTime
      },
      manualControl: {
        ...prev.manualControl,
        isExecutingGCode: nextStatus === 'RUNNING' ? prev.manualControl.isExecutingGCode : false
      },
      csvPlayback: {
        ...prev.csvPlayback,
        isActive: nextStatus === 'RUNNING'
      },
      predictedSimulation: {
        ...prev.predictedSimulation,
        isActive: nextStatus === 'RUNNING'
      }
    }));
  } else {
    sendHardwareCommand('SET_STATUS', nextStatus);
    setTwinState(prev => ({ ...prev, status: nextStatus }));
  }
}, [twinState, sendHardwareCommand]);

  const modes: TwinState['mode'][] = [
    'SIMULATED',
    'ESP32',
    'PREDICTED_SIMULATION',
    ...(twinState.csvPlayback.data.length > 0 ? ['OFFLINE_CSV' as TwinState['mode']] : [])
  ];

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col overflow-hidden text-slate-900">
      <header className="px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex justify-between items-center z-50 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
              Digital<span className="text-indigo-600">Twin</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              IoT Based Tool Health Monitoring
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {modes.map(m => (
              <button
                key={m}
                onClick={() => handleSetMode(m)}
                className={`px-4 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all ${
                  twinState.mode === m
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {m === 'OFFLINE_CSV' ? 'OFFLINE CSV' : m}
              </button>
            ))}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => syncToThingSpeak(twinState.telemetry, twinState.config.thingSpeakKey, true)}
              disabled={twinState.cloudSync === 'SYNCING'}
              className={`px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-black text-[11px] uppercase tracking-wider text-indigo-600 border border-indigo-200 flex items-center transition-all ${
                twinState.cloudSync === 'SYNCING' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Cloud className={`w-4 h-4 mr-2 ${twinState.cloudSync === 'SYNCING' ? 'animate-pulse' : ''}`} />
              {twinState.cloudSync === 'SYNCING' ? 'Syncing...' : 'Sync to Cloud'}
            </button>

            <button
              onClick={toggleMachine}
              className={`px-6 py-2 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all shadow-lg ${
                twinState.status === 'RUNNING'
                  ? 'bg-red-500 shadow-red-500/20'
                  : 'bg-emerald-500 shadow-emerald-500/20'
              } text-white`}
            >
              {twinState.status === 'RUNNING' ? 'STOP' : 'START'}
            </button>

            <button
              onClick={resetMachine}
              className="px-6 py-2 bg-white hover:bg-slate-50 rounded-lg font-black text-[11px] uppercase tracking-wider text-slate-700 border border-slate-200 shadow-sm"
            >
              RESET
            </button>
          </div>
        </div>
      </header>

      <div className="fixed top-24 right-6 z-[60] flex flex-col items-end space-y-3 pointer-events-none">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`w-72 p-4 rounded-2xl border shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-300 flex items-start space-x-3 ${
              notif.type === 'CRITICAL'
                ? 'bg-red-600 border-red-700 text-white'
                : notif.type === 'INFO'
                ? 'bg-indigo-600 border-indigo-700 text-white'
                : 'bg-amber-500 border-amber-600 text-white'
            }`}
          >
            <div className={`p-1.5 rounded-lg bg-white/20`}>
              {notif.type === 'CRITICAL' ? (
                <AlertCircle size={14} className="text-white" />
              ) : notif.type === 'INFO' ? (
                <Info size={14} className="text-white" />
              ) : (
                <AlertTriangle size={14} className="text-white" />
              )}
            </div>

            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-widest opacity-80 mb-1">
                {notif.category}
              </p>
              <p className="text-[11px] font-medium leading-tight">{notif.message}</p>
            </div>
          </div>
        ))}
      </div>

      {activeAlarm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#0f172a] border-2 border-red-500/50 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-red-600 p-6 flex items-center justify-between text-white">
              <div className="flex items-center space-x-4">
                <ShieldAlert size={28} />
                <h2 className="text-xl font-black uppercase tracking-tight">Industrial Safety Halt</h2>
              </div>
              <button onClick={() => setActiveAlarm(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <p className="text-lg font-bold text-white leading-tight">{activeAlarm.message}</p>
              <button
                onClick={resetMachine}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl uppercase text-sm tracking-widest"
              >
                Confirm & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 relative overflow-hidden">
        <Dashboard
          twinState={twinState}
          history={history}
          sessionLog={sessionLog}
          materials={MATERIALS}
          toolGrades={TOOL_GRADES}
          onConfigChange={handleConfigChange}
          onSetMode={handleSetMode}
          onScanDevices={scanForDevices}
          onCsvUpload={handleCsvUpload}
          onSave={handleSave}
          onDeleteSession={deleteSessionEntry}
          onClearSessions={clearSessionLog}
          onClearHistory={clearHistory}
          onStartPredictedSimulation={startPredictedSimulation}
          isScanning={isScanning}
        />
      </main>
    </div>
  );
};

export default App;