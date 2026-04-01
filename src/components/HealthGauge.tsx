import React from 'react';
import { motion } from 'motion/react';
import { ToolStatus } from '../services/healthService';

interface HealthGaugeProps {
  health: number;
  status: ToolStatus;
}

const HealthGauge: React.FC<HealthGaugeProps> = ({ health, status }) => {
  const getColor = () => {
    switch (status) {
      case 'GOOD': return '#22c55e'; // green-500
      case 'WARNING': return '#eab308'; // yellow-500
      case 'CRITICAL': return '#ef4444'; // red-500
      default: return '#94a3b8'; // slate-400
    }
  };

  const color = getColor();
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Tool Health</h3>
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="12"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="96"
            cy="96"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            key={health}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-slate-800"
          >
            {Math.round(health)}%
          </motion.span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${
            status === 'GOOD' ? 'bg-green-100 text-green-700' :
            status === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HealthGauge;
