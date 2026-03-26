
import React, { useState } from 'react';

import { ThreeScene } from './ThreeScene';
import { TelemetryCharts } from './TelemetryCharts';
import { LSTMForecaster } from './LSTMForecaster';
import { ToolWearModel } from './ToolWearModel';
import { ProcessHistory } from './ProcessHistory';

import { TelemetryData, TwinState, Material, ToolGrade, DiscoveredDevice } from '../types';
import { calculateToolHealth } from '../services/healthEngine';

import {
Activity,
Zap,
ShieldAlert,
Wifi,
Shield,
Radar,
RefreshCw,
Power,
FileText,
User,
Beaker,
Clipboard as ClipboardIcon,
Play,
StopCircle,
Code,
Terminal,
Scissors,
Move,
ArrowDownCircle,
Wind,
LayoutDashboard,
BarChart3,
Database,
Settings,
Download,
X,
Box
} from 'lucide-react';

import {
Chart as ChartJS,
CategoryScale,
LinearScale,
PointElement,
LineElement,
Title,
Tooltip,
Legend,
Filler,
  ScatterController
} from 'chart.js';

import { Line, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController
);

interface DashboardProps {
  twinState: TwinState;
  history: TelemetryData[];
  sessionLog: any[];
  materials: Material[];
  toolGrades: ToolGrade[];
  onConfigChange: (config: any) => void;
  onSetMode: (mode: TwinState['mode']) => void;
  onScanDevices: () => void;
  onCsvUpload: (file: File) => void;
  onSave: () => void;
  onDeleteSession: (id: string) => void;
  onClearSessions: () => void;
  onClearHistory: () => void;
  onStartPredictedSimulation: () => void;
  isScanning: boolean;
}

type TabType = 'TWIN' | 'STATUS' | 'HISTORY' | 'USER DATA' | 'SETUP' | 'PROGRAM' | 'PREDICTION' | 'NOTIFICATIONS';

export const Dashboard: React.FC<DashboardProps> = ({
  twinState,
  history,
  sessionLog,
  materials,
  toolGrades,
  onConfigChange,
  onSetMode,
  onScanDevices,
  onCsvUpload,
  onSave,
  onDeleteSession,
  onClearSessions,
  onClearHistory,
  onStartPredictedSimulation,
  isScanning
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('TWIN');

  const vibrationValue = twinState.telemetry?.vibration || 0;
  const soundValue = twinState.telemetry?.noiseLevel || 0;
  const healthValue = twinState.telemetry?.machineHealth || 0;

  const vibrationGood = twinState.config.thresholds.goodRms;
  const vibrationBad = twinState.config.thresholds.badRms;
  const soundLimit = twinState.config.thresholds.soundLimit;

  const calculateOptimization = () => {
    const { spindleSpeed, feedRate } = twinState.predictedSimulation;
    const baseVibration = 0.08 + (spindleSpeed / 4000) * (feedRate / 400);
    
    return {
      vibration: baseVibration,
      noise: baseVibration * 0.4
    };
  };

  const optimized = calculateOptimization();

  const stats = [
    {
      label: 'Vibration RMS',
      value: vibrationValue.toFixed(3),
      icon: Activity,
      color: vibrationValue >= vibrationBad ? 'text-red-600' : vibrationValue >= vibrationGood ? 'text-amber-600' : 'text-emerald-600'
    },
    {
      label: 'Sound Level',
      value: soundValue.toFixed(3),
      icon: Wind,
      color: soundValue >= soundLimit ? 'text-red-600' : 'text-indigo-600'
    },
    {
      label: 'Machine Health',
      value: `${healthValue.toFixed(1)}%`,
      icon: Shield,
      color: healthValue < 50 ? 'text-red-600' : healthValue < 70 ? 'text-amber-600' : 'text-emerald-600'
    },
    {
      label: 'Alarm Status',
      value: vibrationValue >= vibrationBad || soundValue >= soundLimit
        ? 'CRITICAL'
        : vibrationValue >= vibrationGood
        ? 'WARNING'
        : 'NORMAL',
      icon: ShieldAlert,
      color: vibrationValue >= vibrationBad || soundValue >= soundLimit
        ? 'text-red-600'
        : vibrationValue >= vibrationGood
        ? 'text-amber-600'
        : 'text-emerald-600'
    },
  ];

  const handleThresholdChange = (key: keyof TwinState['config']['thresholds'], value: number) => {
    onConfigChange({ thresholds: { [key]: isNaN(value) ? 0 : value } });
  };

  const handleTestDataChange = (key: string, value: any) => {
    const safeValue = typeof value === 'number' && isNaN(value) ? 0 : value;
    onConfigChange({ materialTest: { [key]: safeValue } });
  };

  const handleManualControlChange = (key: string, value: any) => {
    const safeValue = typeof value === 'number' && isNaN(value) ? 0 : value;
    onConfigChange({ manualControl: { [key]: safeValue } });
  };

  const handleConventionalMillingChange = (key: string, value: any) => {
    const safeValue = typeof value === 'number' && isNaN(value) ? 0 : value;
    onConfigChange({ conventionalMilling: { [key]: safeValue } });
  };

  const handleAISimulationChange = (key: keyof TwinState['config']['aiSimulation'], value: number) => {
    onConfigChange({ aiSimulation: { [key]: isNaN(value) ? 0 : value } });
  };

  const handlePredictedSimulationChange = (key: string, value: any) => {
    const safeValue = typeof value === 'number' && isNaN(value) ? 0 : value;
    onConfigChange({ predictedSimulation: { [key]: safeValue } });
  };

  const handleWorkpieceDimensionChange = (dim: 'length' | 'width' | 'height', value: number) => {
    const safeValue = isNaN(value) ? 0 : value;
    onConfigChange({
      predictedSimulation: {
        workpieceDimensions: {
          ...twinState.predictedSimulation.workpieceDimensions,
          [dim]: safeValue
        }
      }
    });
  };

  const startMaterialTest = () => {
    onConfigChange({
      materialTest: { isActive: true, startTime: Date.now() },
      status: 'RUNNING'
    });
  };

  const stopMaterialTest = () => {
    onConfigChange({
      materialTest: { isActive: false, startTime: null },
      status: 'IDLE'
    });
  };

  const selectAndConnectDevice = (device: DiscoveredDevice) => {
    if (!twinState.config.wifiEnabled) return;
    onConfigChange({ espIp: device.ip, espPort: device.port });
    onSetMode('ESP32');
  };

  const activeLinkStatus =
    twinState.mode === 'ESP32'
      ? twinState.cloudSync === 'SYNCED'
        ? 'CONNECTED'
        : 'ERROR'
      : twinState.mode === 'OFFLINE_CSV'
      ? 'ACTIVE'
      : 'OFFLINE';

  const activeLinkLabel =
    twinState.mode === 'ESP32'
      ? 'ThingSpeak Cloud'
      : twinState.mode === 'OFFLINE_CSV'
      ? `CSV: ${twinState.csvPlayback.fileName || 'Replay'}`
      : 'Simulator';

  const healthData = calculateToolHealth(
    twinState.telemetry?.vibration || 0,
    twinState.telemetry?.noiseLevel || 0
  );

  const handleDownloadSession = (entry: any) => {
    const dataStr = JSON.stringify(entry, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${entry.id}-${new Date(entry.startTime).toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'TWIN':
        return (
          <div className="h-full flex flex-col bg-slate-100 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white border-b border-slate-200 z-20">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-2xl ${twinState.isMachineOn ? (twinState.status === 'RUNNING' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600') : 'bg-slate-50 text-slate-400'}`}>
                  <Activity size={24} className={twinState.status === 'RUNNING' && twinState.isMachineOn ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Machine Status</h2>
                  <div className="flex items-center space-x-2">
                    <p className={`text-xs font-bold uppercase ${!twinState.isMachineOn ? 'text-red-500' : (twinState.status === 'RUNNING' ? 'text-emerald-500' : 'text-indigo-500')}`}>
                      {twinState.isMachineOn ? twinState.status : 'POWER OFF'} {twinState.machineType === 'CONVENTIONAL' ? '(Conventional)' : '(CNC)'}
                    </p>
                    <button
                      onClick={() => onConfigChange({ isMachineOn: !twinState.isMachineOn })}
                      className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                        twinState.isMachineOn ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                      }`}
                    >
                      {twinState.isMachineOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-6">
                <div className="text-right">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Tool Health</h2>
                  <p className="text-xs font-bold uppercase" style={{ color: healthData.color }}>
                    {healthData.status}
                  </p>
                </div>
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeDasharray="100, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      style={{ color: healthData.color }}
                      strokeDasharray={`${healthData.score}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <text x="18" y="20.35" className="text-[8px] font-black fill-slate-900" textAnchor="middle">
                      {Math.round(healthData.score)}%
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex-1 flex relative overflow-hidden">
              <div className="flex-1 relative">
                <ThreeScene twinState={twinState} />

                <div className="absolute top-1/2 -translate-y-1/2 left-4 z-30 space-y-2 pointer-events-none">
                  {vibrationValue > twinState.config.thresholds.vibrationRms && (
                    <div className="bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2 animate-bounce">
                      <ShieldAlert size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Abnormal vibration detected</span>
                    </div>
                  )}

                  {soundValue > twinState.config.thresholds.soundLimit && (
                    <div className="bg-amber-500/90 backdrop-blur-md text-white px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2 animate-pulse">
                      <ShieldAlert size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Tool wear suspected</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-72 bg-white border-l border-slate-200 p-6 space-y-6 overflow-y-auto z-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <Database size={12} className="mr-2 text-indigo-500" /> Live Sensor Values
                </h3>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Vibration RMS</span>
                      <Activity size={12} className={vibrationValue > twinState.config.thresholds.vibrationRms ? 'text-red-500' : 'text-emerald-500'} />
                    </div>
                    <div className="text-xl font-black text-slate-900 font-mono">{vibrationValue.toFixed(3)}</div>
                    <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${vibrationValue > twinState.config.thresholds.vibrationRms ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (vibrationValue / Math.max(vibrationBad, 0.01)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Sound Level</span>
                      <Wind size={12} className={soundValue > twinState.config.thresholds.soundLimit ? 'text-red-500' : 'text-indigo-500'} />
                    </div>
                    <div className="text-xl font-black text-slate-900 font-mono">{soundValue.toFixed(3)}</div>
                    <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${soundValue > twinState.config.thresholds.soundLimit ? 'bg-red-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, (soundValue / Math.max(soundLimit, 0.01)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {twinState.machineType === 'CONVENTIONAL' && (
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Milling Controls</h4>
                    <button
                      onClick={() => {
                        handleConventionalMillingChange('isLiveDemoActive', !twinState.conventionalMilling.isLiveDemoActive);
                        onSetMode('ESP32');
                      }}
                      className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center space-x-2 ${
                        twinState.conventionalMilling.isLiveDemoActive ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }`}
                    >
                      {twinState.conventionalMilling.isLiveDemoActive ? <StopCircle size={14} /> : <Play size={14} />}
                      <span>{twinState.conventionalMilling.isLiveDemoActive ? 'STOP LIVE DEMO' : 'START LIVE MILLING DEMO'}</span>
                    </button>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Cloud Sync</span>
                    <div className={`w-2 h-2 rounded-full ${twinState.cloudSync === 'SYNCED' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  </div>
                  <p className="text-[8px] font-black text-slate-600 uppercase">
                    {twinState.cloudSync === 'SYNCED' ? 'ThingSpeak Connected' : 'Connection Lost'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'STATUS':
        return (
          <div className="h-full flex flex-col bg-slate-100 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center">
                <BarChart3 size={20} className="mr-2 text-indigo-600" /> Real-time Performance Status
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={onClearHistory}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200 transition-all"
                >
                  Clear Charts
                </button>
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <div className={`w-2 h-2 rounded-full ${twinState.cloudSync === 'SYNCED' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-black text-slate-600 uppercase">ThingSpeak: {twinState.cloudSync}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Activity size={14} className="mr-2 text-emerald-500" /> Vibration RMS
                  </h4>
                  <div className="flex items-center space-x-2">
                    {twinState.telemetry?.optimizedVibration && vibrationValue > twinState.telemetry.optimizedVibration * 1.2 && (
                      <span className="flex items-center px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[8px] font-black uppercase animate-pulse">
                        <ShieldAlert size={10} className="mr-1" /> Wear Warning
                      </span>
                    )}
                    <span className="text-xs font-black text-slate-900 font-mono">{vibrationValue.toFixed(3)}</span>
                  </div>
                </div>
                <div className="h-48">
                  <Line
                    data={{
                      labels: history.map((h, i) => `${i}s`),
                      datasets: [{
                        label: 'Vibration',
                        data: history.map(h => h.vibration),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                      },
                      {
                        label: 'Optimized Baseline',
                        data: history.map(h => h.optimizedVibration || 0),
                        borderColor: '#3b82f6',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        hidden: !history.some(h => h.optimizedVibration)
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { font: { size: 8 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
                        },
                        y: {
                          min: 0,
                          max: Math.max(1, vibrationBad * 2),
                          grid: { color: '#f1f5f9' },
                          ticks: { font: { size: 10 } }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Wind size={14} className="mr-2 text-indigo-500" /> Sound Level
                  </h4>
                  <div className="flex items-center space-x-2">
                    {twinState.telemetry?.optimizedNoise && soundValue > twinState.telemetry.optimizedNoise * 1.2 && (
                      <span className="flex items-center px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[8px] font-black uppercase animate-pulse">
                        <ShieldAlert size={10} className="mr-1" /> Wear Warning
                      </span>
                    )}
                    <span className="text-xs font-black text-slate-900 font-mono">{soundValue.toFixed(3)}</span>
                  </div>
                </div>
                <div className="h-48">
                  <Line
                    data={{
                      labels: history.map((h, i) => `${i}s`),
                      datasets: [{
                        label: 'Sound',
                        data: history.map(h => h.noiseLevel),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                      },
                      {
                        label: 'Optimized Baseline',
                        data: history.map(h => h.optimizedNoise || 0),
                        borderColor: '#3b82f6',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        hidden: !history.some(h => h.optimizedNoise)
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { font: { size: 8 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
                        },
                        y: {
                          min: 0,
                          max: Math.max(0.3, soundLimit * 2),
                          grid: { color: '#f1f5f9' },
                          ticks: { font: { size: 10 } }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Machine Health Trend</h4>
                <div className="h-64">
                  <Line
                    data={{
                      labels: history.map(h => new Date(h.timestamp).toLocaleTimeString()),
                      datasets: [{
                        label: 'Health',
                        data: history.map(h => h.machineHealth),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { display: false },
                        y: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center space-y-6">
                <div className="text-center">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Tool Condition</h4>
                  <div className="text-4xl font-black text-slate-900">{Math.round(healthData.score)}%</div>
                  <div className="text-[10px] font-bold uppercase mt-1" style={{ color: healthData.color }}>{healthData.status}</div>
                </div>
                <div className="w-full max-w-xs bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full transition-all duration-1000"
                    style={{ width: `${healthData.score}%`, backgroundColor: healthData.color }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Alerts (24h)</div>
                    <div className="text-xl font-black text-slate-900">
                      {history.filter(h =>
                        (h.vibration || 0) > vibrationBad ||
                        (h.noiseLevel || 0) > soundLimit
                      ).length}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Mode</div>
                    <div className="text-xl font-black text-slate-900">
                      {twinState.mode === 'OFFLINE_CSV' ? 'CSV' : twinState.mode === 'ESP32' ? 'LIVE' : 'SIM'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Radar size={14} className="mr-2 text-indigo-500" /> Tool Wear vs RMS Analysis
                  </h4>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Correlation View</div>
                </div>
                <div className="h-64">
                  <Line
                    data={{
                      datasets: [{
                        label: 'Tool Wear vs RMS',
                        data: [...history]
                          .sort((a, b) => a.toolWear - b.toolWear)
                          .map(h => ({ x: h.toolWear, y: h.vibration })),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: false
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => `Wear: ${context.parsed.x.toFixed(3)}mm, RMS: ${context.parsed.y.toFixed(3)}`
                          }
                        }
                      },
                      scales: {
                        x: {
                          type: 'linear',
                          position: 'bottom',
                          min: 0,
                          max: 0.8,
                          title: { display: true, text: 'Tool Wear (mm)', font: { size: 10, weight: 'bold' } },
                          grid: { color: '#f1f5f9' },
                          ticks: { font: { size: 10 } }
                        },
                        y: {
                          min: 0,
                          max: 1.3,
                          title: { display: true, text: 'RMS (Vibration)', font: { size: 10, weight: 'bold' } },
                          grid: { color: '#f1f5f9' },
                          ticks: { font: { size: 10 } }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <LSTMForecaster history={history} />
            </div>
          </div>
        );

      case 'USER DATA':
        return (
          <div className="p-6 space-y-8 overflow-y-auto h-full scrollbar-hide">
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl"><Beaker size={24} className="text-indigo-600" /></div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Research Context Input</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Define Testing Parameters & Hypothetical Context</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onSave}
                    className="px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center space-x-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                  >
                    <ClipboardIcon size={14} />
                    <span>SAVE INPUTS</span>
                  </button>
                  <button
                    onClick={twinState.materialTest.isActive ? stopMaterialTest : startMaterialTest}
                    className={`px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center space-x-3 shadow-xl ${
                      twinState.materialTest.isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {twinState.materialTest.isActive ? <StopCircle size={14} /> : <Play size={14} />}
                    <span>{twinState.materialTest.isActive ? 'ABORT LIVE TEST' : 'START LIVE MATERIAL TEST'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><FileText size={12} className="mr-2" /> Experiment Title</label>
                  <input type="text" disabled={twinState.materialTest.isActive} value={twinState.materialTest.testTitle || ''} onChange={(e) => handleTestDataChange('testTitle', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><User size={12} className="mr-2" /> Researcher</label>
                    <input type="text" disabled={twinState.materialTest.isActive} value={twinState.materialTest.researcherName || ''} onChange={(e) => handleTestDataChange('researcherName', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><ClipboardIcon size={12} className="mr-2" /> Batch ID</label>
                    <input type="text" disabled={twinState.materialTest.isActive} value={twinState.materialTest.batchId || ''} onChange={(e) => handleTestDataChange('batchId', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fine-Tune: Wear Multiplier</label>
                    <span className="text-sm font-black text-slate-900 font-mono">{(twinState.materialTest.customWearMultiplier || 1.0).toFixed(1)}x</span>
                  </div>
                  <input type="range" disabled={twinState.materialTest.isActive} min="0.1" max="5.0" step="0.1" value={twinState.materialTest.customWearMultiplier || 1.0} onChange={(e) => handleTestDataChange('customWearMultiplier', parseFloat(e.target.value))} className="w-full accent-indigo-600 bg-slate-200 rounded-xl h-2" />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Workpiece Material</label>
                  <div className="grid grid-cols-2 gap-3">
                    {materials.map(mat => (
                      <button key={mat.id} disabled={twinState.materialTest.isActive} onClick={() => onConfigChange({ material: mat })} className={`p-4 rounded-2xl border transition-all text-left ${twinState.config.material.id === mat.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <span className="text-[10px] font-black uppercase block">{mat.name}</span>
                        <span className="text-[8px] font-bold opacity-70">Hardness: {mat.hardnessFactor}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cutting Tool Grade</label>
                  <div className="grid grid-cols-2 gap-3">
                    {toolGrades.map(grade => (
                      <button key={grade.id} disabled={twinState.materialTest.isActive} onClick={() => onConfigChange({ toolGrade: grade })} className={`p-4 rounded-2xl border transition-all text-left ${twinState.config.toolGrade.id === grade.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <span className="text-[10px] font-black uppercase block">{grade.name}</span>
                        <span className="text-[8px] font-bold opacity-70">Durability: {grade.durabilityFactor}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Duration Limit</label>
                    <span className="text-sm font-black text-slate-900 font-mono">{twinState.materialTest.durationSeconds}s</span>
                  </div>
                  <input type="range" disabled={twinState.materialTest.isActive} min="10" max="7230" step="10" value={twinState.materialTest.durationSeconds} onChange={(e) => handleTestDataChange('durationSeconds', parseInt(e.target.value))} className="w-full accent-indigo-600 bg-slate-200 rounded-xl h-2" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Critical Target Wear Exit</label>
                    <span className="text-sm font-black text-slate-900 font-mono">{twinState.materialTest.targetWear}%</span>
                  </div>
                  <input type="range" disabled={twinState.materialTest.isActive} min="1" max="100" step="1" value={twinState.materialTest.targetWear} onChange={(e) => handleTestDataChange('targetWear', parseInt(e.target.value))} className="w-full accent-red-500 bg-slate-200 rounded-xl h-2" />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-4">
                {(['NORMAL', 'AGGRESSIVE', 'IMPACT'] as const).map((sc) => (
                  <button key={sc} disabled={twinState.materialTest.isActive} onClick={() => handleTestDataChange('scenario', sc)} className={`p-6 rounded-2xl border transition-all flex flex-col items-center justify-center space-y-3 ${twinState.materialTest.scenario === sc ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    {sc === 'NORMAL' && <Shield size={18} />}
                    {sc === 'AGGRESSIVE' && <Zap size={18} />}
                    {sc === 'IMPACT' && <Activity size={18} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{sc}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        );

      case 'SETUP':
        return (
          <div className="p-6 space-y-8 overflow-y-auto h-full scrollbar-hide">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <section className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col justify-center shadow-sm">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center mb-6">
                  <Activity size={14} className="mr-2 text-indigo-500" /> Simulation Scale
                </h2>
                <div className="space-y-4">
                  <input type="range" min="0.1" max="10.0" step="0.1" className="w-full accent-indigo-600 bg-slate-200 rounded-xl" value={twinState.config.simulationSpeed} onChange={(e) => onConfigChange({ simulationSpeed: parseFloat(e.target.value) })} />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Velocity</span>
                    <span className="text-lg font-black text-slate-900 font-mono">{(twinState.config?.simulationSpeed || 1.0).toFixed(1)}x</span>
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl border border-slate-200 lg:col-span-3 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                    <Shield size={14} className="mr-2 text-red-500" /> Safety Thresholds
                  </h2>
                  <button
                    onClick={onSave}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
                  >
                    <ClipboardIcon size={12} />
                    <span>Save Thresholds</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>Vibration RMS Limit</span><span className="text-slate-900">{twinState.config.thresholds.vibrationRms}</span></div>
                    <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono text-slate-900 focus:border-indigo-500 outline-none" value={twinState.config.thresholds.vibrationRms} onChange={(e) => handleThresholdChange('vibrationRms', parseFloat(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>Good RMS Threshold</span><span className="text-slate-900">{twinState.config.thresholds.goodRms}</span></div>
                    <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono text-slate-900 focus:border-indigo-500 outline-none" value={twinState.config.thresholds.goodRms} onChange={(e) => handleThresholdChange('goodRms', parseFloat(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>Bad RMS Threshold</span><span className="text-slate-900">{twinState.config.thresholds.badRms}</span></div>
                    <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono text-slate-900 focus:border-indigo-500 outline-none" value={twinState.config.thresholds.badRms} onChange={(e) => handleThresholdChange('badRms', parseFloat(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>Tool Wear Limit</span><span className="text-slate-900">{twinState.config.thresholds.toolWear}%</span></div>
                    <input type="range" min="5" max="100" step="1" className="w-full accent-slate-400 bg-slate-200 rounded-lg h-1.5" value={twinState.config.thresholds.toolWear} onChange={(e) => handleThresholdChange('toolWear', parseInt(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>Sound Level Limit</span><span className="text-slate-900">{twinState.config.thresholds.soundLimit}</span></div>
                    <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono text-slate-900 focus:border-indigo-500 outline-none" value={twinState.config.thresholds.soundLimit} onChange={(e) => handleThresholdChange('soundLimit', parseFloat(e.target.value))} />
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl border border-slate-200 lg:col-span-4 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                    <Beaker size={14} className="mr-2 text-indigo-500" /> AI Simulation Parameters
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wear Rate Multiplier</label>
                      <span className="text-sm font-black text-slate-900 font-mono">{(twinState.config.aiSimulation?.wearRateMultiplier || 1.0).toFixed(1)}x</span>
                    </div>
                    <input type="range" min="0.1" max="10.0" step="0.1" className="w-full accent-indigo-600 bg-slate-200 rounded-xl h-2" value={twinState.config.aiSimulation?.wearRateMultiplier || 1.0} onChange={(e) => handleAISimulationChange('wearRateMultiplier', parseFloat(e.target.value))} />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Force Impact Factor</label>
                      <span className="text-sm font-black text-slate-900 font-mono">{(twinState.config.aiSimulation?.forceImpactFactor || 1.0).toFixed(1)}x</span>
                    </div>
                    <input type="range" min="0.1" max="10.0" step="0.1" className="w-full accent-red-500 bg-slate-200 rounded-xl h-2" value={twinState.config.aiSimulation?.forceImpactFactor || 1.0} onChange={(e) => handleAISimulationChange('forceImpactFactor', parseFloat(e.target.value))} />
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl border border-slate-200 lg:col-span-4 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                    <Wifi size={14} className="mr-2 text-indigo-500" /> Connectivity & Provisioning
                  </h2>
                  <button
                    onClick={onScanDevices}
                    disabled={isScanning}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isScanning ? 'animate-spin' : ''} />
                    <span>{isScanning ? 'Scanning Network...' : 'Scan for ESP32 Nodes'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ThingSpeak Channel ID</label>
                      <input
                        type="text"
                        value={twinState.config.thingSpeakChannelId}
                        onChange={(e) => onConfigChange({ thingSpeakChannelId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:border-indigo-500 outline-none"
                        placeholder="CHANNEL_ID"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ThingSpeak Write API Key</label>
                      <input
                        type="text"
                        value={twinState.config.thingSpeakKey}
                        onChange={(e) => onConfigChange({ thingSpeakKey: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:border-indigo-500 outline-none"
                        placeholder="WRITE_API_KEY"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ThingSpeak Read API Key</label>
                      <input
                        type="text"
                        value={twinState.config.thingSpeakReadKey || ''}
                        onChange={(e) => onConfigChange({ thingSpeakReadKey: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:border-indigo-500 outline-none"
                        placeholder="READ_API_KEY"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol</label>
                      <div className="flex space-x-2">
                        {(['HTTP_POLL', 'WEBSOCKET'] as const).map(proto => (
                          <button
                            key={proto}
                            onClick={() => onConfigChange({ wifiProtocol: proto })}
                            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${twinState.config.wifiProtocol === proto ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                          >
                            {proto.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discovered Industrial Nodes</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {twinState.discoveredDevices.length === 0 ? (
                        <div className="col-span-2 py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300">
                          <Radar size={24} className="mb-2 opacity-20" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">No devices found on local segment</span>
                        </div>
                      ) : (
                        twinState.discoveredDevices.map(device => (
                          <button
                            key={device.id}
                            onClick={() => selectAndConnectDevice(device)}
                            className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:border-indigo-500 transition-all group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{device.name}</span>
                              <div className="flex items-center space-x-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[8px] font-bold text-slate-400">{device.latency}ms</span>
                              </div>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">{device.ip}:{device.port}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 'HISTORY':
  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center">
          <Activity size={20} className="mr-2 text-indigo-600" /> Session History
        </h2>
        <button
          onClick={onClearSessions}
          className="px-6 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-200 transition-all"
        >
          Clear All Logs
        </button>
      </div>
      {sessionLog.length === 0 ? (
        <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-sm py-20 border-2 border-dashed border-slate-200 rounded-3xl">
          No saved sessions yet
        </div>
      ) : (
        sessionLog.map((entry) => (
          <div
            key={entry.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-base font-black text-slate-900 uppercase tracking-tight">{entry.title}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {new Date(entry.startTime).toLocaleString()} • ID: {entry.id}
                </div>
              </div>

                <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  entry.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {entry.status}
                </div>
                <button
                  onClick={() => handleDownloadSession(entry)}
                  className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                  title="Download history log"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => onDeleteSession(entry.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  title="Delete entry"
                >
                  <StopCircle size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-50">
              <div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</div>
                <div className="text-sm font-black text-slate-900 font-mono">{entry.durationSec}s</div>
              </div>

              <div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Vibration</div>
                <div className="text-sm font-black text-slate-900 font-mono">{entry.maxVibration.toFixed(3)}</div>
              </div>

              <div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Sound</div>
                <div className="text-sm font-black text-slate-900 font-mono">{entry.maxSound.toFixed(3)}</div>
              </div>

              <div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Health</div>
                <div className={`text-sm font-black font-mono ${entry.finalHealth < 50 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {entry.finalHealth.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );   

      case 'PREDICTION':
        return (
          <div className="p-6 space-y-8 overflow-y-auto h-full scrollbar-hide">
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-50 rounded-2xl"><Radar size={24} className="text-purple-600" /></div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Predicted Simulation Engine</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manual Parameter Input & Wear Prediction</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center space-x-3 shadow-xl bg-slate-800 text-white hover:bg-slate-700 cursor-pointer">
                    <Database size={14} />
                    <span>UPLOAD ANALYSIS DATA</span>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onSetMode('PREDICTED_SIMULATION');
                          onCsvUpload(file);
                        }
                      }}
                    />
                  </label>
                  <button
                    onClick={onSave}
                    className="px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center space-x-3 shadow-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <Download size={14} />
                    <span>SAVE PARAMETERS</span>
                  </button>
                  <button
                    onClick={() => {
                      onSetMode('PREDICTED_SIMULATION');
                      onStartPredictedSimulation();
                    }}
                    disabled={twinState.predictedSimulation.isActive}
                    className={`px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center space-x-3 shadow-xl ${
                      twinState.predictedSimulation.isActive ? 'bg-slate-200 text-slate-400' : 'bg-purple-600 text-white hover:bg-purple-500'
                    }`}
                  >
                    <Play size={14} />
                    <span>RUN PREDICTION</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Activity size={12} className="mr-2" /> Spindle Speed (RPM)
                    </label>
                    <input
                      type="number"
                      value={twinState.predictedSimulation.spindleSpeed}
                      onChange={(e) => handlePredictedSimulationChange('spindleSpeed', parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Zap size={12} className="mr-2" /> Feed Rate (mm/min)
                    </label>
                    <input
                      type="number"
                      value={twinState.predictedSimulation.feedRate}
                      onChange={(e) => handlePredictedSimulationChange('feedRate', parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <ArrowDownCircle size={12} className="mr-2" /> Depth of Cut (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={twinState.predictedSimulation.depthOfCut}
                      onChange={(e) => handlePredictedSimulationChange('depthOfCut', parseFloat(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <RefreshCw size={12} className="mr-2" /> Op. Cycle Time (s)
                    </label>
                    <input
                      type="number"
                      value={twinState.predictedSimulation.operationCycleTime}
                      onChange={(e) => handlePredictedSimulationChange('operationCycleTime', parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workpiece Material</label>
                    <div className="grid grid-cols-1 gap-2">
                      {materials.slice(0, 6).map(mat => (
                        <button
                          key={mat.id}
                          onClick={() => handlePredictedSimulationChange('material', mat)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            twinState.predictedSimulation.material.id === mat.id
                              ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase block">{mat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Box size={12} className="mr-2" /> Workpiece Dimensions (mm)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Length (X)</label>
                        <input
                          type="number"
                          value={twinState.predictedSimulation.workpieceDimensions.length}
                          onChange={(e) => handleWorkpieceDimensionChange('length', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-purple-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Width (Y)</label>
                        <input
                          type="number"
                          value={twinState.predictedSimulation.workpieceDimensions.width}
                          onChange={(e) => handleWorkpieceDimensionChange('width', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-purple-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Height (Z)</label>
                        <input
                          type="number"
                          value={twinState.predictedSimulation.workpieceDimensions.height}
                          onChange={(e) => handleWorkpieceDimensionChange('height', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-purple-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tool Grade</label>
                    <div className="grid grid-cols-1 gap-2">
                      {toolGrades.slice(0, 6).map(grade => (
                        <button
                          key={grade.id}
                          onClick={() => handlePredictedSimulationChange('toolGrade', grade)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            twinState.predictedSimulation.toolGrade.id === grade.id
                              ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase block">{grade.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prediction Results</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-slate-100">
                      <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Est. Tool Life</div>
                      <div className="text-xl font-black text-slate-900 font-mono">
                        {twinState.predictedSimulation.estimatedTimeToWear ? `${twinState.predictedSimulation.estimatedTimeToWear}s` : '--'}
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100">
                      <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Wear Threshold</div>
                      <div className="text-xl font-black text-slate-900 font-mono">
                        {twinState.predictedSimulation.wearThreshold}%
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100">
                      <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Exact Wear Time</div>
                      <div className="text-xl font-black text-slate-900 font-mono">
                        {twinState.predictedSimulation.exactWearTimestamp ? new Date(twinState.predictedSimulation.exactWearTimestamp).toLocaleTimeString() : '--'}
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100">
                      <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Ops. Remaining</div>
                      <div className="text-xl font-black text-slate-900 font-mono">
                        {twinState.predictedSimulation.estimatedOperationsRemaining !== null ? twinState.predictedSimulation.estimatedOperationsRemaining : '--'}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-100">
                    <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Prediction Status</div>
                    <div className={`text-xs font-black uppercase ${twinState.predictedSimulation.isActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`}>
                      {twinState.predictedSimulation.isActive ? 'Simulation Running...' : 'Ready to Analyze'}
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center">
                      <Shield size={14} className="mr-2" /> Optimization Baseline (Ideal)
                    </h4>
                    <span className="text-[8px] font-bold text-emerald-600 uppercase">Target Performance</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-emerald-100">
                      <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Opt. Vibration</div>
                      <div className="text-lg font-black text-emerald-600 font-mono">
                        {optimized.vibration.toFixed(3)}
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-emerald-100">
                      <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Opt. Sound</div>
                      <div className="text-lg font-black text-emerald-600 font-mono">
                        {optimized.noise.toFixed(3)}
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-emerald-600 font-bold uppercase leading-relaxed">
                    Comparison baseline for tool wear detection. Values exceeding these baselines by &gt;20% indicate early tool degradation or upcoming breakage risks.
                  </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Historical Context Analysis</h4>
                  <div className="space-y-3">
                    {sessionLog.slice(0, 3).map(log => (
                      <div key={log.id} className="p-3 bg-white rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <div className="text-[9px] font-black text-slate-900 uppercase">{log.title}</div>
                          <div className="text-[8px] text-slate-400 uppercase">{new Date(log.startTime).toLocaleDateString()}</div>
                        </div>
                        <div className="text-[9px] font-black text-indigo-600 uppercase">{log.finalHealth.toFixed(1)}% Health</div>
                      </div>
                    ))}
                    {sessionLog.length === 0 && (
                      <div className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">No history for analysis</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      case 'PROGRAM':
        return (
          <div className="p-6 space-y-8 overflow-y-auto h-full scrollbar-hide">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-8 shadow-sm lg:col-span-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl"><Settings size={24} className="text-indigo-600" /></div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Manual Parameters</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Direct Machine Control</p>
                    </div>
                  </div>
                  <button
                    onClick={onSave}
                    className="p-3 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm flex items-center space-x-2 group"
                    title="Save Parameters"
                  >
                    <ClipboardIcon size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Save</span>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Activity size={12} className="mr-2" /> Spindle RPM</label>
                    <div className="flex items-center space-x-4">
                      <input type="number" value={twinState.manualControl.spindleRpm || 0} onChange={(e) => handleManualControlChange('spindleRpm', parseInt(e.target.value))} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">RPM</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Zap size={12} className="mr-2" /> Feed Rate</label>
                    <div className="flex items-center space-x-4">
                      <input type="number" step="0.1" value={twinState.manualControl.feedRate || 0} onChange={(e) => handleManualControlChange('feedRate', parseFloat(e.target.value))} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">mm/min</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><ArrowDownCircle size={12} className="mr-2" /> Depth of Cut</label>
                      <input type="number" step="0.1" value={twinState.manualControl.depthOfCut || 0} onChange={(e) => handleManualControlChange('depthOfCut', parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Scissors size={12} className="mr-2" /> Step Over</label>
                      <input type="number" step="0.1" value={twinState.manualControl.stepOver || 0} onChange={(e) => handleManualControlChange('stepOver', parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Move size={12} className="mr-2" /> Length X</label>
                      <input type="number" step="0.1" value={twinState.manualControl.lengthX || 0} onChange={(e) => handleManualControlChange('lengthX', parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Move size={12} className="mr-2" /> Length Y</label>
                      <input type="number" step="0.1" value={twinState.manualControl.lengthY || 0} onChange={(e) => handleManualControlChange('lengthY', parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Move size={12} className="mr-2" /> Height Z</label>
                      <input type="number" step="0.1" value={twinState.manualControl.heightZ || 0} onChange={(e) => handleManualControlChange('heightZ', parseFloat(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none" />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Wind size={16} className={twinState.manualControl.coolantEnabled ? 'text-blue-500' : 'text-slate-300'} />
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Coolant System</span>
                    </div>
                    <button
                      onClick={() => handleManualControlChange('coolantEnabled', !twinState.manualControl.coolantEnabled)}
                      className={`w-12 h-6 rounded-full transition-all relative ${twinState.manualControl.coolantEnabled ? 'bg-blue-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${twinState.manualControl.coolantEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm lg:col-span-2 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl"><Code size={24} className="text-emerald-600" /></div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">G-Code / M-Code Program</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Programmable Logic Controller</p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleManualControlChange('isExecutingGCode', !twinState.manualControl.isExecutingGCode)}
                      className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center space-x-3 shadow-xl ${
                        twinState.manualControl.isExecutingGCode ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {twinState.manualControl.isExecutingGCode ? <StopCircle size={14} /> : <Play size={14} />}
                      <span>{twinState.manualControl.isExecutingGCode ? 'STOP PROGRAM' : 'RUN PROGRAM'}</span>
                    </button>

                    {twinState.csvPlayback.data.length > 0 && (
                      <button
                        onClick={() => {
                          onConfigChange({
                            csvPlayback: { isActive: !twinState.csvPlayback.isActive },
                            status: !twinState.csvPlayback.isActive ? 'RUNNING' : 'IDLE'
                          });
                          onSetMode('OFFLINE_CSV');
                        }}
                        className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center space-x-3 shadow-xl ${
                          twinState.csvPlayback.isActive ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                        }`}
                      >
                        {twinState.csvPlayback.isActive ? <StopCircle size={14} /> : <Play size={14} />}
                        <span>{twinState.csvPlayback.isActive ? 'STOP CSV REPLAY' : 'START CSV REPLAY'}</span>
                      </button>
                    )}

                    <label className="px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center space-x-3 shadow-xl bg-slate-800 text-white hover:bg-slate-700 cursor-pointer">
                      <FileText size={14} />
                      <span>UPLOAD CSV SIM</span>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onCsvUpload(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex-1 flex flex-col space-y-4 min-h-[400px]">
                  <div className="flex-1 relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-inner">
                    <div className="absolute top-0 left-0 w-12 h-full bg-slate-800/50 border-r border-slate-700 flex flex-col items-center py-4 space-y-1">
                      {twinState.manualControl.gCodeProgram.split('\n').map((_, i) => (
                        <span key={i} className={`text-[9px] font-mono ${twinState.manualControl.currentLine === i ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
                          {i + 1}
                        </span>
                      ))}
                    </div>

                    <textarea
                      value={twinState.manualControl.gCodeProgram}
                      onChange={(e) => handleManualControlChange('gCodeProgram', e.target.value)}
                      className="w-full h-full bg-transparent text-emerald-500 font-mono text-xs p-4 pl-16 outline-none resize-none leading-relaxed"
                      spellCheck={false}
                    />

                    {twinState.manualControl.isExecutingGCode && (
                      <div className="absolute bottom-6 right-6 px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-xl backdrop-blur-md flex items-center space-x-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                          Executing Line {twinState.manualControl.currentLine + 1}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Terminal size={14} className="text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Console Output</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-600 space-y-1">
                      <p>[SYSTEM] Program loaded: {twinState.manualControl.gCodeProgram.split('\n').length} lines</p>
                      {twinState.manualControl.isExecutingGCode && (
                        <p className="text-emerald-600 animate-pulse">[EXEC] Executing block G01 X50 Y0 F300...</p>
                      )}
                      {twinState.csvPlayback.fileName && (
                        <p className="text-indigo-600">[CSV] Loaded replay file: {twinState.csvPlayback.fileName}</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 'NOTIFICATIONS':
        return (
          <div className="p-6 space-y-8 overflow-y-auto h-full scrollbar-hide">
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-8 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-red-50 rounded-2xl"><ShieldAlert size={24} className="text-red-600" /></div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Email Notifications</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configure alerts for abnormal machine behavior</p>
                </div>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Database size={12} className="mr-2" /> Registered Email Addresses
                  </label>
                  
                  <div className="flex space-x-2">
                    <input 
                      type="email" 
                      id="emailInput"
                      placeholder="Enter email address"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:border-indigo-500 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget;
                          const email = input.value.trim();
                          if (email && !twinState.manualControl.notificationEmails.includes(email)) {
                            handleManualControlChange('notificationEmails', [...twinState.manualControl.notificationEmails, email]);
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('emailInput') as HTMLInputElement;
                        const email = input.value.trim();
                        if (email && !twinState.manualControl.notificationEmails.includes(email)) {
                          handleManualControlChange('notificationEmails', [...twinState.manualControl.notificationEmails, email]);
                          input.value = '';
                        }
                      }}
                      className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg"
                    >
                      Add Email
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {twinState.manualControl.notificationEmails.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                        No email addresses registered. Add one above to receive alerts.
                      </p>
                    ) : (
                      twinState.manualControl.notificationEmails.map((email, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 group hover:border-indigo-300 transition-all">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-black">
                              {index + 1}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{email}</span>
                          </div>
                          <button 
                            onClick={() => {
                              const newEmails = twinState.manualControl.notificationEmails.filter((_, i) => i !== index);
                              handleManualControlChange('notificationEmails', newEmails);
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notification Triggers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Abnormal Vibration', desc: 'Alert when RMS exceeds threshold' },
                      { label: 'Excessive Sound', desc: 'Alert when noise level is too high' },
                      { label: 'Tool Wear Warning', desc: 'Alert when wear exceeds 70%' },
                      { label: 'Machine Critical State', desc: 'Alert on system failure or emergency stop' },
                      { label: 'Tool Breakage Risk', desc: 'Alert when impact forces are detected' }
                    ].map((trigger, i) => (
                      <div key={i} className="flex items-start space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="mt-1">
                          <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{trigger.label}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{trigger.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex flex-col md:flex-row items-center px-4 md:px-6 py-2 bg-white border-b border-slate-200 justify-between shadow-sm space-y-2 md:space-y-0">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide w-full md:w-auto pb-1 md:pb-0">
          {(['TWIN', 'STATUS', 'PROGRAM', 'PREDICTION', 'HISTORY', 'USER DATA', 'NOTIFICATIONS', 'SETUP'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'TWIN' && <LayoutDashboard size={14} />}
              {tab === 'STATUS' && <BarChart3 size={14} />}
              {tab === 'PROGRAM' && <Code size={14} />}
              {tab === 'PREDICTION' && <Radar size={14} />}
              {tab === 'HISTORY' && <Activity size={14} />}
              {tab === 'USER DATA' && <Beaker size={14} />}
              {tab === 'NOTIFICATIONS' && <ShieldAlert size={14} />}
              {tab === 'SETUP' && <Settings size={14} />}
              <span>{tab === 'SETUP' ? 'PROCESS SETUP' : tab}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4 md:space-x-6 text-[9px] md:text-[10px] font-black uppercase tracking-tighter w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-hide">
            <div className="flex items-center px-3 border-r border-slate-200 mr-2">
              <span className="text-slate-400 mr-2">Machine Type:</span>
              <select
                value={twinState.machineType}
                onChange={(e) => onConfigChange({ machineType: e.target.value })}
                className="bg-transparent text-indigo-600 outline-none cursor-pointer"
              >
                <option value="CNC">CNC Machine</option>
                <option value="CONVENTIONAL">Conventional Milling</option>
              </select>
            </div>

            <button
              onClick={() => onSetMode('SIMULATED')}
              className={`px-3 py-1.5 rounded-lg transition-all ${twinState.mode === 'SIMULATED' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Simulator
            </button>

            <button
              onClick={() => onSetMode('ESP32')}
              className={`px-3 py-1.5 rounded-lg transition-all ${twinState.mode === 'ESP32' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              ESP32 Mode
            </button>

            <button
              onClick={() => twinState.csvPlayback.data.length > 0 && onSetMode('OFFLINE_CSV')}
              disabled={!twinState.csvPlayback.data.length}
              className={`px-3 py-1.5 rounded-lg transition-all ${twinState.mode === 'OFFLINE_CSV' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'} ${!twinState.csvPlayback.data.length ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              Offline CSV
            </button>

            <button
              onClick={() => onSetMode('PREDICTED_SIMULATION')}
              className={`px-3 py-1.5 rounded-lg transition-all ${twinState.mode === 'PREDICTED_SIMULATION' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Prediction
            </button>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-slate-400">{activeLinkLabel}</span>
            <span className={activeLinkStatus === 'CONNECTED' ? 'text-indigo-600' : activeLinkStatus === 'ERROR' ? 'text-red-500' : 'text-slate-400'}>
              {activeLinkStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{renderTabContent()}</div>
    </div>
  );
};