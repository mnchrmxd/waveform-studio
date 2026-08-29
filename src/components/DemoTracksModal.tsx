import React from 'react';
import { X, Sparkles, Music, Play, Disc } from 'lucide-react';
import { SAMPLE_PRESETS } from '../services/audioEngine';
import { SampleAudioPreset } from '../types';

interface DemoTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: SampleAudioPreset) => void;
  isLoading: boolean;
}

export const DemoTracksModal: React.FC<DemoTracksModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Audio Presets & Synthesizers</h2>
              <p className="text-xs text-neutral-400">Zero-download procedural synthesized soundscapes</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Presets */}
        <div className="p-4 flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto">
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              id={`preset-track-${preset.id}`}
              disabled={isLoading}
              onClick={() => onSelectPreset(preset)}
              className="p-3.5 rounded-xl bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 group-hover:bg-cyan-500/20 text-neutral-400 group-hover:text-cyan-400 flex items-center justify-center transition-colors border border-neutral-700">
                  <Disc className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                    {preset.name}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                    {preset.genre} • {preset.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-neutral-500">{preset.duration}s</span>
                <div className="p-1.5 rounded-lg bg-neutral-800 group-hover:bg-cyan-500 text-neutral-300 group-hover:text-black transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
