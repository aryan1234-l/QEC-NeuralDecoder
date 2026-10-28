/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DecoderType, SurfaceCodeState } from '../types/quantum';
import { DECODER_METRICS } from '../quantum/decoders';

interface TopNavProps {
  state: SurfaceCodeState;
  activeDecoder: DecoderType;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onReset: () => void;
  onInjectNoiseBurst: () => void;
  onRunDecode: () => void;
  isSimulating: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  state,
  activeDecoder,
  theme,
  onToggleTheme,
  onReset,
  onInjectNoiseBurst,
  onRunDecode,
  isSimulating,
}) => {
  const metrics = DECODER_METRICS[activeDecoder];
  const activeDefectCount = state.stabilizers.filter((s) => s.value === -1).length;

  const isDark = theme === 'dark';

  return (
    <header
      className={`absolute top-0 left-0 right-0 z-30 px-6 py-2.5 pointer-events-none flex flex-wrap items-center justify-between gap-3 border-b ${
        isDark
          ? 'bg-[#0b0f17]/95 border-[#1e293b] text-slate-200'
          : 'bg-[#ffffff]/95 border-[#cbd5e1] text-slate-800'
      }`}
    >
      {/* Title & Architecture Spec - No decorative icon */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight font-mono uppercase">
              QEC-NeuralDecoder
            </h1>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase border ${
                isDark
                  ? 'border-blue-500/50 bg-blue-950/40 text-blue-400'
                  : 'border-blue-600 bg-blue-50 text-blue-700'
              }`}
            >
              d={state.distance} Planar Code
            </span>
          </div>
          <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {state.dataQubits.length} Data Qubits | {state.stabilizers.length} Stabilizers | Round {state.currentRound}
          </p>
        </div>
      </div>

      {/* Hardware Latency & Protection State - Clean Technical Typography (No AI Icons) */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Latency Spec Box */}
        <div
          className={`hidden md:flex items-center gap-2 px-2.5 py-1 text-xs font-mono border ${
            isDark
              ? 'border-slate-800 bg-slate-900/90 text-slate-300'
              : 'border-slate-300 bg-slate-50 text-slate-700'
          }`}
        >
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>FPGA INFERENCE:</span>
          <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            {metrics.inferenceLatencyNs} ns
          </span>
          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            (Limit: 50 µs)
          </span>
        </div>

        {/* Protection State Box */}
        <div
          className={`px-2.5 py-1 text-xs font-mono font-semibold border ${
            state.hasLogicalFailure
              ? isDark
                ? 'border-red-600 bg-red-950/40 text-red-400'
                : 'border-red-600 bg-red-50 text-red-700'
              : activeDefectCount > 0
              ? isDark
                ? 'border-amber-600 bg-amber-950/40 text-amber-400'
                : 'border-amber-600 bg-amber-50 text-amber-700'
              : isDark
              ? 'border-emerald-700 bg-emerald-950/40 text-emerald-400'
              : 'border-emerald-600 bg-emerald-50 text-emerald-700'
          }`}
        >
          {state.hasLogicalFailure ? (
            <span>FAILURE: {state.logicalErrorX ? 'X_L' : ''}{state.logicalErrorZ ? ' Z_L' : ''}</span>
          ) : activeDefectCount > 0 ? (
            <span>{activeDefectCount} DEFECTS DETECTED</span>
          ) : (
            <span>|0⟩_L PROTECTED</span>
          )}
        </div>

        {/* Action Buttons - Sharp Edged, Solid Flat Colors */}
        <div className="flex items-center gap-1.5 font-mono">
          <button
            onClick={onInjectNoiseBurst}
            disabled={isSimulating}
            className={`px-2.5 py-1 text-xs font-semibold uppercase border cursor-pointer transition-colors ${
              isDark
                ? 'border-amber-700/80 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40'
                : 'border-amber-600 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Noise Burst
          </button>

          <button
            onClick={onRunDecode}
            disabled={isSimulating}
            className={`px-3 py-1 text-xs font-semibold uppercase border cursor-pointer transition-colors ${
              isDark
                ? 'border-blue-600 bg-blue-700 text-white hover:bg-blue-600'
                : 'border-blue-700 bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Decode & Correct
          </button>

          <button
            onClick={onReset}
            className={`px-2.5 py-1 text-xs font-semibold uppercase border cursor-pointer transition-colors ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Reset
          </button>

          {/* Light / Dark Mode Switch */}
          <button
            onClick={onToggleTheme}
            className={`px-2.5 py-1 text-xs font-mono font-semibold uppercase border cursor-pointer transition-colors ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'border-slate-400 bg-white text-slate-800 hover:bg-slate-100'
            }`}
            title="Toggle Light / Dark mode"
          >
            {isDark ? 'Mode: Dark' : 'Mode: Light'}
          </button>
        </div>
      </div>
    </header>
  );
};
