"use client";

import * as THREE from "three";

import { BIRDY_GRAPH } from "./birdyGraphData";

export default function BirdyConnections() {
  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[
            BIRDY_GRAPH.connectionPositions,
            3,
          ]}
        />
      </bufferGeometry>

      <lineBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.28}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  );
}
