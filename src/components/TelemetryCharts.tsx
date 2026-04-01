import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TelemetryData } from '../services/healthService';

interface TelemetryChartsProps {
  data: TelemetryData[];
}

const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="h-64">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Vibration (RMS g)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="timestamp" hide />
            <YAxis domain={[0, 1]} stroke="#94a3b8" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}
              labelStyle={{ display: 'none' }}
            />
            <Line 
              type="monotone" 
              dataKey="vibration" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-64">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Sound Level (Normalized)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="timestamp" hide />
            <YAxis domain={[0, 1]} stroke="#94a3b8" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}
              labelStyle={{ display: 'none' }}
            />
            <Line 
              type="monotone" 
              dataKey="soundLevel" 
              stroke="#8b5cf6" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-64">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Tool Wear (mm)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="timestamp" hide />
            <YAxis domain={[0, 0.6]} stroke="#94a3b8" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}
              labelStyle={{ display: 'none' }}
            />
            <Line 
              type="monotone" 
              dataKey="toolWear" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-64">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">RPM</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="timestamp" hide />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}
              labelStyle={{ display: 'none' }}
            />
            <Line 
              type="monotone" 
              dataKey="rpm" 
              stroke="#10b981" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TelemetryCharts;
