/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BenchmarkPoint,
  DecoderType,
  NoiseParameters,
  PauliType,
  SurfaceCodeState,
} from './types/quantum';
import {
  applyNoiseModel,
  createRotatedSurfaceCode,
  injectQubitError,
  resetSurfaceCode,
} from './quantum/surfaceCode';
import {
  applyCorrectionsToState,
  decodeCNN3D,
  decodeGNN,
  decodeMWPM,
  DecodedCorrectionResult,
} from './quantum/decoders';
import {
  generateThresholdBenchmarkData,
  runMonteCarloTrial,
  simulateTrainingStep,
  TrainingConfig,
  TrainingLogEntry,
} from './quantum/trainer';
import { QuantumVisualizer3D } from './components/QuantumVisualizer3D';
import { TopNav } from './components/TopNav';
import { BottomDock } from './components/BottomDock';

export default function App() {
  // Theme Mode: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Surface Code State (default distance d=3 rotated surface code)
  const [distance, setDistance] = useState<number>(3);
  const [state, setState] = useState<SurfaceCodeState>(() => createRotatedSurfaceCode(3, 4));

  // Active Decoder & Results
  const [activeDecoder, setActiveDecoder] = useState<DecoderType>('gnn');
  const [decodedResult, setDecodedResult] = useState<DecodedCorrectionResult | null>(null);

  // Noise Configuration
  const [noiseParams, setNoiseParams] = useState<NoiseParameters>({
    physicalRate: 0.035, // 3.5%
    measurementRate: 0.01, // 1.0% readout noise
    modelType: 'depolarizing',
    twoQubitErrorMultiplier: 2.2,
  });

  // Selected Qubit for inspection / manual injection
  const [selectedQubitId, setSelectedQubitId] = useState<string | null>(null);

  // 3D View Mode
  const [viewMode, setViewMode] = useState<'lattice2d' | 'isometric3d' | 'spacetimePrism'>('isometric3d');

  // Visual Overlays
  const [decorations, setDecorations] = useState({
    showStabilizerPlaquettes: true,
    showErrorStrings: true,
    showCorrectionStrings: true,
    showBlochVectors: true,
    showLabels: true,
  });

  // Continuous QEC Loop
  const [isContinuousAutoDecode, setIsContinuousAutoDecode] = useState<boolean>(false);

  // Threshold Benchmarks Data
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkPoint[]>(() =>
    generateThresholdBenchmarkData('gnn', 'depolarizing')
  );
  const [monteCarloProgress, setMonteCarloProgress] = useState({
    running: false,
    trials: 0,
    successRate: 0,
  });

  // Training Studio State
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    architecture: 'gnn',
    learningRate: 0.001,
    batchSize: 128,
    noiseRate: 0.035,
    epochs: 50,
  });
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLogEntry[]>([]);

  // Toggle Theme
  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Update benchmark data whenever active decoder or noise type changes
  useEffect(() => {
    setBenchmarkData(generateThresholdBenchmarkData(activeDecoder, noiseParams.modelType));
  }, [activeDecoder, noiseParams.modelType]);

  // Handle Distance Switch
  const handleDistanceChange = useCallback((newD: number) => {
    setDistance(newD);
    const newState = createRotatedSurfaceCode(newD, 4);
    setState(newState);
    setDecodedResult(null);
    setSelectedQubitId(null);
  }, []);

  // Reset Surface Code
  const handleReset = useCallback(() => {
    const fresh = resetSurfaceCode(distance, 4);
    setState(fresh);
    setDecodedResult(null);
  }, [distance]);

  // Inject Random Noise Burst
  const handleInjectNoiseBurst = useCallback(() => {
    setState((prevState) => {
      const noisyState = applyNoiseModel(prevState, noiseParams);
      return noisyState;
    });
    setDecodedResult(null);
  }, [noiseParams]);

  // Run Decoder & Apply Correction
  const handleRunDecode = useCallback(() => {
    let result: DecodedCorrectionResult;
    if (activeDecoder === 'gnn') {
      result = decodeGNN(state);
    } else if (activeDecoder === 'cnn3d') {
      result = decodeCNN3D(state);
    } else {
      result = decodeMWPM(state);
    }

    setDecodedResult(result);

    const correctedState = applyCorrectionsToState(state, result.corrections);
    setState(correctedState);
  }, [activeDecoder, state]);

  // Manual Pauli injection on a specific qubit
  const handleInjectManualError = useCallback((qubitId: string, error: PauliType) => {
    setState((prevState) => injectQubitError(prevState, qubitId, error));
    setDecodedResult(null);
  }, []);

  // Continuous QEC Loop
  useEffect(() => {
    if (!isContinuousAutoDecode) return;

    const interval = setInterval(() => {
      setState((prev) => {
        const noisy = applyNoiseModel(prev, {
          ...noiseParams,
          physicalRate: Math.max(0.015, noiseParams.physicalRate * 0.7),
        });

        const result =
          activeDecoder === 'gnn'
            ? decodeGNN(noisy)
            : activeDecoder === 'cnn3d'
            ? decodeCNN3D(noisy)
            : decodeMWPM(noisy);

        setDecodedResult(result);
        return applyCorrectionsToState(noisy, result.corrections);
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isContinuousAutoDecode, noiseParams, activeDecoder]);

  // Live Training Loop Simulation
  useEffect(() => {
    if (!isTraining) return;

    let currentLoss = trainingLogs.length > 0 ? trainingLogs[trainingLogs.length - 1].loss : 0.45;
    let epochCounter = trainingLogs.length;

    const interval = setInterval(() => {
      epochCounter++;
      const { nextLoss, accuracy } = simulateTrainingStep(
        epochCounter,
        1,
        trainingConfig,
        currentLoss
      );
      currentLoss = nextLoss;

      setTrainingLogs((prev) => [
        ...prev,
        {
          epoch: epochCounter,
          batch: 1,
          loss: nextLoss,
          validationAccuracy: accuracy,
          learningRate: trainingConfig.learningRate,
          activeSyndromePairs: Math.floor(Math.random() * 20 + 40),
        },
      ]);
    }, 280);

    return () => clearInterval(interval);
  }, [isTraining, trainingConfig, trainingLogs]);

  // Run Rapid Monte Carlo Benchmark Trials
  const handleRunMonteCarloBenchmark = useCallback(() => {
    setMonteCarloProgress({ running: true, trials: 0, successRate: 0 });

    setTimeout(() => {
      let successes = 0;
      const totalTrials = 100;

      for (let i = 0; i < totalTrials; i++) {
        const trial = runMonteCarloTrial(distance, activeDecoder, noiseParams);
        if (trial.success) successes++;
      }

      setMonteCarloProgress({
        running: false,
        trials: totalTrials,
        successRate: (successes / totalTrials) * 100,
      });
    }, 150);
  }, [distance, activeDecoder, noiseParams]);

  const handleToggleDecoration = useCallback(
    (key: keyof typeof decorations) => {
      setDecorations((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden ${
        theme === 'dark' ? 'dark bg-[#0b0f17] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* Top HUD Technical Bar */}
      <TopNav
        state={state}
        activeDecoder={activeDecoder}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onReset={handleReset}
        onInjectNoiseBurst={handleInjectNoiseBurst}
        onRunDecode={handleRunDecode}
        isSimulating={isContinuousAutoDecode}
      />

      {/* 3D Three.js Topological Surface Code Visualizer */}
      <QuantumVisualizer3D
        state={state}
        decodedResult={decodedResult}
        selectedQubitId={selectedQubitId}
        onSelectQubit={setSelectedQubitId}
        onInjectError={handleInjectManualError}
        viewMode={viewMode}
        showDecorations={decorations}
        theme={theme}
      />

      {/* Collapsible Sharp Bottom Dock */}
      <BottomDock
        state={state}
        activeDecoder={activeDecoder}
        onChangeDecoder={setActiveDecoder}
        noiseParams={noiseParams}
        onChangeNoiseParams={setNoiseParams}
        onChangeDistance={handleDistanceChange}
        selectedQubitId={selectedQubitId}
        onInjectManualError={handleInjectManualError}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        decorations={decorations}
        onToggleDecoration={handleToggleDecoration}
        isContinuousAutoDecode={isContinuousAutoDecode}
        onToggleContinuous={() => setIsContinuousAutoDecode(!isContinuousAutoDecode)}
        decodedResult={decodedResult}
        benchmarkData={benchmarkData}
        onRunMonteCarloBenchmark={handleRunMonteCarloBenchmark}
        monteCarloProgress={monteCarloProgress}
        trainingConfig={trainingConfig}
        onChangeTrainingConfig={setTrainingConfig}
        trainingLogs={trainingLogs}
        isTraining={isTraining}
        onToggleTraining={() => setIsTraining(!isTraining)}
        theme={theme}
      />
    </div>
  );
}
