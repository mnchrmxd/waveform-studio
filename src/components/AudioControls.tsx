import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Volume2,
  VolumeX,
  FileAudio,
} from 'lucide-react';
import { AudioMetadata, WaveformData } from '../types';

interface AudioControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  waveformData: WaveformData | null;
  volume: number;
  playbackRate: number;
  isLooping: boolean;
  metadata?: AudioMetadata | null;
  onAudioClick?: () => void;
  trimStart?: number;
  trimEnd?: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleLoop: () => void;
  onTrimChange?: (start: number, end: number) => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  waveformData,
  volume,
  playbackRate,
  isLooping,
  metadata,
  onAudioClick,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
  onToggleLoop,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(frac * duration);
  };

  const progressFraction = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  return (
    <div
      id="audio-controls-container"
      className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800/90 backdrop-blur-md shadow-xl flex flex-col gap-3"
    >
      {/* Waveform Scrubber Timeline */}
      <div className="relative flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-semibold">{formatTime(currentTime)}</span>
            <span className="text-neutral-600">/</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="text-[11px] text-neutral-500 font-sans">
            Click anywhere on waveform to scrub
          </div>
        </div>

        {/* Interactive Waveform Bar Overview */}
        <div
          ref={timelineRef}
          id="audio-timeline-track"
          onClick={handleTimelineClick}
          className="relative w-full h-14 bg-neutral-950/80 rounded-xl overflow-hidden cursor-pointer border border-neutral-800 hover:border-neutral-700 transition-colors group"
        >
          {/* Waveform Peaks display */}
          <div className="absolute inset-0 flex items-center justify-between px-2 gap-[1px]">
            {waveformData && waveformData.peaks.length > 0 ? (
              waveformData.peaks.slice(0, 160).map((peak, idx) => {
                const barFraction = idx / Math.min(160, waveformData.peaks.length);
                const isPlayed = barFraction <= progressFraction;

                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-full transition-all"
                    style={{
                      height: `${Math.max(8, peak * 88)}%`,
                      backgroundColor: isPlayed ? '#38bdf8' : '#334155',
                      opacity: isPlayed ? 1 : 0.4,
                    }}
                  />
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600 font-mono">
                No audio waveform loaded
              </div>
            )}
          </div>

          {/* Scrub Playhead Cursor */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_#ffffff] z-10 pointer-events-none transition-all"
            style={{ left: `${progressFraction * 100}%` }}
          >
            <div className="w-3 h-3 bg-white rounded-full -ml-[5px] -mt-1 shadow-md border border-neutral-900" />
          </div>
        </div>
      </div>

      {/* Main Transport & Playback Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Playback controls & Audio Track Name Button */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Replay 0s */}
          <button
            id="audio-rewind-btn"
            onClick={() => onSeek(0)}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Restart from beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play / Pause Primary Button */}
          <button
            id="audio-play-pause-btn"
            onClick={onTogglePlay}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer ring-1 ring-white/20 shrink-0"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Loop toggle */}
          <button
            id="audio-loop-toggle-btn"
            onClick={onToggleLoop}
            className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
              isLooping
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white'
            }`}
            title={isLooping ? 'Looping enabled' : 'Looping disabled'}
          >
            <Repeat className="w-4 h-4" />
          </button>

          {/* Clickable Audio Track Name Button next to controls */}
          {onAudioClick && (
            <button
              type="button"
              id="controls-audio-track-btn"
              onClick={onAudioClick}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-750 border border-neutral-700/70 hover:border-cyan-500/60 text-xs text-neutral-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 min-w-0 max-w-[175px] sm:max-w-[280px] truncate group ml-0.5"
              title="Click to choose, upload, or record audio"
            >
              <FileAudio className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate font-medium">{metadata ? metadata.fileName : 'Choose Audio Track...'}</span>
            </button>
          )}
        </div>

        {/* Right: Volume & Playback Rate */}
        <div className="flex items-center gap-4">
          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-neutral-950/80 rounded-lg p-0.5 border border-neutral-800">
            {[0.5, 1.0, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                id={`playback-rate-btn-${rate}x`}
                onClick={() => onPlaybackRateChange(rate)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded font-medium transition-all cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-neutral-800 text-cyan-400'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              id="audio-volume-slider"
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-18 sm:w-24 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
