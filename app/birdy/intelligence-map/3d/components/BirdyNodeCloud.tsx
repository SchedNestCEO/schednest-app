"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { BIRDY_GRAPH } from "./birdyGraphData";

export default function BirdyNodeCloud() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    const transform = new THREE.Object3D();

    BIRDY_GRAPH.nodes.forEach((node, index) => {
      transform.position.copy(node.position);
      transform.scale.setScalar(node.scale);
      transform.updateMatrix();

      mesh.setMatrixAt(index, transform.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        undefined,
        undefined,
        BIRDY_GRAPH.nodes.length,
      ]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 8]} />

      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={1}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
