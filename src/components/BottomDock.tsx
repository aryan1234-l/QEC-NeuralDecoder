/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BenchmarkPoint,
  DecoderPerformance,
  DecoderType,
  NoiseModelType,
  NoiseParameters,
  PauliType,
  SurfaceCodeState,
} from '../types/quantum';
import { DECODER_METRICS, DecodedCorrectionResult } from '../quantum/decoders';
import { TrainingConfig, TrainingLogEntry } from '../quantum/trainer';

interface BottomDockProps {
  state: SurfaceCodeState;
  activeDecoder: DecoderType;
  onChangeDecoder: (dec: DecoderType) => void;
  noiseParams: NoiseParameters;
  onChangeNoiseParams: (params: NoiseParameters) => void;
  onChangeDistance: (d: number) => void;
  selectedQubitId: string | null;
  onInjectManualError: (qubitId: string, error: PauliType) => void;
  viewMode: 'lattice2d' | 'isometric3d' | 'spacetimePrism';
  onChangeViewMode: (mode: 'lattice2d' | 'isometric3d' | 'spacetimePrism') => void;
  decorations: {
    showStabilizerPlaquettes: boolean;
    showErrorStrings: boolean;
    showCorrectionStrings: boolean;
    showBlochVectors: boolean;
    showLabels: boolean;
  };
  onToggleDecoration: (key: keyof BottomDockProps['decorations']) => void;
  isContinuousAutoDecode: boolean;
  onToggleContinuous: () => void;
  decodedResult: DecodedCorrectionResult | null;
  benchmarkData: BenchmarkPoint[];
  onRunMonteCarloBenchmark: () => void;
  monteCarloProgress: { running: boolean; trials: number; successRate: number };
  trainingConfig: TrainingConfig;
  onChangeTrainingConfig: (config: TrainingConfig) => void;
  trainingLogs: TrainingLogEntry[];
  isTraining: boolean;
  onToggleTraining: () => void;
  theme: 'dark' | 'light';
}

export const BottomDock: React.FC<BottomDockProps> = ({
  state,
  activeDecoder,
  onChangeDecoder,
  noiseParams,
  onChangeNoiseParams,
  onChangeDistance,
  selectedQubitId,
  onInjectManualError,
  viewMode,
  onChangeViewMode,
  decorations,
  onToggleDecoration,
  isContinuousAutoDecode,
  onToggleContinuous,
  decodedResult,
  benchmarkData,
  onRunMonteCarloBenchmark,
  monteCarloProgress,
  trainingConfig,
  onChangeTrainingConfig,
  trainingLogs,
  isTraining,
  onToggleTraining,
  theme,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'lattice' | 'view' | 'architecture' | 'threshold' | 'training'>('lattice');

  const isDark = theme === 'dark';
  const metrics: DecoderPerformance = DECODER_METRICS[activeDecoder];

  return (
    <div
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl transition-transform duration-200 ease-in-out px-4 pb-0 ${
        isCollapsed ? 'translate-y-[calc(100%-1.85rem)]' : 'translate-y-0'
      }`}
    >
      {/* Drawer Toggle Bar - Sharp Edges */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`px-4 py-0.5 border-t border-x text-[11px] font-mono uppercase cursor-pointer select-none ${
            isDark
              ? 'bg-[#0b0f17] border-[#334155] text-slate-300 hover:bg-[#151b26]'
              : 'bg-[#ffffff] border-[#94a3b8] text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isCollapsed ? '[ + SHOW CONTROL PANEL ]' : '[ - HIDE CONTROL PANEL ]'}
        </button>
      </div>

      {/* Main Dock Container - Strict Sharp Edges, Clean Scientific Instrument Box */}
      <div
        className={`border p-3.5 select-none ${
          isDark
            ? 'bg-[#0b0f17] border-[#1e293b] text-slate-200'
            : 'bg-[#ffffff] border-[#cbd5e1] text-slate-800'
        }`}
      >
        {/* Navigation Tabs - Sharp Rectangular Engineering Tabs */}
        <div
          className={`flex items-center justify-between border-b pb-2.5 mb-3 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'lattice', label: 'LATTICE & NOISE' },
              { id: 'view', label: '3D SPACETIME' },
              { id: 'architecture', label: 'DECODER ARCHITECTURE' },
              { id: 'threshold', label: 'THRESHOLD BENCHMARKS' },
              { id: 'training', label: 'TRAINING STUDIO' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 text-xs font-mono font-semibold uppercase border cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? isDark
                      ? 'border-blue-600 bg-blue-950/60 text-blue-300'
                      : 'border-blue-700 bg-blue-100 text-blue-900 font-bold'
                    : isDark
                    ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Continuous Auto-Correction Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleContinuous}
              className={`px-2.5 py-1 text-xs font-mono font-medium border cursor-pointer uppercase transition-colors ${
                isContinuousAutoDecode
                  ? isDark
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-emerald-700 bg-emerald-50 text-emerald-800 font-bold'
                  : isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  : 'border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900'
              }`}
            >
              AUTO QEC CYCLE: {isContinuousAutoDecode ? 'ACTIVE' : 'IDLE'}
            </button>
          </div>
        </div>

        {/* Tab 1: Lattice & Noise Controls */}
        {activeTab === 'lattice' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Code Distance & Dimension */}
            <div
              className={`p-2.5 border space-y-2 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`flex items-center justify-between font-mono text-[11px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <span>CODE DISTANCE (d)</span>
                <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  {state.distance} x {state.distance}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 font-mono">
                {[3, 5, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => onChangeDistance(d)}
                    className={`py-1.5 px-2 text-center border cursor-pointer transition-colors ${
                      state.distance === d
                        ? isDark
                          ? 'border-blue-600 bg-blue-700 text-white font-bold'
                          : 'border-blue-700 bg-blue-600 text-white font-bold'
                        : isDark
                        ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    d = {d}
                    <div className="text-[10px] opacity-75">{d * d} Qubits</div>
                  </button>
                ))}
              </div>
              <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Rotated planar layout with {state.distance * state.distance} data qubits and {state.stabilizers.length} ancilla stabilizers.
              </p>
            </div>

            {/* Realistic Noise Channels */}
            <div
              className={`p-2.5 border space-y-2 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`flex items-center justify-between font-mono text-[11px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <span>NOISE MODEL</span>
                <span className={`uppercase font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  {noiseParams.modelType}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 font-mono">
                {(['depolarizing', 'phenomenological', 'correlated_cnot'] as NoiseModelType[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => onChangeNoiseParams({ ...noiseParams, modelType: m })}
                    className={`py-1 px-1.5 text-[10px] border cursor-pointer uppercase transition-colors ${
                      noiseParams.modelType === m
                        ? isDark
                          ? 'border-amber-600 bg-amber-950/40 text-amber-300 font-bold'
                          : 'border-amber-700 bg-amber-100 text-amber-900 font-bold'
                        : isDark
                        ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                        : 'border-slate-300 bg-white text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m === 'depolarizing' ? 'Depolarizing' : m === 'phenomenological' ? 'Readout' : 'CNOT Spread'}
                  </button>
                ))}
              </div>

              {/* Physical Error Rate p Slider */}
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Physical Rate (p):</span>
                  <span className={`font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                    {(noiseParams.physicalRate * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.15"
                  step="0.005"
                  value={noiseParams.physicalRate}
                  onChange={(e) =>
                    onChangeNoiseParams({ ...noiseParams, physicalRate: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-slate-300 dark:bg-slate-700 appearance-none cursor-pointer"
                />
              </div>

              {/* Measurement Readout Flip q Slider */}
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Measurement Flip (q):</span>
                  <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    {(noiseParams.measurementRate * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.05"
                  step="0.002"
                  value={noiseParams.measurementRate}
                  onChange={(e) =>
                    onChangeNoiseParams({ ...noiseParams, measurementRate: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-slate-300 dark:bg-slate-700 appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Qubit Inspector & Manual Pauli Flip */}
            <div
              className={`p-2.5 border space-y-2 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`flex items-center justify-between font-mono text-[11px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <span>MANUAL PAULI INJECTION</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedQubitId || 'dq_1_1'}
                </span>
              </div>
              <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Select target qubit in 3D viewport or apply Pauli flips directly:
              </p>
              <div className="grid grid-cols-4 gap-1 pt-1 font-mono">
                {(['X', 'Y', 'Z', 'I'] as PauliType[]).map((pauli) => (
                  <button
                    key={pauli}
                    onClick={() => onInjectManualError(selectedQubitId || 'dq_1_1', pauli)}
                    className={`py-1.5 px-1 border text-center font-bold cursor-pointer transition-colors ${
                      pauli === 'X'
                        ? isDark
                          ? 'border-red-600 bg-red-950/40 text-red-300 hover:bg-red-900/50'
                          : 'border-red-600 bg-red-100 text-red-800 hover:bg-red-200'
                        : pauli === 'Z'
                        ? isDark
                          ? 'border-blue-600 bg-blue-950/40 text-blue-300 hover:bg-blue-900/50'
                          : 'border-blue-600 bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : pauli === 'Y'
                        ? isDark
                          ? 'border-purple-600 bg-purple-950/40 text-purple-300 hover:bg-purple-900/50'
                          : 'border-purple-600 bg-purple-100 text-purple-800 hover:bg-purple-200'
                        : isDark
                        ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pauli}
                  </button>
                ))}
              </div>
              <div className={`text-[10px] font-mono pt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Active physical errors: <span className="font-bold underline">{state.totalPhysicalErrors}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 3D Spacetime View Controls */}
        {activeTab === 'view' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Camera Presets */}
            <div
              className={`p-2.5 border space-y-2 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                CAMERA PERSPECTIVE
              </span>
              <div className="grid grid-cols-3 gap-1.5 font-mono">
                {[
                  { id: 'isometric3d', label: '3D Isometric', sub: 'Perspective' },
                  { id: 'lattice2d', label: '2D Planar', sub: 'Top-Down' },
                  { id: 'spacetimePrism', label: 'Spacetime', sub: 'Time Slices' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onChangeViewMode(preset.id as any)}
                    className={`py-1.5 px-2 text-center border cursor-pointer transition-colors ${
                      viewMode === preset.id
                        ? isDark
                          ? 'border-blue-600 bg-blue-700 text-white font-bold'
                          : 'border-blue-700 bg-blue-600 text-white font-bold'
                        : isDark
                        ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs">{preset.label}</div>
                    <div className="text-[10px] opacity-75">{preset.sub}</div>
                  </button>
                ))}
              </div>
              <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Spacetime Prism visualizes consecutive measurement rounds stacked vertically to show temporal readout correlations.
              </p>
            </div>

            {/* Layer Visibility Toggles */}
            <div
              className={`p-2.5 border space-y-2 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ELEMENT VISIBILITY
              </span>
              <div className="grid grid-cols-2 gap-1.5 font-mono">
                <button
                  onClick={() => onToggleDecoration('showStabilizerPlaquettes')}
                  className={`p-1.5 border text-left cursor-pointer transition-colors ${
                    decorations.showStabilizerPlaquettes
                      ? isDark
                        ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300'
                        : 'border-emerald-700 bg-emerald-100 text-emerald-900 font-bold'
                      : isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-500'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <div className="font-semibold text-xs">Plaquettes</div>
                  <div className="text-[10px] opacity-75">X-Star & Z-Face Tiles</div>
                </button>

                <button
                  onClick={() => onToggleDecoration('showErrorStrings')}
                  className={`p-1.5 border text-left cursor-pointer transition-colors ${
                    decorations.showErrorStrings
                      ? isDark
                        ? 'border-red-600 bg-red-950/40 text-red-300'
                        : 'border-red-700 bg-red-100 text-red-900 font-bold'
                      : isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-500'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <div className="font-semibold text-xs">Error Strings</div>
                  <div className="text-[10px] opacity-75">Physical Pauli Errors</div>
                </button>

                <button
                  onClick={() => onToggleDecoration('showCorrectionStrings')}
                  className={`p-1.5 border text-left cursor-pointer transition-colors ${
                    decorations.showCorrectionStrings
                      ? isDark
                        ? 'border-blue-600 bg-blue-950/40 text-blue-300'
                        : 'border-blue-700 bg-blue-100 text-blue-900 font-bold'
                      : isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-500'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <div className="font-semibold text-xs">Correction Paths</div>
                  <div className="text-[10px] opacity-75">Predicted Matching</div>
                </button>

                <button
                  onClick={() => onToggleDecoration('showBlochVectors')}
                  className={`p-1.5 border text-left cursor-pointer transition-colors ${
                    decorations.showBlochVectors
                      ? isDark
                        ? 'border-slate-600 bg-slate-800 text-slate-200'
                        : 'border-slate-400 bg-slate-100 text-slate-800 font-bold'
                      : isDark
                      ? 'border-slate-800 bg-slate-900 text-slate-500'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <div className="font-semibold text-xs">Junction Pins</div>
                  <div className="text-[10px] opacity-75">Transmon Electrodes</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Neural Architecture & Latency Modeling */}
        {activeTab === 'architecture' && (
          <div className="space-y-2.5 text-xs">
            {/* Decoder Model Selection - Sharp Technical Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 font-mono">
              {[
                {
                  id: 'gnn',
                  name: 'GRAPH NEURAL NETWORK (GNN)',
                  target: 'FPGA Message Passing',
                  latency: '340 ns',
                  threshold: '10.4%',
                  highlight: 'Pipelined graph convolution over defect manifolds',
                },
                {
                  id: 'cnn3d',
                  name: '3D SPACETIME CNN',
                  target: 'ASIC Systolic Array',
                  latency: '185 ns',
                  threshold: '10.8%',
                  highlight: 'Direct spatio-temporal tensor inversion',
                },
                {
                  id: 'mwpm',
                  name: 'EDMONDS MWPM (BASELINE)',
                  target: 'Host CPU Blossom Algorithm',
                  latency: '245,000 ns',
                  threshold: '10.2%',
                  highlight: 'O(V³) matching - Exceeds coherence window',
                },
              ].map((d) => (
                <div
                  key={d.id}
                  onClick={() => onChangeDecoder(d.id as DecoderType)}
                  className={`p-2.5 border cursor-pointer transition-colors ${
                    activeDecoder === d.id
                      ? isDark
                        ? 'border-blue-600 bg-blue-950/40 text-slate-200'
                        : 'border-blue-700 bg-blue-50 text-slate-900'
                      : isDark
                      ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px]">{d.name}</span>
                    <span
                      className={`text-[10px] px-1 py-0.5 border ${
                        d.id === 'mwpm'
                          ? isDark
                            ? 'border-red-700 bg-red-950/60 text-red-300'
                            : 'border-red-600 bg-red-100 text-red-800'
                          : isDark
                          ? 'border-emerald-700 bg-emerald-950/60 text-emerald-300'
                          : 'border-emerald-700 bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {d.latency}
                    </span>
                  </div>
                  <div className={`text-[10px] font-semibold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    {d.target}
                  </div>
                  <div className={`text-[10px] mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {d.highlight}
                  </div>
                  <div
                    className={`flex justify-between text-[10px] border-t pt-1 ${
                      isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>Threshold:</span>
                    <span className="font-bold">{d.threshold}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Coherence Time vs Inference Latency Comparison Bar */}
            <div
              className={`p-2.5 border font-mono ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center text-[11px] mb-2">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  COHERENCE BUDGET: Superconducting T2* ≈ 50 µs (50,000 ns)
                </span>
                <span
                  className={`font-bold ${
                    activeDecoder !== 'mwpm'
                      ? isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-700'
                      : isDark
                      ? 'text-red-400'
                      : 'text-red-700'
                  }`}
                >
                  {activeDecoder !== 'mwpm' ? 'SUB-MICROSECOND PASS (< 1 µs)' : 'COHERENCE VIOLATION (245 µs)'}
                </span>
              </div>

              {/* Progress Latency Bars - Sharp Rectangles */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`w-28 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>3D CNN (ASIC):</span>
                  <div className={`flex-1 h-2 border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                    <div className="bg-blue-600 h-full w-[0.37%]" />
                  </div>
                  <span className={`w-20 text-right font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    185 ns
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`w-28 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>GNN (FPGA):</span>
                  <div className={`flex-1 h-2 border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                    <div className="bg-emerald-600 h-full w-[0.68%]" />
                  </div>
                  <span className={`w-20 text-right font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    340 ns
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`w-28 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>MWPM (CPU):</span>
                  <div className={`flex-1 h-2 border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                    <div className="bg-red-600 h-full w-[100%]" />
                  </div>
                  <span className={`w-20 text-right font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                    245,000 ns
                  </span>
                </div>
              </div>

              <p className={`text-[10px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Neural decoders evaluate syndrome graphs in deterministic clock cycles without iterative blossom search, satisfying superconducting qubit coherence constraints.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Fault-Tolerant Threshold Benchmarks */}
        {activeTab === 'threshold' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {/* Log-Log Benchmark Graph Display */}
            <div
              className={`md:col-span-2 p-3 border ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h4 className="font-bold text-[11px] uppercase">
                    FAULT-TOLERANT THRESHOLD (P_L vs Physical Error Rate p)
                  </h4>
                  <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Threshold crossing point: <span className="font-bold underline">p_th ≈ 10.6%</span>
                  </p>
                </div>
                <button
                  onClick={onRunMonteCarloBenchmark}
                  disabled={monteCarloProgress.running}
                  className={`px-3 py-1 border text-xs uppercase cursor-pointer ${
                    isDark
                      ? 'border-blue-600 bg-blue-700 text-white hover:bg-blue-600'
                      : 'border-blue-700 bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {monteCarloProgress.running ? 'Running Trials...' : 'Run 100 Trials'}
                </button>
              </div>

              {/* Threshold Curve Visualization (Sharp Technical Plot) */}
              <div
                className={`h-40 w-full relative p-2 border ${
                  isDark ? 'bg-[#05070d] border-slate-800' : 'bg-white border-slate-300'
                }`}
              >
                <svg className="w-full h-full" viewBox="0 0 500 150">
                  {/* Grid lines */}
                  <line x1="40" y1="20" x2="480" y2="20" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeDasharray="2,2" />
                  <line x1="40" y1="60" x2="480" y2="60" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeDasharray="2,2" />
                  <line x1="40" y1="100" x2="480" y2="100" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeDasharray="2,2" />
                  <line x1="40" y1="130" x2="480" y2="130" stroke={isDark ? '#334155' : '#94a3b8'} />
                  <line x1="40" y1="20" x2="40" y2="130" stroke={isDark ? '#334155' : '#94a3b8'} />

                  {/* Threshold vertical line indicator at ~p = 10.6% (x = 340) */}
                  <line x1="340" y1="20" x2="340" y2="130" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3,3" />
                  <text x="345" y="30" fill="#d97706" fontSize="9" fontFamily="JetBrains Mono">p_th ≈ 10.6%</text>

                  {/* Polyline for d = 3 (Solid Red) */}
                  <polyline
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    points={benchmarkData
                      .map((pt, i) => `${40 + i * 44},${130 - Math.min(110, pt.pL_d3 * 220)}`)
                      .join(' ')}
                  />

                  {/* Polyline for d = 5 (Solid Blue) */}
                  <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.2"
                    points={benchmarkData
                      .map((pt, i) => `${40 + i * 44},${130 - Math.min(110, pt.pL_d5 * 220)}`)
                      .join(' ')}
                  />

                  {/* Polyline for d = 7 (Solid Green) */}
                  <polyline
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.4"
                    points={benchmarkData
                      .map((pt, i) => `${40 + i * 44},${130 - Math.min(110, pt.pL_d7 * 220)}`)
                      .join(' ')}
                  />

                  {/* Polyline for MWPM d = 5 (Dashed slate) */}
                  <polyline
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    points={benchmarkData
                      .map((pt, i) => `${40 + i * 44},${130 - Math.min(110, pt.mwpm_pL_d5 * 220)}`)
                      .join(' ')}
                  />

                  {/* Axis labels */}
                  <text x="40" y="144" fill="#64748b" fontSize="8">0.5%</text>
                  <text x="216" y="144" fill="#64748b" fontSize="8">5.0%</text>
                  <text x="335" y="144" fill="#d97706" fontSize="8">10.6%</text>
                  <text x="440" y="144" fill="#64748b" fontSize="8">16.0%</text>

                  <text x="10" y="24" fill="#64748b" fontSize="8">0.5</text>
                  <text x="10" y="75" fill="#64748b" fontSize="8">0.1</text>
                  <text x="10" y="128" fill="#64748b" fontSize="8">10⁻⁴</text>
                </svg>

                {/* Legend - Sharp Rectangles */}
                <div
                  className={`absolute top-2 right-3 flex items-center gap-2.5 text-[10px] px-2 py-1 border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-600"></span> d=3</div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-600"></span> d=5</div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-600"></span> d=7</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-500"></span> MWPM</div>
                </div>
              </div>
            </div>

            {/* Scaling Law Analysis & Empirical Stats */}
            <div
              className={`p-3 border space-y-2 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                SCALING SUPPRESSION
              </span>
              <div
                className={`p-2 border space-y-1 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
                }`}
              >
                <div className={`text-[10px] font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  P_L ∝ C · (p / p_th)^((d + 1) / 2)
                </div>
                <p className={`text-[9.5px] pt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  At physical error rate p = 1.0%:
                </p>
                <div className="text-[10px] space-y-0.5 pt-0.5">
                  <div>d = 3: P_L ≈ 5.0 × 10⁻³</div>
                  <div>d = 5: P_L ≈ 4.5 × 10⁻⁴</div>
                  <div>d = 7: P_L ≈ 4.2 × 10⁻⁵</div>
                </div>
              </div>

              {monteCarloProgress.trials > 0 && (
                <div
                  className={`p-2 border text-[10px] ${
                    isDark ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300' : 'bg-emerald-50 border-emerald-600 text-emerald-900'
                  }`}
                >
                  <div className="font-bold mb-0.5">Monte Carlo Verification:</div>
                  <div>Trials: {monteCarloProgress.trials}</div>
                  <div>Correction Success: {monteCarloProgress.successRate.toFixed(1)}%</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Neural Training Studio */}
        {activeTab === 'training' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {/* Training Config */}
            <div
              className={`p-2.5 border space-y-2 ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                OPTIMIZATION PARAMETERS
              </span>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Learning Rate (η):</span>
                  <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    {trainingConfig.learningRate}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0001"
                  max="0.01"
                  step="0.0005"
                  value={trainingConfig.learningRate}
                  onChange={(e) =>
                    onChangeTrainingConfig({ ...trainingConfig, learningRate: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-slate-300 dark:bg-slate-700 appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Batch Size:</span>
                  <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    {trainingConfig.batchSize}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[64, 128, 256].map((bs) => (
                    <button
                      key={bs}
                      onClick={() => onChangeTrainingConfig({ ...trainingConfig, batchSize: bs })}
                      className={`py-1 border text-center cursor-pointer ${
                        trainingConfig.batchSize === bs
                          ? isDark
                            ? 'border-blue-600 bg-blue-700 text-white font-bold'
                            : 'border-blue-700 bg-blue-600 text-white font-bold'
                          : isDark
                          ? 'border-slate-800 bg-slate-900 text-slate-300'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      {bs}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={onToggleTraining}
                  className={`w-full py-2 border font-bold uppercase cursor-pointer transition-colors ${
                    isTraining
                      ? 'border-red-600 bg-red-700 text-white hover:bg-red-600'
                      : 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isTraining ? '[ STOP TRAINING ]' : '[ START TRAINING ]'}
                </button>
              </div>
            </div>

            {/* Live Loss & Convergence Curve */}
            <div
              className={`md:col-span-2 p-2.5 border ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  CROSS-ENTROPY SYNDROME LOSS CONVERGENCE
                </span>
                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {trainingLogs.length > 0
                    ? `Accuracy: ${trainingLogs[trainingLogs.length - 1].validationAccuracy.toFixed(1)}%`
                    : 'Accuracy: 98.4%'}
                </span>
              </div>

              {/* Loss Curve Plot */}
              <div
                className={`h-32 w-full p-2 border relative ${
                  isDark ? 'bg-[#05070d] border-slate-800' : 'bg-white border-slate-300'
                }`}
              >
                {trainingLogs.length > 1 ? (
                  <svg className="w-full h-full" viewBox="0 0 400 110">
                    <line x1="20" y1="20" x2="390" y2="20" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeDasharray="2,2" />
                    <line x1="20" y1="55" x2="390" y2="55" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeDasharray="2,2" />
                    <line x1="20" y1="90" x2="390" y2="90" stroke={isDark ? '#334155' : '#94a3b8'} />
                    {/* Loss polyline (Solid Blue) */}
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2"
                      points={trainingLogs
                        .slice(-30)
                        .map((entry, idx) => {
                          const x = 20 + (idx / Math.min(29, trainingLogs.length - 1)) * 360;
                          const y = 90 - Math.min(70, entry.loss * 110);
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center text-xs">
                    <span>Click [ START TRAINING ] to generate synthetic syndrome batches</span>
                  </div>
                )}
              </div>

              <div className={`flex justify-between text-[10px] mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>Convergence Target: &lt; 0.015</span>
                <span>Hardware Target: Quantized INT8 DSP</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
