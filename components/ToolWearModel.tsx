
import React from 'react';
import { TwinState } from '../types';
import { Wrench, Info, Activity, Flame } from 'lucide-react';

export const ToolWearModel: React.FC<{ twinState: TwinState }> = ({ twinState }) => {
  const { material, toolGrade } = twinState.config;
  
  return (
    <section className="bg-white p-6 rounded-3xl border border-slate-200 h-[350px] flex flex-col shadow-sm">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center mb-6">
        <Wrench size={16} className="mr-2 text-amber-600" /> Physical Degradation Model
      </h3>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 font-mono text-[10px] text-indigo-600 leading-loose mb-6">
        <div className="flex items-center text-slate-400 mb-2 font-black">
          <Activity size={12} className="mr-2" /> CORE WEAR EQUATION:
        </div>
        <div className="text-lg font-black text-slate-900">
          dW/dt = (H<sub>m</sub> / D<sub>t</sub>) × L × (1 + αΔT)
        </div>
        <div className="grid grid-cols-2 gap-x-4 mt-2 text-slate-500 font-bold">
          <span>H<sub>m</sub>: {material.hardnessFactor} (Material Hardness)</span>
          <span>D<sub>t</sub>: {toolGrade.durabilityFactor} (Tool Durability)</span>
          <span>L: {(twinState.telemetry?.spindleLoad || 0).toFixed(1)}% (System Load)</span>
          <span>ΔT: {(twinState.telemetry?.temperature || 0).toFixed(1)}°C (Thermal Delta)</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-amber-50 rounded-lg"><Flame size={14} className="text-amber-600" /></div>
             <div>
               <div className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Thermal Influence</div>
               <div className="text-[9px] text-slate-400 font-bold uppercase">Activation Energy: High</div>
             </div>
          </div>
          <div className="text-xs font-black text-slate-900">×{(1 + ((twinState.telemetry?.temperature || 0) / 100)).toFixed(2)}</div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-indigo-50 rounded-lg"><Activity size={14} className="text-indigo-600" /></div>
             <div>
               <div className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Material Resistance</div>
               <div className="text-[9px] text-slate-400 font-bold uppercase">Dynamic Shear: {material.name}</div>
             </div>
          </div>
          <div className="text-xs font-black text-slate-900">{( (material.hardnessFactor || 1) / (toolGrade.durabilityFactor || 1) ).toFixed(3)}</div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 flex items-start space-x-2 text-slate-400">
        <Info size={12} className="mt-0.5 flex-shrink-0" />
        <p className="text-[8px] font-medium leading-relaxed uppercase">Model calibrated to Taylor's Tool Life constants for ISO P10 Carbide under continuous cut simulation.</p>
      </div>
    </section>
  );
};
