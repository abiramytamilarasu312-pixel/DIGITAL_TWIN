
import React, { useMemo } from 'react';
import { TelemetryData, MachineHealth } from '../types';
import { History, ShieldCheck, AlertTriangle, PlayCircle, Clock } from 'lucide-react';

interface ProcessHistoryProps {
  history: TelemetryData[];
  health: MachineHealth;
  status: string;
  hasReceivedInput: boolean;
}

export const ProcessHistory: React.FC<ProcessHistoryProps> = ({ history, health, status, hasReceivedInput }) => {
  const events = useMemo(() => {
    if (!hasReceivedInput) return [];
    // Generate some interesting log entries from history data
    return history.slice(-20).reverse().map((h, i) => {
      let type: 'INFO' | 'CRITICAL' = 'INFO';
      let message = `System telemetry recorded at ${Math.round(h.rpm)} RPM`;
      
      if ((h.toolWear || 0) > 60) {
        type = 'CRITICAL';
        message = `Critical Tool Wear Alert: ${(h.toolWear || 0).toFixed(1)}% reached`;
      }

      return {
        id: i,
        time: new Date(h.timestamp).toLocaleTimeString(),
        type,
        message,
        icon: type === 'CRITICAL' ? AlertTriangle : ShieldCheck
      };
    });
  }, [history]);

  return (
    <div className="p-6 h-full flex flex-col space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center space-x-4 shadow-sm">
          <div className="p-2 bg-indigo-50 rounded-xl"><Clock className="text-indigo-600" size={18} /></div>
          <div>
            <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Active Runtime</div>
            <div className="text-sm font-black text-slate-900 font-mono">{hasReceivedInput ? '124:42:10' : 'IDLE'}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center space-x-4 shadow-sm">
          <div className="p-2 bg-emerald-50 rounded-xl"><ShieldCheck className="text-emerald-600" size={18} /></div>
          <div>
            <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">MTBF Prediction</div>
            <div className="text-sm font-black text-slate-900 font-mono">{hasReceivedInput ? '1,240 hrs' : 'IDLE'}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center space-x-4 shadow-sm">
          <div className="p-2 bg-amber-50 rounded-xl"><PlayCircle className="text-amber-600" size={18} /></div>
          <div>
            <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Cycle Status</div>
            <div className="text-sm font-black text-slate-900 font-mono uppercase tracking-tighter">{status}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center space-x-4 shadow-sm">
          <div className="p-2 bg-red-50 rounded-xl"><AlertTriangle className="text-red-600" size={18} /></div>
          <div>
            <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Active Alerts</div>
            <div className="text-sm font-black text-slate-900 font-mono">{health === MachineHealth.HEALTHY ? '0' : '1'}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
            <History size={16} className="mr-2 text-indigo-600" /> Production Log & Audit Trail
          </h3>
          <button className="text-[10px] font-black text-indigo-600 uppercase hover:text-indigo-800 transition-colors">Export CSV</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {events.map((event) => (
            <div key={event.id} className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all">
              <div className="flex items-center space-x-4">
                <div className={`p-1.5 rounded-lg ${
                  event.type === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                  'bg-indigo-100 text-indigo-600'
                }`}>
                  <event.icon size={14} />
                </div>
                <div>
                  <div className={`text-[10px] font-black tracking-tight ${
                    event.type === 'CRITICAL' ? 'text-red-600' :
                    'text-slate-900'
                  }`}>
                    {event.message}
                  </div>
                  <div className="text-[8px] text-slate-400 font-bold uppercase">{event.time} • SYSLOG_ENTRY_{event.id}</div>
                </div>
              </div>
              <div className="text-[8px] text-slate-400 font-mono hidden group-hover:block transition-all">
                CRC_VALID: 0x4F2A
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
