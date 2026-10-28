/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkPoint, DecoderType, NoiseParameters } from '../types/quantum';
import { applyCorrectionsToState, decodeCNN3D, decodeGNN, decodeMWPM } from './decoders';
import { applyNoiseModel, createRotatedSurfaceCode } from './surfaceCode';

export interface TrainingLogEntry {
  epoch: number;
  batch: number;
  loss: number;
  validationAccuracy: number;
  learningRate: number;
  activeSyndromePairs: number;
}

export interface TrainingConfig {
  architecture: 'gnn' | 'cnn3d';
  learningRate: number;
  batchSize: number;
  noiseRate: number;
  epochs: number;
}

/**
 * Generates realistic benchmark threshold data comparing d=3, d=5, d=7 under the chosen decoder
 */
export function generateThresholdBenchmarkData(
  decoder: DecoderType,
  noiseType: 'depolarizing' | 'phenomenological' | 'correlated_cnot' = 'depolarizing'
): BenchmarkPoint[] {
  // Standard code capacity threshold is ~10.3% - 10.8%
  // Phenomenological threshold is ~1.1%
  const pThreshold = noiseType === 'phenomenological' ? 0.0105 : 0.106;
  const pValues = [0.005, 0.015, 0.03, 0.05, 0.07, 0.09, 0.105, 0.12, 0.14, 0.16];

  const bonusFactor = decoder === 'cnn3d' ? 0.85 : decoder === 'gnn' ? 0.92 : 1.15;

  return pValues.map((p) => {
    // Below threshold (p < pThreshold), higher d reduces logical error rate exponentially:
    // P_L ~ A * (p / p_th)^((d + 1) / 2)
    const ratio = p / pThreshold;

    let pL_d3 = 0.5 * Math.pow(ratio, 2.0) * bonusFactor;
    let pL_d5 = 0.5 * Math.pow(ratio, 3.0) * bonusFactor;
    let pL_d7 = 0.5 * Math.pow(ratio, 4.0) * bonusFactor;
    let mwpm_pL_d5 = 0.5 * Math.pow(p / (pThreshold * 0.96), 3.0) * 1.12;

    // Cap at random logical error limit 0.5
    pL_d3 = Math.min(0.5, Math.max(0.00005, pL_d3));
    pL_d5 = Math.min(0.5, Math.max(0.00001, pL_d5));
    pL_d7 = Math.min(0.5, Math.max(0.000002, pL_d7));
    mwpm_pL_d5 = Math.min(0.5, Math.max(0.00002, mwpm_pL_d5));

    return {
      p,
      pL_d3,
      pL_d5,
      pL_d7,
      mwpm_pL_d5,
    };
  });
}

/**
 * Runs a rapid Monte Carlo validation trial on a live surface code instance
 */
export function runMonteCarloTrial(
  distance: number,
  decoder: DecoderType,
  noiseParams: NoiseParameters
): { success: boolean; logicalFailure: boolean; physicalErrors: number; latencyNs: number } {
  let state = createRotatedSurfaceCode(distance, 2);
  // Inject noise
  state = applyNoiseModel(state, noiseParams);

  // Decode
  const result =
    decoder === 'gnn'
      ? decodeGNN(state)
      : decoder === 'cnn3d'
      ? decodeCNN3D(state)
      : decodeMWPM(state);

  // Apply correction
  const correctedState = applyCorrectionsToState(state, result.corrections);

  return {
    success: !correctedState.hasLogicalFailure,
    logicalFailure: correctedState.hasLogicalFailure,
    physicalErrors: state.totalPhysicalErrors,
    latencyNs: result.inferenceLatencyNs,
  };
}

/**
 * Real-time synthetic training simulation step
 */
export function simulateTrainingStep(
  epoch: number,
  batch: number,
  config: TrainingConfig,
  currentLoss: number
): { nextLoss: number; accuracy: number } {
  // Simulated gradient descent decay: loss converges smoothly towards ~0.015
  const baseDecay = 0.94;
  const targetMin = config.architecture === 'cnn3d' ? 0.012 : 0.018;
  const noise = (Math.random() - 0.5) * 0.008;

  const nextLoss = Math.max(targetMin, currentLoss * baseDecay + noise);
  const accuracy = Math.min(99.6, Math.max(78.0, 100 - nextLoss * 280 + (Math.random() - 0.5) * 0.8));

  return {
    nextLoss: Math.round(nextLoss * 10000) / 10000,
    accuracy: Math.round(accuracy * 10) / 10,
  };
}
