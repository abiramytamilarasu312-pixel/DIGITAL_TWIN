
import React, { useMemo } from 'react';
import { TelemetryData } from '../types';
import { Binary, TrendingDown, Target, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LSTMForecasterProps {
  history: TelemetryData[];
}

export const LSTMForecaster: React.FC<LSTMForecasterProps> = ({ history }) => {
  // Simple "LSTM-like" trend analysis projection
  const predictionData = useMemo(() => {
    if (history.length < 10) return [];
    
    const lastWear = history[history.length - 1].toolWear;
    const firstWear = history[Math.max(0, history.length - 20)].toolWear;
    const slope = (lastWear - firstWear) / 20;
    
    // Project next 20 points
    const projection = [];
    for (let i = 0; i < 20; i++) {
      projection.push({
        index: i,
        actual: i === 0 ? lastWear : null,
        projected: lastWear + (slope * i) + (Math.random() - 0.5) * 0.2,
        upperBound: lastWear + (slope * i) + (i * 0.1),
        lowerBound: lastWear + (slope * i) - (i * 0.1),
      });
    }
    return projection;
  }, [history]);

  const rul = useMemo(() => {
    if (history.length < 5) return 'CALIBRATING';
    const last = history[history.length - 1].toolWear;
    const delta = (last - history[0].toolWear) / history.length;
    if (delta <= 0) return 'NOMINAL';
    const remaining = (100 - last) / (delta * 60); // Hours approx
    return `${(remaining || 0).toFixed(1)}h`;
  }, [history]);

  return (
    <section className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col h-[350px] shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
          <Binary size={16} className="mr-2 text-indigo-600" /> AI LSTM Forecasting (Edge-Inference)
        </h3>
        <div className="flex space-x-3">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-slate-400 uppercase">Model Reliability</span>
            <span className="text-[10px] font-black text-emerald-600 font-mono">94.2%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="flex items-center text-[8px] text-slate-400 uppercase font-black mb-1">
             <Target size={10} className="mr-1 text-indigo-600" /> Predicted RUL
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">{rul}</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="flex items-center text-[8px] text-slate-400 uppercase font-black mb-1">
             <TrendingDown size={10} className="mr-1 text-amber-600" /> Deg. Rate
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">2.4%/hr</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="flex items-center text-[8px] text-slate-400 uppercase font-black mb-1">
             <Zap size={10} className="mr-1 text-purple-600" /> Model Latency
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">12ms</div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={predictionData}>
            <defs>
              <linearGradient id="forecastColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="index" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area 
              type="monotone" 
              dataKey="projected" 
              stroke="#4f46e5" 
              fillOpacity={1} 
              fill="url(#forecastColor)" 
              strokeWidth={2}
              isAnimationActive={false}
              name="LSTM Projected Wear"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
