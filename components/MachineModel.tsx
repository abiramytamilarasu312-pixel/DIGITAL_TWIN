
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Color, Group, MeshStandardMaterial, PointLight } from 'three';
import { Text, Float, RoundedBox } from '@react-three/drei';
import { TwinState, MachineHealth } from '../types';
import { COLORS } from '../constants';

interface MachineModelProps {
  twinState: TwinState;
  onSelectPart: (part: string | null) => void;
  selectedPart: string | null;
}

export const MachineModel: React.FC<MachineModelProps> = ({ twinState, onSelectPart, selectedPart }) => {
  const spindleRef = useRef<Mesh>(null);
  const bitRef = useRef<Group>(null);
  const bitMaterialRef = useRef<MeshStandardMaterial>(null);
  const tableXRef = useRef<Group>(null);
  const tableYRef = useRef<Group>(null);
  const cycleTimeRef = useRef(0);
  const alarmRef = useRef<Group>(null);
  const hazardLightRef = useRef<PointLight>(null);
  const alarmLampRef = useRef<Mesh>(null);
  const headMatRef = useRef<MeshStandardMaterial>(null);
  const machineGroupRef = useRef<Group>(null);
  const workpieceRef = useRef<Mesh>(null);
  
  const [hovered, setHovered] = useState<string | null>(null);
  const [cutPoints, setCutPoints] = useState<{x: number, z: number, y: number}[]>([]);
  const lastPointRef = useRef<{x: number, z: number} | null>(null);

  const HOME_Y = -0.8;      
  const CLEARANCE_Y = -0.95; 
  const DEPTH_Y = -1.3;     
  
  useFrame((state, delta) => {
    const isConventional = twinState.machineType === 'CONVENTIONAL';
    const isRunning = twinState.isMachineOn && (isConventional ? twinState.conventionalMilling.isLiveDemoActive : twinState.status === 'RUNNING');
    const telemetry = twinState.telemetry || { toolWear: 0, rpm: 0, vibration: 0, noiseLevel: 0, machineHealth: 100, forces: { fx: 0, fy: 0, fz: 0 } };
    const toolWear = telemetry.toolWear || 0;
    const targetWear = twinState.materialTest?.targetWear || 95;
    const vibRMS = telemetry.vibration || 0;
    const soundLevel = telemetry.noiseLevel || 0;
    const machineHealth = telemetry.machineHealth || 100;
    
    // Step 1: Define Vibration Levels
    const isNormal = vibRMS < 0.30;
    const isModerate = vibRMS >= 0.30 && vibRMS < 0.54;
    const isHigh = vibRMS >= 0.54;

    // Trigger alarm at 60% wear or critical health state or high vibration or low machine health
    const isCritical = toolWear >= 60 || toolWear >= targetWear || twinState.health === MachineHealth.CRITICAL || isHigh || machineHealth < 50;
    
    // Step 2: Apply Machine Animation (Oscillation)
    if (machineGroupRef.current) {
      if (isNormal) {
        machineGroupRef.current.position.x = 0;
        machineGroupRef.current.position.z = 0;
      } else if (isModerate) {
        // Moderate: amplitude 0.5-1px (approx 0.008 units), slow
        const amplitude = 0.008;
        const speed = 15;
        machineGroupRef.current.position.x = Math.sin(state.clock.elapsedTime * speed) * amplitude;
        machineGroupRef.current.position.z = Math.cos(state.clock.elapsedTime * speed * 0.9) * amplitude;
      } else if (isHigh) {
        // High: amplitude 2-3px (approx 0.025 units), fast
        const amplitude = 0.025;
        const speed = 40;
        machineGroupRef.current.position.x = Math.sin(state.clock.elapsedTime * speed) * amplitude;
        machineGroupRef.current.position.z = Math.cos(state.clock.elapsedTime * speed * 1.1) * amplitude;
      }
    }

    // Vibration animation for spindle/bit (subtle internal jitter)
    const vibrationIntensity = vibRMS > 0.05 ? vibRMS * 0.02 : 0;
    const vibX = (Math.random() - 0.5) * vibrationIntensity;
    const vibZ = (Math.random() - 0.5) * vibrationIntensity;

    if (bitMaterialRef.current) {
      const wearFactor = toolWear / 100;
      const baseColor = new Color("#cbd5e1");
      const warningColor = new Color("#ef4444");
      const healthColor = new Color(
        machineHealth >= 90 ? "#10b981" : 
        machineHealth >= 70 ? "#eab308" : 
        machineHealth >= 50 ? "#f97316" : "#ef4444"
      );
      
      if (isHigh) {
        bitMaterialRef.current.color.set("#ef4444");
      } else {
        // Blend tool color based on health condition
        bitMaterialRef.current.color.lerp(healthColor, 0.1);
      }
      
      if (toolWear > 30 || isModerate || isHigh || machineHealth < 70) {
        const emissiveColor = isHigh ? "#ff0000" : (machineHealth < 70 ? "#f97316" : "#eab308");
        bitMaterialRef.current.emissive.set(emissiveColor);
        bitMaterialRef.current.emissiveIntensity = Math.max((toolWear / 100) * 5.0, vibRMS * 2.0, (100 - machineHealth) / 20);
      } else {
        bitMaterialRef.current.emissive.set(0, 0, 0);
      }

      if (selectedPart === 'bit' || hovered === 'bit') {
        bitMaterialRef.current.emissive.set("#60a5fa");
        bitMaterialRef.current.emissiveIntensity = 2;
      }
    }

    if (isRunning) {
      const baseRpm = isConventional ? twinState.conventionalMilling.spindleSpeed : (telemetry.rpm || 0);
      // Bonus: Animated spindle rotation speed based on vibration
      const vibrationBoost = vibRMS * 1000; 
      const effectiveRpm = baseRpm + vibrationBoost;
      const rotationSpeed = (effectiveRpm / 60) * delta * 2 * Math.PI;
      
      if (spindleRef.current) {
        spindleRef.current.rotation.y -= rotationSpeed;
        spindleRef.current.position.x = vibX;
        spindleRef.current.position.z = 0.4 + vibZ;
      }
      if (bitRef.current) {
        bitRef.current.rotation.y -= rotationSpeed;
        bitRef.current.position.x = vibX;
        bitRef.current.position.z = 0.4 + vibZ;
      }

      const cycleDuration = 4.0;
      cycleTimeRef.current = (cycleTimeRef.current + delta) % cycleDuration;
      const t = cycleTimeRef.current;

      let currentBitY = HOME_Y;
      let currentTableX = 0;
      let currentTableY = 0;

      const lerp = (start: number, end: number, t: number) => start + t * (end - start);
      const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      if (isConventional) {
        // Conventional Milling Animation
        const feedRate = twinState.conventionalMilling.feedRate;
        const depthOfCut = twinState.conventionalMilling.depthOfCut;
        const stepOver = twinState.conventionalMilling.stepOver;
        
        // Scale parameters for visualization
        const vFeed = (feedRate / 500) * 2; // Movement speed
        const vDepth = Math.min(0.35, (depthOfCut / 5) * 0.35); // Penetration depth (never exceed)
        const vStep = (stepOver / 5) * 1.0; // Lateral movement

        const moveX = Math.sin(state.clock.elapsedTime * vFeed) * 0.8;
        const moveZ = Math.cos(state.clock.elapsedTime * vFeed * 0.5) * vStep;
        
        // Touch top and cut gradually
        const penetration = Math.min(vDepth, (state.clock.elapsedTime % 10) * 0.05);
        currentBitY = CLEARANCE_Y - penetration;
        currentTableX = moveX;
        currentTableY = moveZ;
      } else {
        // CNC Animation
        if (t < 0.8) {
          const p = easeInOut(t / 0.8);
          currentBitY = lerp(HOME_Y, CLEARANCE_Y, p);
          currentTableX = Math.sin(state.clock.elapsedTime * 0.4) * 0.4;
          currentTableY = Math.cos(state.clock.elapsedTime * 0.4) * 0.4;
        } else if (t < 2.5) {
          const p = (t - 0.8) / 1.7;
          // Slowly and gradually due to depth
          const maxDepth = Math.min(0.3, (twinState.manualControl.depthOfCut || 2) / 10);
          currentBitY = lerp(CLEARANCE_Y, CLEARANCE_Y - maxDepth, p);
        } else if (t < 3.0) {
          const maxDepth = Math.min(0.3, (twinState.manualControl.depthOfCut || 2) / 10);
          currentBitY = CLEARANCE_Y - maxDepth;
        } else {
          const p = easeInOut((t - 3.0) / 1.0);
          const maxDepth = Math.min(0.3, (twinState.manualControl.depthOfCut || 2) / 10);
          currentBitY = lerp(CLEARANCE_Y - maxDepth, HOME_Y, p);
        }
      }

      if (bitRef.current) bitRef.current.position.y = currentBitY;
      if (tableXRef.current) tableXRef.current.position.x = currentTableX;
      if (tableYRef.current) tableYRef.current.position.z = currentTableY;
      
      if (workpieceRef.current) {
        const isCuttingZone =
          currentBitY < CLEARANCE_Y &&
          Math.abs(currentTableX) < 0.9 &&
          Math.abs(currentTableY) < 0.9;

        if (isCuttingZone) {
          workpieceRef.current.scale.y = Math.max(0.55, workpieceRef.current.scale.y - delta * 0.02);
          workpieceRef.current.position.y = 0.3 - (1 - workpieceRef.current.scale.y) * 0.15;
          
          // Add cut points for visualization
          const dist = lastPointRef.current ? Math.sqrt(Math.pow(currentTableX - lastPointRef.current.x, 2) + Math.pow(currentTableY - lastPointRef.current.z, 2)) : 1;
          if (dist > 0.05) {
            setCutPoints(prev => [...prev, { x: -currentTableX, z: -currentTableY, y: 0.31 }].slice(-200));
            lastPointRef.current = { x: currentTableX, z: currentTableY };
          }
        }
      }
    } else {
      // Not running, clear cut points if reset
      if (twinState.status === 'IDLE' && cutPoints.length > 0) {
        setCutPoints([]);
        lastPointRef.current = null;
      }
    }

    // Alarm Blinking & Pulsing
    const blinkFreq = 16; 
    const blinkState = Math.sin(state.clock.elapsedTime * blinkFreq) > 0;
    const pulseScale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.15;
    const shouldAlarm = isCritical && blinkState;

    if (alarmRef.current) {
      alarmRef.current.visible = isCritical; 
      alarmRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      alarmRef.current.children.forEach(child => {
        child.visible = shouldAlarm;
      });
    }

    if (hazardLightRef.current) {
      hazardLightRef.current.intensity = shouldAlarm ? 50 : 0;
    }
    
    if (alarmLampRef.current) {
      const mat = alarmLampRef.current.material as MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = shouldAlarm ? 20 : 0;
        mat.color.set(shouldAlarm ? "#ff0000" : "#220000");
      }
    }

    if (headMatRef.current) {
      // Step 3: Machine Color Warning
      const warningColor = isHigh ? new Color("#ff0000") : (isModerate ? new Color("#eab308") : new Color("#000000"));
      headMatRef.current.emissive.lerp(warningColor, 0.1);
      headMatRef.current.emissiveIntensity = (isHigh || isModerate) ? (shouldAlarm ? 1.5 : 0.4) : 0;
    }
  });

  const healthColor = twinState.health === MachineHealth.HEALTHY ? COLORS.HEALTHY : 
                  twinState.health === MachineHealth.WARNING ? COLORS.WARNING : COLORS.CRITICAL;

  return (
    <group>
      {/* Base / Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
      </mesh>

      <group ref={machineGroupRef}>
        {/* Main Machine Frame (C-Frame Style) */}
        <mesh position={[0, 2.25, -1.8]} castShadow>
          <boxGeometry args={[4.2, 4.5, 0.4]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>
        
        <mesh position={[2, 2.25, 0]}>
          <boxGeometry args={[0.1, 4.5, 3.8]} />
          <meshStandardMaterial color="#475569" metalness={0.5} transparent opacity={0.2} />
        </mesh>
        <mesh position={[-2, 2.25, 0]}>
          <boxGeometry args={[0.1, 4.5, 3.8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>

        <RoundedBox args={[4.2, 0.6, 4.2]} radius={0.1} smoothness={4} position={[0, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
        </RoundedBox>

        {/* Linear Rails X-Axis */}
        <mesh position={[0, 0.35, 1.2]}>
          <boxGeometry args={[3.8, 0.05, 0.1]} />
          <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.35, -1.2]}>
          <boxGeometry args={[3.8, 0.05, 0.1]} />
          <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.1} />
        </mesh>

        {/* Table & Workpiece */}
        <group ref={tableYRef}>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.4, 0.15, 3.4]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
          </mesh>
          
          <group ref={tableXRef} position={[0, 0.15, 0]}>
            <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
              <boxGeometry args={[3, 0.2, 2.5]} />
              <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
            </mesh>
            
            {/* T-Slots (Visual detail) */}
            {[ -0.8, -0.4, 0, 0.4, 0.8 ].map((x, i) => (
              <mesh key={i} position={[0, 0.51, x]} rotation={[0, 0, 0]}>
                <boxGeometry args={[2.9, 0.01, 0.05]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
            ))}

            <group position={[0, 0.5, 0]}>
              <mesh ref={workpieceRef} position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[
                  twinState.mode === 'PREDICTED_SIMULATION' 
                    ? (twinState.predictedSimulation.workpieceDimensions?.length || 100) * 0.012 
                    : (twinState.manualControl.lengthX || 100) * 0.012,
                  twinState.mode === 'PREDICTED_SIMULATION'
                    ? (twinState.predictedSimulation.workpieceDimensions?.height || 50) * 0.012
                    : (twinState.manualControl.heightZ || 50) * 0.012,
                  twinState.mode === 'PREDICTED_SIMULATION'
                    ? (twinState.predictedSimulation.workpieceDimensions?.width || 100) * 0.012
                    : (twinState.manualControl.lengthY || 100) * 0.012
                ]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.3} roughness={0.6} />
              </mesh>
              
              {/* Cutting Path Visualization */}
              {cutPoints.map((p, i) => (
                <mesh key={i} position={[p.x, p.y, p.z]}>
                  <boxGeometry args={[0.12, 0.01, 0.12]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.2} transparent opacity={0.6} />
                </mesh>
              ))}
              {/* Vise / Clamps */}
              <mesh position={[0, 0.1, 0.7]}>
                <boxGeometry args={[1.4, 0.2, 0.2]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} />
              </mesh>
              <mesh position={[0, 0.1, -0.7]}>
                <boxGeometry args={[1.4, 0.2, 0.2]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} />
              </mesh>
            </group>
          </group>
        </group>

        <mesh position={[-1.5, 2.5, -1.4]} castShadow>
          <boxGeometry args={[0.6, 4.8, 0.6]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
        
        {/* Cable Track (Visual detail) */}
        <mesh position={[-1.2, 3.5, -0.8]}>
          <boxGeometry args={[0.1, 0.4, 1.2]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        
        {/* Linear Rails Z-Axis */}
        <mesh position={[-0.4, 2.5, -1.5]}>
          <boxGeometry args={[0.05, 4.5, 0.1]} />
          <meshStandardMaterial color="#94a3b8" metalness={1} />
        </mesh>
        <mesh position={[0.4, 2.5, -1.5]}>
          <boxGeometry args={[0.05, 4.5, 0.1]} />
          <meshStandardMaterial color="#94a3b8" metalness={1} />
        </mesh>

        <group position={[0, 3.2, -0.6]}>
          <mesh position={[0, 0, -0.4]} castShadow>
            <boxGeometry args={[1.6, 1.4, 1.4]} />
            <meshStandardMaterial ref={headMatRef} color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>

          {/* Cooling Fins / Motor Housing */}
          <mesh position={[0, 0.8, -0.4]}>
            <cylinderGeometry args={[0.5, 0.5, 0.6, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} />
          </mesh>

          <group position={[0.6, 0.7, 0]}>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.15, 16]} />
              <meshStandardMaterial color={healthColor} emissive={healthColor} emissiveIntensity={0.5} />
            </mesh>
          </group>
          
          <mesh ref={alarmLampRef} position={[0, 0.75, -0.4]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.25, 16]} />
            <meshStandardMaterial color="#220000" emissive="#ff0000" emissiveIntensity={0} />
          </mesh>

          <pointLight ref={hazardLightRef} position={[0, 1.5, 0.8]} color="#ff0000" intensity={0} distance={6} />

          <mesh 
            ref={spindleRef} 
            position={[0, -0.4, 0.4]} 
            castShadow
            onClick={(e) => { e.stopPropagation(); onSelectPart('spindle'); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered('spindle'); }}
            onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; setHovered(null); }}
          >
            <cylinderGeometry args={[0.35, 0.4, 0.8, 32]} />
            <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.1} />
          </mesh>

          <group 
            ref={bitRef} 
            position={[0, HOME_Y, 0.4]}
            onClick={(e) => { e.stopPropagation(); onSelectPart('bit'); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered('bit'); }}
            onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; setHovered(null); }}
          >
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.2, 0.15, 0.4, 16]} />
              <meshStandardMaterial color="#475569" metalness={1} roughness={0.1} />
            </mesh>
            <mesh position={[0, -0.2, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.8, 16]} />
              <meshStandardMaterial ref={bitMaterialRef} color="#cbd5e1" metalness={1} roughness={0.05} />
            </mesh>
          </group>
        </group>

        {/* Control Panel / HMI Unit */}
        <group position={[2.2, 2.5, 1.5]} rotation={[0, -Math.PI / 4, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 1.2, 0.8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[0.06, 0, 0]}>
            <planeGeometry args={[0.7, 1.1]} />
            <meshStandardMaterial color="#0f172a" emissive="#1e293b" emissiveIntensity={0.2} />
          </mesh>
          {/* Buttons */}
          <mesh position={[0.07, -0.4, 0.2]}>
            <sphereGeometry args={[0.03]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.07, -0.4, 0]}>
            <sphereGeometry args={[0.03]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
        </group>
      </group>

      {/* Step 4: Display Vibration Value Label */}
      <group position={[0, 4.5, 1.5]}>
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <group>
            <Text
              fontSize={0.15}
              color="#334155"
              anchorX="center"
              anchorY="middle"
              position={[0, 0.2, 0]}
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
            >
              Vibration RMS: {(twinState.telemetry?.vibration || 0).toFixed(3)}
            </Text>
            {twinState.machineType === 'CONVENTIONAL' && (
              <mesh position={[0, -0.1, 0]}>
                <boxGeometry args={[Math.min(2, (twinState.telemetry?.noiseLevel || 0) / 50), 0.05, 0.05]} />
                <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} />
              </mesh>
            )}
            {twinState.machineType === 'CONVENTIONAL' && (
              <Text
                fontSize={0.08}
                color="#3b82f6"
                anchorX="center"
                anchorY="middle"
                position={[0, -0.2, 0]}
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
              >
                Cutting Force Indicator
              </Text>
            )}
          </group>
        </Float>
      </group>

      <group ref={alarmRef} position={[0, 5.2, 0]}>
         <Float speed={8} rotationIntensity={0.8} floatIntensity={1.0}>
           <Text 
             fontSize={0.5} 
             color="#ff0000" 
             anchorX="center" 
             anchorY="middle"
             font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
             outlineWidth={0.05}
             outlineColor="#ffffff"
             textAlign="center"
           >
             {twinState.telemetry?.machineHealth < 50 ? "⚠ MACHINE HEALTH CRITICAL ⚠\nMAINTENANCE REQUIRED" : "⚠ CRITICAL VIBRATION DETECTED ⚠\nHALT PRODUCTION IMMEDIATELY"}
           </Text>
         </Float>
      </group>

      <pointLight position={[0, 4.2, 1]} intensity={2.5} distance={10} color={healthColor} />
      <spotLight position={[0, 5, 2]} angle={0.5} intensity={1} color="#ffffff" castShadow />
    </group>
  );
};
