import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Pause, RefreshCw, FileText, Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateToolHealth, TelemetryData, HealthResult } from './services/healthService';
import { fetchLatestThingSpeakData, ThingSpeakConfig } from './services/thingSpeakService';
import { parseCSVData } from './services/csvService';
import HealthGauge from './components/HealthGauge';
import TelemetryCharts from './components/TelemetryCharts';

const DEFAULT_CSV = `timestamp,vibration,soundLevel,toolWear,toolHealth,rpm
2026-04-01T12:00:00Z,0.2,0.1,0.05,,1500
2026-04-01T12:00:01Z,0.25,0.15,0.08,,1505
2026-04-01T12:00:02Z,0.3,0.2,0.12,,1510
2026-04-01T12:00:03Z,0.35,0.25,0.18,,1508
2026-04-01T12:00:04Z,0.4,0.3,0.25,,1512
2026-04-01T12:00:05Z,0.45,0.35,0.32,,1505
2026-04-01T12:00:06Z,0.5,0.4,0.4,,1500
2026-04-01T12:00:07Z,0.55,0.45,0.45,,1495
2026-04-01T12:00:08Z,0.6,0.5,0.48,,1500
2026-04-01T12:00:09Z,0.65,0.55,0.52,,1505
2026-04-01T12:00:10Z,0.7,0.6,0,,1510`;

const App: React.FC = () => {
  const [dataSource, setDataSource] = useState<'CSV' | 'ThingSpeak'>('CSV');
  const [csvContent, setCsvContent] = useState(DEFAULT_CSV);
  const [csvData, setCsvData] = useState<TelemetryData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState<(TelemetryData & HealthResult)[]>([]);
  const [thingSpeakConfig, setThingSpeakConfig] = useState<ThingSpeakConfig>({
    channelId: '12397', // Example public channel
    readApiKey: '',
    fieldMapping: {
      vibration: 'field1',
      soundLevel: 'field2',
      toolWear: 'field3',
      toolHealth: 'field4',
      rpm: 'field5'
    }
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize CSV Data
  useEffect(() => {
    const parsed = parseCSVData(csvContent);
    setCsvData(parsed);
    setCurrentIndex(0);
    setHistory([]);
  }, [csvContent]);

  // Simulation Logic
  useEffect(() => {
    if (isPlaying && dataSource === 'CSV') {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= csvData.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, dataSource, csvData.length]);

  // ThingSpeak Polling
  useEffect(() => {
    if (dataSource === 'ThingSpeak') {
      const poll = async () => {
        const data = await fetchLatestThingSpeakData(thingSpeakConfig);
        if (data) {
          processNewData(data);
        }
      };

      poll();
      const interval = setInterval(poll, 15000); // ThingSpeak free tier limit is ~15s
      return () => clearInterval(interval);
    }
  }, [dataSource, thingSpeakConfig]);

  // Process current CSV point
  useEffect(() => {
    if (dataSource === 'CSV' && csvData[currentIndex]) {
      processNewData(csvData[currentIndex]);
    }
  }, [currentIndex, dataSource, csvData]);

  const processNewData = (data: TelemetryData) => {
    const result = calculateToolHealth(data);
    setHistory((prev) => {
      const newHistory = [...prev, { ...data, ...result }];
      return newHistory.slice(-50); // Keep last 50 points
    });
  };

  const currentPoint = history[history.length - 1] || null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvContent(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tool Condition Monitor</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Digital Twin Telemetry</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isPlaying || dataSource === 'ThingSpeak' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
              {dataSource === 'ThingSpeak' ? 'Live Stream' : isPlaying ? 'Simulating' : 'Paused'}
            </span>
          </div>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-full transition-colors ${isPlaying ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Controls */}
        <aside className="lg:col-span-3 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Settings size={16} /> Data Source
            </h2>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setDataSource('CSV')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  dataSource === 'CSV' 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <FileText size={18} />
                <span className="font-semibold">CSV Simulation</span>
              </button>
              
              <button 
                onClick={() => setDataSource('ThingSpeak')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  dataSource === 'ThingSpeak' 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <RefreshCw size={18} />
                <span className="font-semibold">ThingSpeak IoT</span>
              </button>
            </div>
          </section>

          {dataSource === 'CSV' && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Upload CSV</h2>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs text-slate-500">Click to upload telemetry</p>
                </div>
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              </label>
              <div className="text-[10px] text-slate-400 leading-relaxed">
                Expected headers: vibration, soundLevel, toolWear, rpm, timestamp
              </div>
            </section>
          )}

          {dataSource === 'ThingSpeak' && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">IoT Config</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Channel ID</label>
                  <input 
                    type="text" 
                    value={thingSpeakConfig.channelId}
                    onChange={(e) => setThingSpeakConfig({...thingSpeakConfig, channelId: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Read API Key</label>
                  <input 
                    type="password" 
                    value={thingSpeakConfig.readApiKey}
                    onChange={(e) => setThingSpeakConfig({...thingSpeakConfig, readApiKey: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>
          )}
        </aside>

        {/* Main Dashboard */}
        <div className="lg:col-span-9 space-y-8">
          {/* Top Row: Health & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              {currentPoint ? (
                <HealthGauge health={currentPoint.toolHealth} status={currentPoint.status} />
              ) : (
                <div className="h-full flex items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                  Waiting for data...
                </div>
              )}
            </div>

            <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Current Status Analysis</h3>
                <AnimatePresence mode="wait">
                  {currentPoint ? (
                    <motion.div 
                      key={currentPoint.status}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-4">
                        {currentPoint.status === 'GOOD' && <CheckCircle className="text-green-500 w-10 h-10" />}
                        {currentPoint.status === 'WARNING' && <AlertTriangle className="text-yellow-500 w-10 h-10" />}
                        {currentPoint.status === 'CRITICAL' && <AlertTriangle className="text-red-500 w-10 h-10" />}
                        
                        <div>
                          <p className="text-2xl font-bold text-slate-800">
                            {currentPoint.status === 'GOOD' ? 'System Healthy' : 
                             currentPoint.status === 'WARNING' ? 'Maintenance Required' : 
                             'Critical Failure Risk'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {currentPoint.status === 'GOOD' ? 'Tool condition is optimal. Continue operations.' : 
                             currentPoint.status === 'WARNING' ? 'Wear is approaching threshold. Schedule inspection.' : 
                             'Immediate tool replacement mandatory to prevent damage.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-50">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vibration</p>
                          <p className="text-lg font-mono font-bold text-slate-700">{currentPoint.vibration.toFixed(3)}g</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sound</p>
                          <p className="text-lg font-mono font-bold text-slate-700">{currentPoint.soundLevel.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Wear</p>
                          <p className="text-lg font-mono font-bold text-slate-700">
                            {currentPoint.toolWear !== undefined ? `${currentPoint.toolWear.toFixed(3)}mm` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-400 italic">
                      <Info size={18} />
                      <span>Start simulation or connect to IoT to see analysis</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-4">
                <RefreshCw size={10} className={isPlaying ? 'animate-spin' : ''} />
                Last updated: {currentPoint ? new Date(currentPoint.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <TelemetryCharts data={history} />

          {/* Data Log */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Telemetry Log</h3>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">Last 50 Samples</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Vibration</th>
                    <th className="px-6 py-3">Sound</th>
                    <th className="px-6 py-3">Wear</th>
                    <th className="px-6 py-3">Health</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...history].reverse().slice(0, 10).map((point, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs">{new Date(point.timestamp).toLocaleTimeString()}</td>
                      <td className="px-6 py-3 font-mono">{point.vibration.toFixed(3)}</td>
                      <td className="px-6 py-3 font-mono">{point.soundLevel.toFixed(2)}</td>
                      <td className="px-6 py-3 font-mono">{point.toolWear?.toFixed(3) || '-'}</td>
                      <td className="px-6 py-3 font-bold">{point.toolHealth}%</td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          point.status === 'GOOD' ? 'bg-green-100 text-green-700' :
                          point.status === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {point.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
