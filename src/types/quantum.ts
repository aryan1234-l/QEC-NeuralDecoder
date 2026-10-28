/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PauliType = 'I' | 'X' | 'Y' | 'Z';

export type StabilizerType = 'X' | 'Z';

export interface DataQubit {
  id: string;
  r: number;
  c: number;
  x: number;
  y: number;
  error: PauliType;
  correction: PauliType;
  effectiveError: PauliType; // error combined with correction
}

export interface Stabilizer {
  id: string;
  r: number; // grid position
  c: number;
  type: StabilizerType; // 'X' (star/vertex) measures Z errors; 'Z' (face/plaquette) measures X errors
  dataQubits: string[]; // IDs of neighboring data qubits
  weight: 2 | 4; // boundary vs bulk
  value: number; // +1 or -1 (measured outcome)
  previousValue: number;
  isDefect: boolean; // non-trivial detection event (flipped from previous round)
  measurementError?: boolean;
}

export interface SpacetimeDefect {
  id: string;
  r: number;
  c: number;
  t: number;
  type: StabilizerType;
  stabilizerId: string;
}

export interface ErrorChainEdge {
  fromId: string;
  toId: string;
  pauli: PauliType;
  isCorrection: boolean;
  isTrueError: boolean;
}

export interface SurfaceCodeState {
  distance: number;
  rounds: number;
  currentRound: number;
  dataQubits: DataQubit[];
  stabilizers: Stabilizer[];
  spacetimeHistory: {
    round: number;
    stabilizerValues: Record<string, number>;
    defects: SpacetimeDefect[];
  }[];
  logicalErrorX: boolean;
  logicalErrorZ: boolean;
  hasLogicalFailure: boolean;
  totalPhysicalErrors: number;
  correctedDefects: number;
}

export type NoiseModelType = 'depolarizing' | 'phenomenological' | 'correlated_cnot';

export interface NoiseParameters {
  physicalRate: number; // p: 0.001 - 0.15
  measurementRate: number; // q: 0.001 - 0.05
  modelType: NoiseModelType;
  twoQubitErrorMultiplier: number;
}

export type DecoderType = 'gnn' | 'cnn3d' | 'mwpm';

export interface DecoderPerformance {
  decoderType: DecoderType;
  inferenceLatencyNs: number; // nanoseconds
  accuracy: number; // % syndrome matching
  logicalErrorRate: number; // PL
  thresholdPhysicalRate: number; // p_th estimate
  fpgaPowerMw: number;
  memoryFootprintKb: number;
}

export interface BenchmarkPoint {
  p: number; // physical error rate
  pL_d3: number; // logical error rate for d=3
  pL_d5: number; // logical error rate for d=5
  pL_d7: number; // logical error rate for d=7
  mwpm_pL_d5: number;
}

export interface NeuralLayerInfo {
  name: string;
  type: string;
  shape: string;
  parameters: number;
  activation: string;
}

export interface GnnNode {
  id: string;
  pos: [number, number, number]; // r, c, t
  type: StabilizerType;
  embedding: number[];
  attentionScore: number;
}

export interface GnnEdge {
  source: string;
  target: string;
  weight: number;
  distance: number;
  isPredictedMatch: boolean;
}
