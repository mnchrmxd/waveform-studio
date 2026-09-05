import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Sparkles, Download, Upload, Check, AlertCircle } from 'lucide-react';
import { AspectRatioType, ColorTheme, VisualizerSettings, WaveformData } from '../types';
import { OfflineAudioAnalyzer, SpectrumData } from '../services/fftAnalyzer';
import { renderVisualizerFrame } from '../services/visualizerRenderer';
import { audioEngine } from '../services/audioEngine';

interface VisualizerCanvasProps {
  buffer: AudioBuffer | null;
  waveformData: WaveformData | null;
  settings: VisualizerSettings;
  theme: ColorTheme;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (seconds: number) => void;
  backgroundImage?: HTMLImageElement | null;
  backgroundVideo?: HTMLVideoElement | null;
  backgroundVideoUrl?: string | null;
  backgroundBlur?: number;
  backgroundDim?: number;
  profileImage?: HTMLImageElement | null;
  onAspectRatioChange: (aspect: AspectRatioType) => void;
  onDropAudioFile?: (file: File) => void;
  onExportClick?: () => void;
  isExportDisabled?: boolean;
  onImportJson?: (jsonData: any) => void;
  onImportError?: (errorMessage: string) => void;
  importStatus?: { type: 'success' | 'error'; message: string } | null;
  onToggleProfile?: () => void;
  onToggleJoint?: () => void;
  onToggleTrackInfo?: () => void;
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  buffer,
  waveformData,
  settings,
  theme,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  backgroundImage,
  backgroundVideo,
  backgroundBlur = 10,
  backgroundDim = 0.6,
  profileImage,
  onAspectRatioChange,
  onDropAudioFile,
  onExportClick,
  isExportDisabled,
  onImportJson,
  onImportError,
  importStatus,
  onToggleProfile,
  onToggleJoint,
  onToggleTrackInfo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Cached offline analyzer for smooth offline/paused frame calculation
  const analyzerRef = useRef<OfflineAudioAnalyzer | null>(null);

  useEffect(() => {
    if (buffer) {
      analyzerRef.current = new OfflineAudioAnalyzer(buffer, 1024);
    } else {
      analyzerRef.current = null;
    }
  }, [buffer]);

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Main Render Loop (Responsive & High-DPI Canvas)
  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    let spectrum: SpectrumData;

    if (isPlaying && audioEngine.getAnalyser()) {
      // Live dynamic frequency data from Web Audio Analyser with smooth easing
      const analyser = audioEngine.getAnalyser()!;
      analyser.smoothingTimeConstant = Math.max(0.1, Math.min(0.95, settings.smoothing ?? 0.65));

      const freqArray = new Uint8Array(analyser.frequencyBinCount);
      const timeArray = new Uint8Array(analyser.fftSize);
      analyser.getByteFrequencyData(freqArray);
      analyser.getByteTimeDomainData(timeArray);

      const targetBands = settings.barCount || 120;
      const rawFrequencies = new Float32Array(targetBands);
      const sens = (settings.heightScale || 1.0) * (settings.sensitivity || 1.0);

      let bassSum = 0;
      let midSum = 0;
      let highSum = 0;
      const bassCutoff = Math.floor(targetBands * 0.15);
      const midCutoff = Math.floor(targetBands * 0.6);

      // Logarithmic / Mel frequency distribution
      const binCount = freqArray.length;
      for (let i = 0; i < targetBands; i++) {
        const frac = (i + 1) / targetBands;
        const bin = Math.min(binCount - 1, Math.max(1, Math.floor(Math.pow(frac, 1.85) * (binCount * 0.75))));
        let val = (freqArray[bin] / 255) * 1.35 * sens;

        // Equal-loudness tilt for musical balance
        const freqWeight = 1.0 + Math.sqrt(i / targetBands) * 0.55;
        val *= freqWeight;

        // Soft-knee analog saturation: smooth compression curve without hard plateau clipping
        if (settings.softKneeCompression !== false) {
          val = Math.tanh(val * 0.92) * 1.12;
        }

        val = Math.max(0.01, Math.min(1.0, val));

        rawFrequencies[i] = val;

        if (i < bassCutoff) bassSum += val;
        else if (i < midCutoff) midSum += val;
        else highSum += val;
      }

      // Spatial Gaussian 5-tap kernel smoothing for continuous wave fluidness
      const normalizedFrequencies = new Float32Array(targetBands);
      for (let i = 0; i < targetBands; i++) {
        const v0 = rawFrequencies[Math.max(0, i - 2)];
        const v1 = rawFrequencies[Math.max(0, i - 1)];
        const v2 = rawFrequencies[i];
        const v3 = rawFrequencies[Math.min(targetBands - 1, i + 1)];
        const v4 = rawFrequencies[Math.min(targetBands - 1, i + 2)];
        normalizedFrequencies[i] = v0 * 0.06 + v1 * 0.24 + v2 * 0.40 + v3 * 0.24 + v4 * 0.06;
      }

      const normalizedWaveform = new Float32Array(timeArray.length);
      for (let i = 0; i < timeArray.length; i++) {
        normalizedWaveform[i] = (timeArray[i] - 128) / 128;
      }

      spectrum = {
        frequencies: normalizedFrequencies,
        waveform: normalizedWaveform,
        bassEnergy: bassCutoff > 0 ? Math.min(1, (bassSum / bassCutoff) * 1.6) : 0,
        midEnergy: midCutoff - bassCutoff > 0 ? Math.min(1, midSum / (midCutoff - bassCutoff)) : 0,
        highEnergy: targetBands - midCutoff > 0 ? Math.min(1, highSum / (targetBands - midCutoff)) : 0,
        overallRms: 0.5,
      };
    } else if (analyzerRef.current && buffer) {
      // Deterministic offline calculation when paused or seeking
      spectrum = analyzerRef.current.getSpectrumAtTime(
        currentTime,
        settings.barCount || 120,
        settings.smoothing ?? 0.65,
        settings.softKneeCompression !== false,
        (settings.heightScale || 1.0) * (settings.sensitivity || 1.0)
      );
    } else {
      // Empty mock placeholder spectrum if no audio is loaded yet
      const count = settings.barCount || 120;
      const emptyFrequencies = new Float32Array(count);
      const now = performance.now() / 1000;
      for (let i = 0; i < count; i++) {
        emptyFrequencies[i] = Math.max(0.08, Math.sin(i * 0.1 + now * 2) * 0.2 + 0.25);
      }
      spectrum = {
        frequencies: emptyFrequencies,
        waveform: new Float32Array(count),
        bassEnergy: 0.2,
        midEnergy: 0.2,
        highEnergy: 0.2,
        overallRms: 0.2,
      };
    }

    renderVisualizerFrame({
      ctx,
      width: canvas.width,
      height: canvas.height,
      time: currentTime,
      duration: duration || 1,
      isPlaying,
      spectrum,
      waveformData,
      settings,
      theme,
      backgroundImage,
      backgroundVideo,
      backgroundBlur,
      backgroundDim,
      profileImage,
      isExport: false,
    });
  }, [buffer, currentTime, duration, isPlaying, settings, theme, backgroundImage, backgroundVideo, backgroundBlur, backgroundDim, profileImage, waveformData]);

  // Keep video playback synchronized with audio state
  useEffect(() => {
    if (!backgroundVideo) return;
    if (isPlaying) {
      backgroundVideo.play().catch(() => {});
    } else {
      backgroundVideo.pause();
    }
  }, [isPlaying, backgroundVideo]);

  // Sync video time on audio seek or drift
  useEffect(() => {
    if (!backgroundVideo || !backgroundVideo.duration || Number.isNaN(backgroundVideo.duration)) return;
    const target = (currentTime % backgroundVideo.duration);
    if (Math.abs(backgroundVideo.currentTime - target) > 0.35) {
      backgroundVideo.currentTime = target;
    }
  }, [currentTime, backgroundVideo]);

  // Continuous animation loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      drawCurrentFrame();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [drawCurrentFrame]);

  // Mouse interaction for seeking directly on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration || duration <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padding = settings.padding || 32;
    const x = e.clientX - rect.left;
    const drawWidth = rect.width - (padding / (canvas.width / rect.width)) * 2;
    const relativeX = x - (padding / (canvas.width / rect.width));
    const fraction = Math.max(0, Math.min(1, relativeX / drawWidth));
    onSeek(fraction * duration);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration || duration <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(fraction * duration);
  };

  // Drag & Drop audio handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.json') || file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result;
            if (typeof text !== 'string') return;
            const parsed = JSON.parse(text);
            onImportJson?.(parsed);
          } catch (err: any) {
            console.error('Failed to parse dropped JSON file:', err);
            onImportError?.(err.message || 'Invalid JSON syntax');
          }
        };
        reader.readAsText(file);
        return;
      }
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)) {
        onDropAudioFile?.(file);
      }
    }
  };

  const handleJsonFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') return;
        const parsed = JSON.parse(text);
        onImportJson?.(parsed);
      } catch (err: any) {
        console.error('Failed to parse JSON file:', err);
        onImportError?.(err.message || 'Invalid JSON syntax');
      }
    };
    reader.readAsText(file);
  };

  // Aspect ratio helper CSS class
  const getAspectRatioContainerStyle = (): React.CSSProperties => {
    switch (settings.aspectRatio) {
      case '9:16':
        return { aspectRatio: '9 / 16', maxHeight: '72vh', margin: '0 auto' };
      case '1:1':
        return { aspectRatio: '1 / 1', maxHeight: '72vh', margin: '0 auto' };
      case '21:9':
        return { aspectRatio: '21 / 9', width: '100%' };
      case '16:9':
      default:
        return { aspectRatio: '16 / 9', width: '100%' };
    }
  };

  return (
    <div
      ref={containerRef}
      id="visualizer-stage-container"
      className={`relative w-full rounded-2xl overflow-hidden bg-neutral-950 border transition-all ${
        isDragOver ? 'border-cyan-400 ring-4 ring-cyan-500/20' : 'border-neutral-800/80 shadow-2xl shadow-black/80'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Aspect Ratio & Stage Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Aspect Ratio Selector Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-800 pointer-events-auto shadow-lg">
          {(['16:9', '9:16', '1:1', '21:9'] as AspectRatioType[]).map((aspect) => (
            <button
              key={aspect}
              id={`aspect-ratio-btn-${aspect.replace(':', '-')}`}
              onClick={() => onAspectRatioChange(aspect)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer ${
                settings.aspectRatio === aspect
                  ? 'bg-cyan-500 text-black font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {aspect}
            </button>
          ))}
        </div>

        {/* Action Controls: Live Indicator & Fullscreen */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Live / Paused Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/80 backdrop-blur-md border border-neutral-800 text-xs font-medium text-neutral-300 shadow-lg">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
              }`}
            />
            <span className="font-mono text-[11px]">{isPlaying ? 'LIVE' : 'PAUSED'}</span>
          </div>

          <button
            id="visualizer-fullscreen-btn"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-md border border-neutral-800 text-neutral-300 hover:text-white transition-colors shadow-lg cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-cyan-950/80 backdrop-blur-sm border-2 border-dashed border-cyan-400 rounded-2xl flex flex-col items-center justify-center text-cyan-200 pointer-events-none animate-fadeIn">
          <Sparkles className="w-12 h-12 mb-2 animate-bounce text-cyan-300" />
          <p className="text-lg font-bold">Drop Audio File to Visualize</p>
          <p className="text-sm text-cyan-300/70 font-mono mt-1">MP3, WAV, FLAC, OGG, M4A supported</p>
        </div>
      )}

      {/* Canvas Viewport Frame */}
      <div
        className="w-full flex items-center justify-center p-2 sm:p-4 bg-gradient-to-b from-neutral-950 via-neutral-900/40 to-neutral-950"
        style={{ minHeight: '300px' }}
      >
        <div
          className={`relative w-full max-w-full flex items-center justify-center rounded-xl overflow-hidden shadow-2xl transition-all ${
            settings.backgroundType === 'transparent' ? 'transparency-checkerboard' : ''
          }`}
          style={getAspectRatioContainerStyle()}
        >
          <canvas
            ref={canvasRef}
            id="main-visualizer-canvas"
            className="w-full h-full block cursor-pointer select-none"
            onClick={handleCanvasClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => {
              setIsHovering(false);
              setHoverTime(null);
            }}
            onMouseMove={handleMouseMove}
          />

          {/* Hover Time Tooltip */}
          {isHovering && hoverTime !== null && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-neutral-900/90 backdrop-blur-md border border-neutral-700 text-xs font-mono text-cyan-400 pointer-events-none shadow-lg"
            >
              Click to seek: {Math.floor(hoverTime / 60)}:{Math.floor(hoverTime % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      </div>

      {/* Action Bar under Visualizer */}
      <div className="w-full px-3.5 sm:px-4 py-2.5 bg-neutral-950/90 border-t border-neutral-800/80 flex items-center justify-between gap-3 z-10">
        {/* Left: Import JSON button where user uploads JSON settings */}
        <div className="flex items-center gap-2.5 min-w-0">
          <input
            ref={jsonFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleJsonFileInputChange}
            className="hidden"
            id="visualizer-import-json-input"
          />
          <button
            type="button"
            id="visualizer-import-json-btn"
            onClick={() => jsonFileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-cyan-500/60 text-neutral-200 hover:text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 group shrink-0"
            title="Upload and apply custom JSON visualizer settings"
          >
            <Upload className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Import JSON</span>
          </button>

          {importStatus && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all truncate animate-fadeIn ${
                importStatus.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {importStatus.type === 'success' ? (
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              )}
              <span className="truncate">{importStatus.message}</span>
            </div>
          )}
        </div>

        {onExportClick && (
          <button
            id="visualizer-export-video-btn"
            onClick={onExportClick}
            disabled={isExportDisabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs shadow-lg transition-all cursor-pointer ${
              isExportDisabled
                ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 ring-1 ring-cyan-400/30 active:scale-[0.98]'
            }`}
            title="Export high-resolution MP4 or transparent Alpha WebM video"
          >
            <Download className="w-4 h-4" />
            <span>Export Video</span>
          </button>
        )}
      </div>
    </div>
  );
};
