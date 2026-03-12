
import React, { Suspense, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Grid,
  ContactShadows
} from '@react-three/drei';
import { MachineModel } from './MachineModel';
import { TwinState } from '../types';
import { X, Cpu, Activity, Thermometer, Zap, Wrench } from 'lucide-react';

interface ThreeSceneProps {
  twinState: TwinState;
}

function SpindleRotation({ children, rpm }: any) {
  const ref = useRef<any>(null)

  useFrame((state, delta) => {
    if (ref.current) {
      const speed = (rpm || 0) * 0.01
      ref.current.rotation.y += delta * speed
    }
  })

  return <group ref={ref}>{children}</group>
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({ twinState }) => {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const renderPartTelemetry = () => {
    if (!selectedPart) return null;

    const partInfo =
      selectedPart === 'spindle'
        ? {
            title: 'Spindle Assembly',
            icon: Cpu,
            stats: [
              {
                label: 'Rotation Speed',
                value: `${Math.round(twinState.telemetry?.rpm || 0)} RPM`,
                icon: Activity
              },
              {
                label: 'Torque Load',
                value: `${(twinState.telemetry?.spindleLoad || 0).toFixed(1)}%`,
                icon: Zap
              },
              {
                label: 'Bearing Temp',
                value: `${(twinState.telemetry?.temperature || 0).toFixed(1)}°C`,
                icon: Thermometer
              }
            ]
          }
        : {
            title: 'Precision Tool Bit',
            icon: Wrench,
            stats: [
              {
                label: 'Current Wear',
                value: `${(twinState.telemetry?.toolWear || 0).toFixed(2)}%`,
                icon: Wrench
              },
              {
                label: 'Feed Velocity',
                value: `${Math.round(twinState.telemetry?.feedRate || 0)} mm/min`,
                icon: Zap
              }
            ]
          };

    return (
      <div className="absolute top-6 right-6 z-20 w-64 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <partInfo.icon size={16} className="text-indigo-600" />
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
              {partInfo.title}
            </h3>
          </div>
          <button
            onClick={() => setSelectedPart(null)}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {partInfo.stats.map((stat, i) => (
            <div key={i} className="flex flex-col space-y-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter flex items-center">
                <stat.icon size={10} className="mr-1.5 opacity-50" />
                {stat.label}
              </span>
              <span className="text-sm font-black text-slate-900 font-mono">
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-[0.2em]">
            Part Status
          </span>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[9px] font-black text-slate-900 uppercase">
              Operational
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative">
      <Canvas shadows className="w-full h-full">
        <color attach="background" args={['#ffffff']} />

        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[4, 3, 4]} fov={45} />

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2}
            minDistance={3}
            maxDistance={15}
          />

          <ambientLight intensity={1.2} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            intensity={3.0}
            castShadow
          />
          <pointLight position={[-10, -10, -10]} intensity={0.8} color="#ffffff" />

          <Environment preset="studio" />

          <SpindleRotation rpm={twinState.telemetry?.rpm}>
            <MachineModel
              twinState={twinState}
              onSelectPart={setSelectedPart}
              selectedPart={selectedPart}
  />
</SpindleRotation>
          <Grid
            infiniteGrid
            fadeDistance={25}
            fadeStrength={5}
            cellSize={1}
            sectionSize={5}
            sectionColor="#cbd5e1"
            cellColor="#e2e8f0"
          />

          <ContactShadows opacity={0.4} scale={10} blur={2} far={4} />
        </Suspense>
      </Canvas>

      {renderPartTelemetry()}
    </div>
  );
};