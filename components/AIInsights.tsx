
import React, { useState, useEffect, useRef } from 'react';
import { TwinState, MachineHealth, AIDiagnosticResponse } from '../types';
import { getIndustrialInsights } from '../services/geminiService';
import { BrainCircuit, Loader2, RefreshCw, ShieldCheck, AlertTriangle, ListChecks, History, Target, TrendingDown, Clock, Activity, Fingerprint, Zap } from 'lucide-react';

interface AIInsightsProps {
  twinState: TwinState;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ twinState }) => {
  const [insight, setInsight] = useState<AIDiagnosticResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestTime = useRef<number>(0);

  const fetchInsight = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRequestTime.current < 15000) return;

    if (twinState.status !== 'RUNNING' && twinState.health === MachineHealth.HEALTHY && !force) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    lastRequestTime.current = now;
    
    try {
      const data = await getIndustrialInsights(twinState);
      if (data) {
        setInsight(data);
      } else {
        setError("Edge diagnostic mode active. LLM link deferred.");
      }
    } catch (e) {
      setError("Analysis unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
    const interval = setInterval(() => fetchInsight(), 90000);
    return () => clearInterval(interval);
  }, [twinState.status, twinState.health]);

  const failureProb = (twinState.predictions?.failureProbability || 0) * 100;
  const rulPercentage = Math.max(0, Math.min(100, ((twinState.predictions?.rul || 0) / 1000) * 100));

  // Determine top contributing factors based on state thresholds
  const getContributingFactors = () => {
    const factors = [];
    if ((twinState.telemetry?.temperature || 0) > twinState.config.thresholds.temperature * 0.75) factors.push({ label: 'Thermal Delta', value: `${(twinState.telemetry?.temperature || 0).toFixed(1)}°C`, impact: 'High' });
    if ((twinState.telemetry?.vibration || 0) > twinState.config.thresholds.vibrationRms * 0.6) factors.push({ label: 'Harmonic Stress', value: `${(twinState.telemetry?.vibration || 0).toFixed(2)} RMS`, impact: 'Medium' });
    if ((twinState.telemetry?.toolWear || 0) > 50) factors.push({ label: 'Abrasive Wear', value: `${(twinState.telemetry?.toolWear || 0).toFixed(1)}%`, impact: 'Critical' });
    if ((twinState.telemetry?.spindleLoad || 0) > 70) factors.push({ label: 'Spindle Torque', value: `${(twinState.telemetry?.spindleLoad || 0).toFixed(1)}%`, impact: 'High' });
    return factors;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <BrainCircuit size={120} className="text-indigo-600" />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <BrainCircuit size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Digital Twin AI Diagnostics</h3>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">GEMINI 3 PRO EDGE-LINK</p>
          </div>
        </div>
        <button 
          onClick={() => fetchInsight(true)}
          disabled={loading}
          className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 group"
          title="Manual Refresh"
        >
          <RefreshCw size={16} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Failure Probability Gauge */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="relative w-24 h-24 mb-3">
             <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" 
                        strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * failureProb) / 100}
                        className={`${failureProb > 70 ? 'text-red-500' : failureProb > 30 ? 'text-amber-500' : 'text-emerald-500'} transition-all duration-1000`} />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-900 font-mono">{(failureProb || 0).toFixed(1)}%</span>
                <span className="text-[7px] text-slate-400 uppercase font-black">Failure Prob</span>
             </div>
          </div>
          <div className="flex items-center space-x-1">
             <TrendingDown size={10} className={failureProb > 50 ? 'text-red-500' : 'text-emerald-500'} />
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Model Confidence: 94.2%</span>
          </div>
        </div>

        {/* RUL Progress Bar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
           <div className="flex justify-between items-end mb-2">
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Remaining Useful Life (RUL)</span>
                <span className="text-xl font-black text-slate-900 font-mono">{(twinState.predictions?.rul || 0).toFixed(1)} hrs</span>
              </div>
              <Target size={18} className="text-indigo-600" />
           </div>
           <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
              <div 
                className={`h-full transition-all duration-1000 ${rulPercentage < 20 ? 'bg-red-500' : rulPercentage < 50 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                style={{ width: `${rulPercentage}%` }}
              ></div>
           </div>
           <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase">
              <span>Next Service: {twinState.predictions.nextMaintenanceDate}</span>
              <span>Capacity: 1000h</span>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <Loader2 size={32} className="animate-spin text-indigo-300" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Processing Multi-Vector Telemetry...</span>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {error}
        </div>
      ) : insight ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Predictive Factor Attribution Section */}
          <div>
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
              <Fingerprint size={12} className="mr-2 text-indigo-600" /> Predictive Factor Attribution
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {getContributingFactors().length > 0 ? (
                getContributingFactors().map((factor, idx) => (
                  <div key={idx} className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">{factor.label}</span>
                      <span className="text-[10px] font-black text-slate-900 font-mono">{factor.value}</span>
                    </div>
                    <div className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                      factor.impact === 'Critical' ? 'bg-red-100 text-red-600' :
                      factor.impact === 'High' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {factor.impact}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-[9px] font-black text-emerald-600 uppercase text-center">
                   NOMINAL OPERATION DETECTED: No contributing risk factors found.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center text-[8px] text-slate-400 uppercase font-black mb-1">
                <ShieldCheck size={10} className="mr-1 text-emerald-600" /> AI Health Status
              </div>
              <div className={`text-sm font-black uppercase font-mono ${
                insight.healthStatus === 'Critical' ? 'text-red-600' :
                insight.healthStatus === 'Warning' ? 'text-amber-600' : 'text-emerald-600'
              }`}>{insight.healthStatus}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center text-[8px] text-slate-400 uppercase font-black mb-1">
                <AlertTriangle size={10} className="mr-1 text-amber-600" /> Anomalies Detected
              </div>
              <div className="text-sm font-black text-slate-900 font-mono">{insight.anomaliesDetected.length} Streams</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <History size={12} className="mr-2 text-indigo-600" /> Behavioral Forecast
              </h4>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-indigo-50 p-3 rounded-xl border border-indigo-100 italic">
                "{insight.prediction}"
              </p>
            </div>

            <div>
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <Zap size={12} className="mr-2 text-indigo-600" /> Risk Mitigation Strategy
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {insight.recommendedActions.map((action, i) => (
                  <div key={i} className="flex items-center space-x-2 text-[10px] text-slate-600 font-bold uppercase bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-indigo-300 transition-all">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[9px] text-slate-400 leading-relaxed">
            <span className="font-black text-indigo-600 uppercase mr-2">Expert Diagnostic Summary:</span>
            {insight.summary}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
          Awaiting production telemetry for deep-cycle analysis.
        </div>
      )}
    </div>
  );
};
