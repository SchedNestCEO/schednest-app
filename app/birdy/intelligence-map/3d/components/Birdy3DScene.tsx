"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import BirdyNodeCloud from "./BirdyNodeCloud";
import BirdyConnections from "./BirdyConnections";

function BirdyScaffold() {
  return (
    <group rotation={[0, 0, 0]}>
      <mesh position={[0, 0.15, 0]} scale={[1.15, 1.55, 0.75]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color="#39e4c4"
          wireframe
          transparent
          opacity={0.55}
        />
      </mesh>

      <mesh position={[0.08, 1.55, 0.02]} scale={[0.72, 0.7, 0.65]}>
        <sphereGeometry args={[1, 40, 40]} />
        <meshStandardMaterial
          color="#27d5ff"
          wireframe
          transparent
          opacity={0.65}
        />
      </mesh>

      <mesh
        position={[0.82, 1.62, 0]}
        rotation={[0, 0, -0.16]}
        scale={[1.25, 0.18, 0.22]}
      >
        <coneGeometry args={[1, 2.8, 24]} />
        <meshStandardMaterial
          color="#f4b942"
          wireframe
          transparent
          opacity={0.65}
        />
      </mesh>

      <group position={[-0.9, 0.75, 0]} rotation={[0, 0, 0.42]}>
        <mesh scale={[2.4, 0.46, 0.32]}>
          <sphereGeometry args={[1, 52, 28]} />
          <meshStandardMaterial
            color="#20d8e9"
            wireframe
            transparent
            opacity={0.55}
          />
        </mesh>
      </group>

      <group position={[0.9, 0.75, 0]} rotation={[0, 0, -0.42]}>
        <mesh scale={[2.4, 0.46, 0.32]}>
          <sphereGeometry args={[1, 52, 28]} />
          <meshStandardMaterial
            color="#ff9d24"
            wireframe
            transparent
            opacity={0.55}
          />
        </mesh>
      </group>

      <group position={[0, -1.3, 0]}>
        <mesh
          position={[-0.35, -0.65, 0]}
          rotation={[0, 0, 0.18]}
          scale={[0.24, 1.5, 0.18]}
        >
          <sphereGeometry args={[1, 28, 28]} />
          <meshStandardMaterial
            color="#21d6ca"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>

        <mesh
          position={[0.35, -0.65, 0]}
          rotation={[0, 0, -0.18]}
          scale={[0.24, 1.5, 0.18]}
        >
          <sphereGeometry args={[1, 28, 28]} />
          <meshStandardMaterial
            color="#e5a22e"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}

export default function Birdy3DScene() {
  return (
    <main
      style={{
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at center, #07191c 0%, #020609 55%, #000 100%)",
      }}
    >
      <Canvas
        style={{
          width: "100%",
          height: "100%",
        }}
        camera={{
          position: [0, 0.4, 8.5],
          fov: 42,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#020609"]} />

        <ambientLight intensity={1.2} />
        <directionalLight
          position={[4, 6, 6]}
          intensity={2.2}
          color="#dffcff"
        />
        <directionalLight
          position={[-5, 1, 3]}
          intensity={1.4}
          color="#25dce8"
        />
        <directionalLight
          position={[5, -1, 3]}
          intensity={1.3}
          color="#ff9d24"
        />

        {/* Temporary scaffold hidden during connection inspection. */}
        <BirdyConnections />
        <BirdyNodeCloud />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={4.5}
          maxDistance={15}
          target={[0, 0.25, 0]}
        />
      </Canvas>
    </main>
  );
}
