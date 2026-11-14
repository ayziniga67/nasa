import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Trail, Html } from "@react-three/drei";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Design } from "./sim";

type ObjRef = { current: THREE.Group | null };
type NumRef = { current: number };

/* ---------------- Spacecraft model (built from the player's design) ---------------- */

const INSTR_COLOR: Record<string, string> = { camera: "#e07a5f", spectro: "#81b29a", atmos: "#a0c4ff" };

export function Spacecraft({ design }: { design: Design }) {
  const tanks: { r: number; len: number }[] = [
    ...Array.from({ length: design.tanks.large ?? 0 }, () => ({ r: 0.3, len: 0.55 })),
    ...Array.from({ length: design.tanks.small ?? 0 }, () => ({ r: 0.22, len: 0.35 })),
  ];

  let z = -0.45;
  const tankMeshes = tanks.map((t, i) => {
    const pos = z - t.len / 2;
    z -= t.len + 0.05;
    return (
      <mesh key={i} position={[0, 0, pos]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[t.r, t.r, t.len, 24]} />
        <meshStandardMaterial color="#cfd6e4" metalness={0.6} roughness={0.35} />
      </mesh>
    );
  });
  const nozzleZ = z - 0.1;
  const panels = Math.min(design.panels, 8);
  const ion = design.engineId === "ion";
  const strong = design.antennaId === "strong";
  const center = (0.4 + (nozzleZ - 0.2)) / 2;

  return (
    <group position={[0, 0, -center]}>
      {/* bus */}
      <mesh>
        <boxGeometry args={[0.6, 0.5, 0.8]} />
        <meshStandardMaterial color="#c9a24b" metalness={0.7} roughness={0.4} />
      </mesh>
      {tankMeshes}
      {/* engine nozzle */}
      <mesh position={[0, 0, nozzleZ]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.22, 0.4, 20, 1, true]} />
        <meshStandardMaterial
          color={ion ? "#38bdf8" : "#444"} emissive={ion ? "#38bdf8" : "#000"}
          emissiveIntensity={ion ? 0.8 : 0} side={THREE.DoubleSide} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* solar panels */}
      {Array.from({ length: panels }, (_, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const row = Math.floor(i / 2);
        return (
          <group key={i} position={[side * 1.0, 0, 0.25 - row * 0.45]}>
            <mesh>
              <boxGeometry args={[0.9, 0.03, 0.4]} />
              <meshStandardMaterial color="#1d3f9f" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[-side * 0.5, 0, 0]}>
              <boxGeometry args={[0.12, 0.03, 0.03]} />
              <meshStandardMaterial color="#999" />
            </mesh>
          </group>
        );
      })}
      {/* batteries */}
      {Array.from({ length: Math.min(design.batteries, 4) }, (_, i) => (
        <mesh key={i} position={[-0.2 + i * 0.14, -0.32, 0.1]}>
          <boxGeometry args={[0.1, 0.1, 0.3]} />
          <meshStandardMaterial color="#4ade80" emissive="#166534" />
        </mesh>
      ))}
      {/* antenna dish */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
      <mesh position={[0, 0.5, 0.1]} rotation={[-Math.PI / 3, 0, 0]}>
        <coneGeometry args={[strong ? 0.38 : 0.2, 0.14, 24, 1, true]} />
        <meshStandardMaterial color="#eee" side={THREE.DoubleSide} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* instruments */}
      {design.instruments.map((id, i) => (
        <mesh key={id} position={[-0.2 + i * 0.2, 0, 0.45]}>
          <boxGeometry args={[0.15, 0.15, 0.12]} />
          <meshStandardMaterial color={INSTR_COLOR[id] ?? "#ddd"} emissive={INSTR_COLOR[id] ?? "#000"} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function WorkshopScene({ design }: { design: Design }) {
  return (
    <Canvas camera={{ position: [3.5, 2.2, 4.5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#05070f"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 6, 5]} intensity={2} />
      <directionalLight position={[-5, -2, -4]} intensity={0.6} color="#88aaff" />
      <Stars radius={60} depth={30} count={2500} factor={3} fade />
      <Spacecraft design={design} />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1.2} minDistance={2.5} maxDistance={10} />
    </Canvas>
  );
}

/* ---------------- Solar system / mission scenes ---------------- */

function Orbiting({ radius, speed, phase = 0, groupRef, children }: {
  radius: number; speed: number; phase?: number; groupRef?: ObjRef; children: ReactNode;
}) {
  const own = useRef<THREE.Group>(null);
  const ref = groupRef ?? own;
  useFrame(({ clock }) => {
    const a = phase + clock.elapsedTime * speed;
    ref.current?.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  });
  return <group ref={ref}>{children}</group>;
}

function Planet({ size, color, label, emissive = "#000000", intensity = 0 }: {
  size: number; color: string; label?: string; emissive?: string; intensity?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (mesh.current) mesh.current.rotation.y += dt * 0.3; });
  return (
    <>
      <mesh ref={mesh}>
        <sphereGeometry args={[size, 48, 48]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={intensity} roughness={0.9} />
      </mesh>
      {label && (
        <Html center position={[0, size + 0.45, 0]} style={{ pointerEvents: "none" }}>
          <div className="tag3d">{label}</div>
        </Html>
      )}
    </>
  );
}

function Ring({ r }: { r: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r - 0.015, r + 0.015, 160]} />
      <meshBasicMaterial color="#5b6b9a" transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Probe({ from, to, arc, scale, progressRef, failAt, design }: {
  from: ObjRef; to: ObjRef; arc: number; scale: number;
  progressRef: NumRef; failAt: number | null; design: Design;
}) {
  const group = useRef<THREE.Group>(null);
  const boom = useRef<THREE.Mesh>(null);
  const v = useMemo(() => ({
    a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(),
    p: new THREE.Vector3(), q: new THREE.Vector3(),
  }), []);

  const bez = (t: number, out: THREE.Vector3) => {
    v.c.copy(v.a).add(v.b).multiplyScalar(0.5);
    v.c.y += arc;
    const u = 1 - t;
    return out.set(0, 0, 0).addScaledVector(v.a, u * u).addScaledVector(v.c, 2 * u * t).addScaledVector(v.b, t * t);
  };

  useFrame(({ clock }) => {
    if (!group.current || !from.current || !to.current) return;
    from.current.getWorldPosition(v.a);
    to.current.getWorldPosition(v.b);
    const limit = failAt ?? 1;
    const t = Math.min(progressRef.current, limit);
    bez(t, v.p);
    bez(Math.min(1, t + 0.01), v.q);
    group.current.position.copy(v.p);
    if (v.q.distanceToSquared(v.p) > 1e-8) group.current.lookAt(v.q);

    const crashed = failAt !== null && progressRef.current >= failAt;
    if (boom.current) {
      boom.current.visible = crashed;
      if (crashed) {
        const grow = Math.min(1, (progressRef.current - (failAt ?? 0)) * 15);
        boom.current.scale.setScalar((0.2 + grow) * (1 + Math.sin(clock.elapsedTime * 12) * 0.15));
      }
    }
  });

  return (
    <group ref={group}>
      <group scale={scale}><Spacecraft design={design} /></group>
      <Trail width={1.5} length={7} color="#7dd3fc" attenuation={(t) => t * t}>
        <mesh>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#7dd3fc" />
        </mesh>
      </Trail>
      <mesh ref={boom} visible={false}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshBasicMaterial color="#ff5a36" transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

function SolarSystem({ showProbe, progressRef, failAt, design }: {
  showProbe: boolean; progressRef: NumRef; failAt: number | null; design: Design;
}) {
  const earth = useRef<THREE.Group>(null);
  const mars = useRef<THREE.Group>(null);
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight intensity={3} decay={0} color="#fff3d6" />
      <Planet size={2} color="#ffb347" emissive="#ff9a1f" intensity={1.2} label="Sun" />
      <Ring r={3.2} /><Ring r={5.4} /><Ring r={8} /><Ring r={12.2} /><Ring r={19} />
      <Orbiting radius={3.2} speed={0.15} phase={1}><Planet size={0.18} color="#9a9a9a" label="Mercury" /></Orbiting>
      <Orbiting radius={5.4} speed={0.08} phase={3}><Planet size={0.38} color="#e0b878" label="Venus" /></Orbiting>
      <Orbiting radius={8} speed={0.04} phase={0} groupRef={earth}><Planet size={0.5} color="#2f6fd0" label="Earth" /></Orbiting>
      <Orbiting radius={12.2} speed={0.021} phase={0.9} groupRef={mars}><Planet size={0.3} color="#c1440e" label="Mars" /></Orbiting>
      <Orbiting radius={19} speed={0.01} phase={2}><Planet size={1.3} color="#c9a27a" label="Jupiter" /></Orbiting>
      {showProbe && <Probe from={earth} to={mars} arc={3} scale={0.2} progressRef={progressRef} failAt={failAt} design={design} />}
    </>
  );
}

function EarthMoon({ progressRef, failAt, design }: { progressRef: NumRef; failAt: number | null; design: Design }) {
  const earthRef = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Group>(null);
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 4, 6]} intensity={2.6} />
      <group ref={earthRef}><Planet size={1} color="#2f6fd0" label="Earth" /></group>
      <Ring r={6} />
      <Orbiting radius={6} speed={0.08} phase={0.5} groupRef={moon}><Planet size={0.27} color="#b9b9b9" label="Moon" /></Orbiting>
      <Probe from={earthRef} to={moon} arc={1.6} scale={0.28} progressRef={progressRef} failAt={failAt} design={design} />
    </>
  );
}

export interface MissionSceneProps {
  mode: "menu" | "moon" | "mars";
  progressRef: NumRef;
  failAt: number | null;
  design: Design;
}

export function MissionScene({ mode, progressRef, failAt, design }: MissionSceneProps) {
  const cam: [number, number, number] = mode === "moon" ? [0, 6, 12] : [0, 15, 24];
  return (
    <Canvas key={mode} camera={{ position: cam, fov: 50, far: 500 }} dpr={[1, 2]}>
      <color attach="background" args={["#03040a"]} />
      <Stars radius={150} depth={60} count={5000} factor={4} fade />
      {mode === "moon"
        ? <EarthMoon progressRef={progressRef} failAt={failAt} design={design} />
        : <SolarSystem showProbe={mode === "mars"} progressRef={progressRef} failAt={failAt} design={design} />}
      <OrbitControls enablePan={false} autoRotate={mode === "menu"} autoRotateSpeed={0.4} maxDistance={60} />
    </Canvas>
  );
}
