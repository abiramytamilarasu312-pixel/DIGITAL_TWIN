
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts';
import { TelemetryData } from '../types';

interface TelemetryChartsProps {
  history: TelemetryData[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history }) => {
  const chartData = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    vibration: parseFloat((h.vibration || 0).toFixed(3)),
    noise: parseFloat((h.noiseLevel || 0).toFixed(3)),
    health: h.machineHealth
  })).slice(-20);
  const wearVsRmsData = history.map(h => ({
    rms: parseFloat((h.vibration || 0).toFixed(3)),
    toolWear: parseFloat((h.toolWear || 0).toFixed(4))
  })).filter(d => d.rms > 0 && d.toolWear > 0);

  return (
    <div className="space-y-6">
      {/* Vibration Monitoring */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 h-[200px] shadow-sm">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Vibration Spectrum (RMS)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="vibeColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="time" hide />
            <YAxis hide domain={[0, 1]} />
            <Tooltip 
               contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
               itemStyle={{ color: '#4f46e5' }}
            />
            <Area type="monotone" dataKey="vibration" stroke="#4f46e5" fillOpacity={1} fill="url(#vibeColor)" animationDuration={300} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Sound Level Monitoring */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 h-[200px] shadow-sm">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Sound Level (Noise)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="time" hide />
            <YAxis hide domain={[0, 1]} />
            <Tooltip 
               contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
               itemStyle={{ color: '#06b6d4' }}
            />
            <Line type="monotone" dataKey="noise" stroke="#06b6d4" strokeWidth={2} dot={false} animationDuration={300} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-200 h-[250px] shadow-sm">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3">
          Tool Wear vs RMS Analysis
        </h3>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

            <XAxis
              type="number"
              dataKey="rms"
              name="RMS"
              label={{ value: 'RMS (Vibration)', position: 'insideBottom', offset: -5 }}
            />
            
            <YAxis
              type="number"
              dataKey="toolWear"
              name="Tool Wear"
              domain={[0, 0.5]}
              label={{ value: 'Tool Wear (mm)', angle: -90, position: 'insideLeft' }}
            />

            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '10px'
              }}
            />
            
            <Line
              type="monotone"
              dataKey="toolWear"
              data={wearVsRmsData}
              stroke="#ef4444"
              dot={false}
            />

            <Scatter
              name="Wear vs RMS"
              data={wearVsRmsData}
              fill="#ef4444"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
