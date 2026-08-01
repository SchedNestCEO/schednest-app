import * as THREE from "three";

export type BirdyRegionName =
  | "body"
  | "head"
  | "leftWing"
  | "rightWing"
  | "leftTail"
  | "rightTail";

type RegionDefinition = {
  name: BirdyRegionName;
  count: number;
  center: [number, number, number];
  scale: [number, number, number];
  rotationZ?: number;
  maximumConnectionDistance: number;
  maximumConnectionsPerNode: number;
};

export type BirdyGraphNode = {
  id: string;
  region: BirdyRegionName;
  position: THREE.Vector3;
  scale: number;
};

export type BirdyGraphData = {
  nodes: BirdyGraphNode[];
  connectionPositions: Float32Array;
};

const REGIONS: RegionDefinition[] = [
  {
    name: "body",
    count: 360,
    center: [0, 0.15, 0],
    scale: [1.1, 1.5, 0.68],
    maximumConnectionDistance: 0.42,
    maximumConnectionsPerNode: 2,
  },
  {
    name: "head",
    count: 130,
    center: [0.08, 1.55, 0.02],
    scale: [0.68, 0.66, 0.6],
    maximumConnectionDistance: 0.34,
    maximumConnectionsPerNode: 2,
  },
  {
    name: "leftWing",
    count: 310,
    center: [-1.22, 0.78, 0],
    scale: [2.15, 0.42, 0.3],
    rotationZ: 0.42,
    maximumConnectionDistance: 0.48,
    maximumConnectionsPerNode: 3,
  },
  {
    name: "rightWing",
    count: 310,
    center: [1.22, 0.78, 0],
    scale: [2.15, 0.42, 0.3],
    rotationZ: -0.42,
    maximumConnectionDistance: 0.48,
    maximumConnectionsPerNode: 3,
  },
  {
    name: "leftTail",
    count: 95,
    center: [-0.34, -1.95, 0],
    scale: [0.22, 1.48, 0.16],
    rotationZ: 0.18,
    maximumConnectionDistance: 0.34,
    maximumConnectionsPerNode: 2,
  },
  {
    name: "rightTail",
    count: 95,
    center: [0.34, -1.95, 0],
    scale: [0.22, 1.48, 0.16],
    rotationZ: -0.18,
    maximumConnectionDistance: 0.34,
    maximumConnectionsPerNode: 2,
  },
];

function seededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomPointInEllipsoid(
  random: () => number,
  scale: [number, number, number],
) {
  let x = 0;
  let y = 0;
  let z = 0;

  do {
    x = random() * 2 - 1;
    y = random() * 2 - 1;
    z = random() * 2 - 1;
  } while (x * x + y * y + z * z > 1);

  return new THREE.Vector3(
    x * scale[0],
    y * scale[1],
    z * scale[2],
  );
}

function buildNodes(random: () => number) {
  const nodes: BirdyGraphNode[] = [];
  const rotationAxis = new THREE.Vector3(0, 0, 1);

  for (const region of REGIONS) {
    for (let index = 0; index < region.count; index += 1) {
      const position = randomPointInEllipsoid(
        random,
        region.scale,
      );

      if (region.rotationZ) {
        position.applyAxisAngle(
          rotationAxis,
          region.rotationZ,
        );
      }

      position.add(new THREE.Vector3(...region.center));

      nodes.push({
        id: `${region.name}-${index}`,
        region: region.name,
        position,
        scale: 0.012 + random() * 0.018,
      });
    }
  }

  return nodes;
}

function buildConnectionPositions(nodes: BirdyGraphNode[]) {
  const positions: number[] = [];

  for (const region of REGIONS) {
    const regionNodes = nodes.filter(
      (node) => node.region === region.name,
    );

    regionNodes.forEach((node, nodeIndex) => {
      const nearestNodes = regionNodes
        .map((candidate, candidateIndex) => ({
          candidate,
          candidateIndex,
          distance: node.position.distanceTo(
            candidate.position,
          ),
        }))
        .filter(
          ({ candidateIndex, distance }) =>
            candidateIndex > nodeIndex &&
            distance <= region.maximumConnectionDistance,
        )
        .sort((left, right) => left.distance - right.distance)
        .slice(0, region.maximumConnectionsPerNode);

      nearestNodes.forEach(({ candidate }) => {
        positions.push(
          node.position.x,
          node.position.y,
          node.position.z,
          candidate.position.x,
          candidate.position.y,
          candidate.position.z,
        );
      });
    });
  }

  return new Float32Array(positions);
}

function buildBirdyGraph(): BirdyGraphData {
  const random = seededRandom(82026);
  const nodes = buildNodes(random);

  return {
    nodes,
    connectionPositions: buildConnectionPositions(nodes),
  };
}

export const BIRDY_GRAPH = buildBirdyGraph();
