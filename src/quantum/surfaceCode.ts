/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DataQubit,
  NoiseParameters,
  PauliType,
  SpacetimeDefect,
  Stabilizer,
  StabilizerType,
  SurfaceCodeState,
} from '../types/quantum';

/**
 * Pauli multiplication rules (ignoring global phases since we track Pauli error channels)
 */
export function multiplyPauli(p1: PauliType, p2: PauliType): PauliType {
  if (p1 === 'I') return p2;
  if (p2 === 'I') return p1;
  if (p1 === p2) return 'I';

  if ((p1 === 'X' && p2 === 'Z') || (p1 === 'Z' && p2 === 'X')) return 'Y';
  if ((p1 === 'X' && p2 === 'Y') || (p1 === 'Y' && p2 === 'X')) return 'Z';
  if ((p1 === 'Y' && p2 === 'Z') || (p1 === 'Z' && p2 === 'Y')) return 'X';

  return 'I';
}

export function hasBitFlipComponent(p: PauliType): boolean {
  return p === 'X' || p === 'Y';
}

export function hasPhaseFlipComponent(p: PauliType): boolean {
  return p === 'Z' || p === 'Y';
}

/**
 * Generates the geometry of a rotated planar surface code of odd distance d.
 * Data qubits are on a d x d lattice.
 * Stabilizers (d^2 - 1 in total) alternate X and Z types in the checkerboard pattern.
 */
export function createRotatedSurfaceCode(distance: number, totalRounds: number = 4): SurfaceCodeState {
  const d = Math.max(3, distance % 2 === 0 ? distance + 1 : distance);
  const dataQubits: DataQubit[] = [];
  const stabilizers: Stabilizer[] = [];

  // 1. Create d x d data qubits
  for (let r = 0; r < d; r++) {
    for (let c = 0; c < d; c++) {
      dataQubits.push({
        id: `dq_${r}_${c}`,
        r,
        c,
        x: c - (d - 1) / 2,
        y: -(r - (d - 1) / 2),
        error: 'I',
        correction: 'I',
        effectiveError: 'I',
      });
    }
  }

  // 2. Create stabilizers on the dual coordinates (r + 0.5, c + 0.5)
  // For rotated surface code, (r, c) ranges from -1 to d-1
  let stabCount = 0;
  for (let r = -1; r < d; r++) {
    for (let c = -1; c < d; c++) {
      // Checkerboard determination
      const isEven = (r + c + 2) % 2 === 0;
      const type: StabilizerType = isEven ? 'X' : 'Z';

      // Find neighboring data qubits
      // A plaquette at (r+0.5, c+0.5) neighbors:
      // top-left (r, c), top-right (r, c+1), bottom-left (r+1, c), bottom-right (r+1, c+1)
      const potentialNeighbors = [
        { r: r, c: c },
        { r: r, c: c + 1 },
        { r: r + 1, c: c },
        { r: r + 1, c: c + 1 },
      ];

      const validNeighbors = potentialNeighbors
        .filter((pos) => pos.r >= 0 && pos.r < d && pos.c >= 0 && pos.c < d)
        .map((pos) => `dq_${pos.r}_${pos.c}`);

      // In rotated surface code:
      // Weight 4 stabilizers are in the bulk.
      // Weight 2 boundary stabilizers occur along appropriate boundaries:
      // - Z stabilizers touch top or bottom boundaries (r == -1 or r == d - 1)
      // - X stabilizers touch left or right boundaries (c == -1 or c == d - 1)
      const isBulk = validNeighbors.length === 4;
      const isBoundaryZ =
        validNeighbors.length === 2 &&
        type === 'Z' &&
        (r === -1 || r === d - 1) &&
        c >= 0 &&
        c < d - 1;
      const isBoundaryX =
        validNeighbors.length === 2 &&
        type === 'X' &&
        (c === -1 || c === d - 1) &&
        r >= 0 &&
        r < d - 1;

      if (isBulk || isBoundaryZ || isBoundaryX) {
        stabilizers.push({
          id: `stab_${type}_${r + 0.5}_${c + 0.5}`,
          r: r + 0.5,
          c: c + 0.5,
          type,
          dataQubits: validNeighbors,
          weight: validNeighbors.length as 2 | 4,
          value: 1,
          previousValue: 1,
          isDefect: false,
        });
        stabCount++;
      }
    }
  }

  const initialHistory = [
    {
      round: 0,
      stabilizerValues: stabilizers.reduce((acc, s) => ({ ...acc, [s.id]: 1 }), {}),
      defects: [] as SpacetimeDefect[],
    },
  ];

  return {
    distance: d,
    rounds: totalRounds,
    currentRound: 0,
    dataQubits,
    stabilizers,
    spacetimeHistory: initialHistory,
    logicalErrorX: false,
    logicalErrorZ: false,
    hasLogicalFailure: false,
    totalPhysicalErrors: 0,
    correctedDefects: 0,
  };
}

/**
 * Calculates current stabilizer measurements (+1 or -1) from physical data qubit errors.
 * Also models measurement bit-flip readout noise if requested.
 */
export function measureStabilizers(
  state: SurfaceCodeState,
  measurementNoiseRate: number = 0
): { updatedStabilizers: Stabilizer[]; defects: SpacetimeDefect[] } {
  const qubitMap = new Map<string, DataQubit>();
  for (const q of state.dataQubits) {
    qubitMap.set(q.id, q);
  }

  const defects: SpacetimeDefect[] = [];

  const updatedStabilizers = state.stabilizers.map((s) => {
    let anticommuteCount = 0;

    for (const qId of s.dataQubits) {
      const q = qubitMap.get(qId);
      if (!q) continue;

      const eff = q.effectiveError;
      if (s.type === 'X') {
        // X stabilizer anti-commutes with Z or Y errors
        if (hasPhaseFlipComponent(eff)) anticommuteCount++;
      } else {
        // Z stabilizer anti-commutes with X or Y errors
        if (hasBitFlipComponent(eff)) anticommuteCount++;
      }
    }

    let rawValue = anticommuteCount % 2 === 1 ? -1 : 1;
    let hadMeasurementError = false;

    // Measurement noise: flips the readout outcome
    if (measurementNoiseRate > 0 && Math.random() < measurementNoiseRate) {
      rawValue = -rawValue;
      hadMeasurementError = true;
    }

    // A detection event (defect) is non-trivial when outcome differs from previous round
    const isDefect = rawValue !== s.previousValue;

    if (isDefect) {
      defects.push({
        id: `defect_${s.id}_r${state.currentRound}`,
        r: s.r,
        c: s.c,
        t: state.currentRound,
        type: s.type,
        stabilizerId: s.id,
      });
    }

    return {
      ...s,
      value: rawValue,
      isDefect,
      measurementError: hadMeasurementError,
    };
  });

  return { updatedStabilizers, defects };
}

/**
 * Applies a single physical Pauli error to a specific data qubit
 */
export function injectQubitError(
  state: SurfaceCodeState,
  qubitId: string,
  errorType: PauliType
): SurfaceCodeState {
  const updatedQubits = state.dataQubits.map((q) => {
    if (q.id === qubitId) {
      const newErr = multiplyPauli(q.error, errorType);
      const effective = multiplyPauli(newErr, q.correction);
      return {
        ...q,
        error: newErr,
        effectiveError: effective,
      };
    }
    return q;
  });

  const tempState = { ...state, dataQubits: updatedQubits };
  const { updatedStabilizers, defects } = measureStabilizers(tempState, 0);

  const totalErrors = updatedQubits.filter((q) => q.error !== 'I').length;
  const { logicalX, logicalZ } = evaluateLogicalObservables(updatedQubits, state.distance);

  return {
    ...tempState,
    stabilizers: updatedStabilizers,
    totalPhysicalErrors: totalErrors,
    logicalErrorX: logicalX,
    logicalErrorZ: logicalZ,
    hasLogicalFailure: logicalX || logicalZ,
    spacetimeHistory: [
      ...state.spacetimeHistory.slice(0, -1),
      {
        round: state.currentRound,
        stabilizerValues: updatedStabilizers.reduce((acc, s) => ({ ...acc, [s.id]: s.value }), {}),
        defects,
      },
    ],
  };
}

/**
 * Applies random physical noise across all qubits according to realistic noise models:
 * - depolarizing noise (p)
 * - phenomenological noise (p + measurement q)
 * - correlated 2-qubit CNOT errors
 */
export function applyNoiseModel(
  state: SurfaceCodeState,
  params: NoiseParameters
): SurfaceCodeState {
  const d = state.distance;
  const p = params.physicalRate;
  const q = params.measurementRate;

  const newQubits = state.dataQubits.map((qubit) => {
    let errToAdd: PauliType = 'I';

    if (params.modelType === 'depolarizing') {
      const rand = Math.random();
      if (rand < p) {
        // Equal probability of X, Y, Z (p/3 each)
        if (rand < p / 3) errToAdd = 'X';
        else if (rand < (2 * p) / 3) errToAdd = 'Y';
        else errToAdd = 'Z';
      }
    } else if (params.modelType === 'phenomenological') {
      // Independent bit-flip and phase-flip channels
      const randX = Math.random();
      const randZ = Math.random();
      const hasX = randX < p;
      const hasZ = randZ < p;

      if (hasX && hasZ) errToAdd = 'Y';
      else if (hasX) errToAdd = 'X';
      else if (hasZ) errToAdd = 'Z';
    } else if (params.modelType === 'correlated_cnot') {
      // Base error + correlated 2-qubit spread
      const rand = Math.random();
      if (rand < p) {
        errToAdd = Math.random() < 0.5 ? 'X' : 'Z';
      }
    }

    const combinedError = multiplyPauli(qubit.error, errToAdd);
    const effective = multiplyPauli(combinedError, qubit.correction);

    return {
      ...qubit,
      error: combinedError,
      effectiveError: effective,
    };
  });

  // Correlated CNOT spreading simulation: if correlated_cnot is selected
  if (params.modelType === 'correlated_cnot') {
    for (let r = 0; r < d; r++) {
      for (let c = 0; c < d - 1; c++) {
        if (Math.random() < p * params.twoQubitErrorMultiplier) {
          const idx1 = r * d + c;
          const idx2 = r * d + (c + 1);
          newQubits[idx1].error = multiplyPauli(newQubits[idx1].error, 'Z');
          newQubits[idx2].error = multiplyPauli(newQubits[idx2].error, 'Z');
          newQubits[idx1].effectiveError = multiplyPauli(newQubits[idx1].error, newQubits[idx1].correction);
          newQubits[idx2].effectiveError = multiplyPauli(newQubits[idx2].error, newQubits[idx2].correction);
        }
      }
    }
  }

  // Advance time round
  const nextRound = state.currentRound + 1;
  const tempState = {
    ...state,
    currentRound: nextRound,
    dataQubits: newQubits,
    stabilizers: state.stabilizers.map((s) => ({ ...s, previousValue: s.value })),
  };

  const { updatedStabilizers, defects } = measureStabilizers(tempState, q);
  const totalErrors = newQubits.filter((qubit) => qubit.error !== 'I').length;
  const { logicalX, logicalZ } = evaluateLogicalObservables(newQubits, d);

  return {
    ...tempState,
    stabilizers: updatedStabilizers,
    totalPhysicalErrors: totalErrors,
    logicalErrorX: logicalX,
    logicalErrorZ: logicalZ,
    hasLogicalFailure: logicalX || logicalZ,
    spacetimeHistory: [
      ...state.spacetimeHistory,
      {
        round: nextRound,
        stabilizerValues: updatedStabilizers.reduce((acc, s) => ({ ...acc, [s.id]: s.value }), {}),
        defects,
      },
    ],
  };
}

/**
 * Checks logical non-trivial operator parity:
 * In rotated planar surface code:
 * Logical X_L is a horizontal chain of X operators on all data qubits in a row (e.g. row 0 or row (d-1)/2).
 * Logical Z_L is a vertical chain of Z operators on all data qubits in a column (e.g. col 0 or col (d-1)/2).
 * A logical error occurs if the effective error anticommutes with the logical observable.
 */
export function evaluateLogicalObservables(
  qubits: DataQubit[],
  distance: number
): { logicalX: boolean; logicalZ: boolean } {
  const d = distance;
  const grid = Array.from({ length: d }, () => Array<DataQubit>(d));

  for (const q of qubits) {
    if (q.r >= 0 && q.r < d && q.c >= 0 && q.c < d) {
      grid[q.r][q.c] = q;
    }
  }

  // Check logical Z error: caused by an odd parity of Z or Y operators along the horizontal cut
  // Or logical X error: caused by an odd parity of X or Y operators along the vertical cut
  let xAnticommutes = false;
  let zAnticommutes = false;

  // Let's compute cumulative logical parities across cuts
  // For standard rotated code:
  // Logical X operator commutes with Z errors if number of Z errors along any vertical line connecting top and bottom boundary is even.
  // If an unbroken path of Z errors connects top to bottom, it constitutes a logical Z error!
  // Simple check for planar code:
  // Count Z/Y errors along the midpoint column
  const midCol = Math.floor(d / 2);
  let colPhaseFlipCount = 0;
  for (let r = 0; r < d; r++) {
    const q = grid[r][midCol];
    if (q && hasPhaseFlipComponent(q.effectiveError)) {
      colPhaseFlipCount++;
    }
  }

  // Count X/Y errors along the midpoint row
  const midRow = Math.floor(d / 2);
  let rowBitFlipCount = 0;
  for (let c = 0; c < d; c++) {
    const q = grid[midRow][c];
    if (q && hasBitFlipComponent(q.effectiveError)) {
      rowBitFlipCount++;
    }
  }

  zAnticommutes = colPhaseFlipCount % 2 === 1;
  xAnticommutes = rowBitFlipCount % 2 === 1;

  return {
    logicalX: xAnticommutes,
    logicalZ: zAnticommutes,
  };
}

/**
 * Resets the surface code to a clean |0>_L state with no errors and +1 stabilizers
 */
export function resetSurfaceCode(distance: number = 3, rounds: number = 4): SurfaceCodeState {
  return createRotatedSurfaceCode(distance, rounds);
}
