import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Zap,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  Layers,
  FileArchive,
  Info,
  Server,
  Code2,
  Terminal,
} from 'lucide-react';
import {
  fastVideoExporter,
  ExportConfig,
  ExportProgress,
  ExportResult,
  ExportResolution,
  ExportFormat,
} from '../services/fastVideoExporter';
import { ColorTheme, VisualizerSettings, WaveformData } from '../types';
import { PayloadGeneratorModal } from './PayloadGeneratorModal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioBuffer: AudioBuffer | null;
  audioUrl?: string | null;
  waveformData: WaveformData | null;
  settings: VisualizerSettings;
  theme: ColorTheme;
  trimStart: number;
  trimEnd: number;
  backgroundImage?: HTMLImageElement | null;
  backgroundImageUrl?: string | null;
  backgroundVideo?: HTMLVideoElement | null;
  backgroundVideoUrl?: string | null;
  backgroundBlur?: number;
  backgroundDim?: number;
  profileImage?: HTMLImageElement | null;
  profileImageUrl?: string | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  audioBuffer,
  audioUrl,
  waveformData,
  settings,
  theme,
  trimStart,
  trimEnd,
  backgroundImage,
  backgroundImageUrl,
  backgroundVideo,
  backgroundVideoUrl,
  backgroundBlur,
  backgroundDim,
  profileImage,
  profileImageUrl,
}) => {
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [exportAlpha, setExportAlpha] = useState<boolean>(
    settings.backgroundType === 'transparent'
  );
  const [fps, setFps] = useState<30 | 60>(60);
  const [videoBitrate, setVideoBitrate] = useState<number>(8_000_000); // 8 Mbps
  const [audioBitrate] = useState<number>(192_000); // 192 kbps
  const [useTrim, setUseTrim] = useState<boolean>(false);
  const [isPayloadModalOpen, setIsPayloadModalOpen] = useState<boolean>(false);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExportResult(null);
      setProgress(null);
      setErrorMessage(null);
      setIsExporting(false);
      const isInitialAlpha = settings.backgroundType === 'transparent';
      setExportAlpha(isInitialAlpha);
      if (isInitialAlpha) {
        setFormat('webm-alpha');
      } else {
        setFormat('mp4');
      }
    }
  }, [isOpen, settings.backgroundType]);

  if (!isOpen) return null;

  const duration = audioBuffer?.duration || 0;
  const activeStart = useTrim ? trimStart : 0;
  const activeEnd = useTrim ? trimEnd : duration;
  const exportDuration = Math.max(0.1, activeEnd - activeStart);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getExportDimensions = () => {
    const aspect = settings.aspectRatio || '16:9';
    const is1080p = resolution === '1080p';
    const is4k = resolution === '4k';
    const is720p = resolution === '720p';

    if (aspect === '9:16') {
      if (is4k) return { width: 2160, height: 3840 };
      if (is720p) return { width: 720, height: 1280 };
      return { width: 1080, height: 1920 };
    }

    if (aspect === '1:1') {
      if (is4k) return { width: 2160, height: 2160 };
      if (is720p) return { width: 720, height: 720 };
      return { width: 1080, height: 1080 };
    }

    if (aspect === '21:9') {
      if (is4k) return { width: 3840, height: 1646 };
      if (is720p) return { width: 1680, height: 720 };
      return { width: 2560, height: 1080 };
    }

    if (is4k) return { width: 3840, height: 2160 };
    if (is720p) return { width: 1280, height: 720 };
    return { width: 1920, height: 1080 };
  };

  const handleToggleAlpha = () => {
    const next = !exportAlpha;
    setExportAlpha(next);
    if (next) {
      // Switching to alpha mode: default to WebM Alpha
      if (format === 'mp4' || format === 'webm') {
        setFormat('webm-alpha');
      }
    } else {
      // Switching to standard mode: default to MP4
      if (format === 'webm-alpha' || format === 'png-sequence') {
        setFormat('mp4');
      }
    }
  };

  const handleStartExport = async () => {
    if (!audioBuffer) return;

    setIsExporting(true);
    setErrorMessage(null);
    setExportResult(null);

    const config: ExportConfig = {
      resolution,
      fps,
      videoBitrate,
      audioBitrate,
      format,
      exportAlpha,
      trimStart: activeStart,
      trimEnd: activeEnd,
      settings: exportAlpha ? { ...settings, backgroundType: 'transparent' } : settings,
      theme,
      backgroundImage: exportAlpha ? null : backgroundImage,
      backgroundVideo: exportAlpha ? null : backgroundVideo,
      backgroundBlur: exportAlpha ? 0 : backgroundBlur,
      backgroundDim: exportAlpha ? 0 : backgroundDim,
      profileImage,
    };

    try {
      const result = await fastVideoExporter.exportVideo(
        audioBuffer,
        waveformData,
        config,
        (p) => {
          setProgress(p);
        }
      );

      setExportResult(result);
      setIsExporting(false);
    } catch (err: unknown) {
      setIsExporting(false);
      const msg = err instanceof Error ? err.message : 'Unknown error during export.';
      setErrorMessage(msg);
    }
  };

  const handleCancelExport = () => {
    fastVideoExporter.cancel();
    setIsExporting(false);
    setProgress(null);
  };

  const handleDownload = () => {
    if (!exportResult) return;
    const a = document.createElement('a');
    a.href = exportResult.url;
    a.download = exportResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isZipExport = exportResult?.fileName.endsWith('.zip');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Video & Alpha Export Studio</h2>
              <p className="text-xs text-neutral-400">
                Hardware-accelerated MP4, WebM Alpha, and Headless REST API video generation
              </p>
            </div>
          </div>

          {!isExporting && (
            <button
              id="export-modal-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {/* Configuration Form */}
          {!isExporting && !exportResult && (
            <>
              {/* Alpha Transparency Toggle Card */}
              <div
                id="toggle-alpha-export-card"
                onClick={handleToggleAlpha}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  exportAlpha
                    ? 'bg-neutral-900 border-cyan-400/80 ring-2 ring-cyan-500/20 shadow-md shadow-cyan-500/10'
                    : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      exportAlpha
                        ? 'transparency-checkerboard border border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Transparent Background (Alpha Channel)</span>
                      {exportAlpha && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
                          ALPHA ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Renders transparent overlay for Premiere Pro, DaVinci Resolve, Final Cut & OBS
                    </div>
                  </div>
                </div>

                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                    exportAlpha ? 'bg-cyan-500' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      exportAlpha ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Format Selection based on Alpha state */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    Export Output Format
                  </label>
                  {exportAlpha && (
                    <span className="text-[11px] font-mono text-cyan-400">
                      Alpha Transparency Enabled
                    </span>
                  )}
                </div>

                {exportAlpha ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="format-webm-alpha-btn"
                      onClick={() => setFormat('webm-alpha')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        format === 'webm-alpha'
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">WebM Video (Alpha)</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Direct Video
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        Single video file with embedded alpha. Plays transparently in OBS & web browsers.
                      </span>
                    </button>

                    <button
                      id="format-png-sequence-btn"
                      onClick={() => setFormat('png-sequence')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        format === 'png-sequence'
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">PNG Sequence (.zip)</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          Universal NLE
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        100% Lossless RGBA frames + audio.wav. Native import in Premiere, DaVinci & Final Cut.
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="format-mp4-btn"
                      onClick={() => setFormat('mp4')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        format === 'mp4'
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">MP4 (H.264)</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-300 border border-neutral-800">
                          Universal
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        Compatible with YouTube, Instagram, TikTok, smartphones, and all video players.
                      </span>
                    </button>

                    <button
                      id="format-webm-btn"
                      onClick={() => setFormat('webm')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        format === 'webm'
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">WebM (VP9)</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-300 border border-neutral-800">
                          Modern Web
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        High-efficiency open web video format with superior compression.
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Resolution & Aspect Ratio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Resolution</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: '720p', label: '720p', desc: 'Fast' },
                      { id: '1080p', label: '1080p', desc: 'Crisp' },
                      { id: '4k', label: '4K', desc: 'Ultra' },
                    ].map((res) => (
                      <button
                        key={res.id}
                        id={`resolution-btn-${res.id}`}
                        onClick={() => setResolution(res.id as ExportResolution)}
                        className={`py-2 px-1.5 rounded-xl border text-center flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                          resolution === res.id
                            ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className="font-semibold text-xs text-white">{res.label}</span>
                        <span className="text-[9px] text-neutral-400">{res.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Aspect Ratio</label>
                  <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800 text-xs font-mono text-cyan-400 flex items-center justify-between h-[52px]">
                    <span className="font-semibold">{settings.aspectRatio}</span>
                    <span className="text-[11px] text-neutral-400 font-sans">
                      {settings.aspectRatio === '9:16'
                        ? 'TikTok/Reels'
                        : settings.aspectRatio === '1:1'
                        ? 'Instagram'
                        : 'Landscape 16:9'}
                    </span>
                  </div>
                </div>
              </div>

              {/* FPS & Quality */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Frame Rate</label>
                  <div className="flex items-center gap-2 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
                    <button
                      id="fps-60-btn"
                      onClick={() => setFps(60)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        fps === 60
                          ? 'bg-neutral-800 text-cyan-400 border border-neutral-700 shadow-sm font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      60 FPS (Fluid)
                    </button>
                    <button
                      id="fps-30-btn"
                      onClick={() => setFps(30)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        fps === 30
                          ? 'bg-neutral-800 text-cyan-400 border border-neutral-700 shadow-sm font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      30 FPS
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Video Bitrate</label>
                  <select
                    id="video-bitrate-select"
                    value={videoBitrate}
                    onChange={(e) => setVideoBitrate(parseInt(e.target.value))}
                    className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value={4_000_000}>4 Mbps (Compact)</option>
                    <option value={8_000_000}>8 Mbps (High Quality)</option>
                    <option value={16_000_000}>16 Mbps (Mastering)</option>
                  </select>
                </div>
              </div>

              {/* Time Range Selection */}
              <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-medium text-neutral-300">Export Length:</span>
                  <span className="font-mono text-white">{formatTime(exportDuration)}</span>
                </div>

                {trimEnd < duration || trimStart > 0 ? (
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                    <input
                      type="checkbox"
                      checked={useTrim}
                      onChange={(e) => setUseTrim(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <span>Use Trimmed Selection</span>
                  </label>
                ) : (
                  <span className="text-neutral-500 font-mono">Full Audio</span>
                )}
              </div>

              {/* Backdrop Summary Status */}
              <div className="px-3 py-2 rounded-xl bg-neutral-900/40 border border-neutral-800/80 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Rendering Backdrop:</span>
                <span className="font-medium text-cyan-300 font-mono">
                  {exportAlpha
                    ? 'Transparent Alpha (None)'
                    : backgroundVideo
                    ? 'Looping Video Active'
                    : backgroundImage
                    ? 'Image Artwork Active'
                    : settings.backgroundType === 'custom-solid'
                    ? `Solid Color (${settings.backgroundColor || '#09090b'})`
                    : settings.backgroundType}
                </span>
              </div>

              {/* Error Display */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Export Error: </span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STATE 2: Exporting Progress View */}
          {isExporting && progress && (
            <div className="flex flex-col items-center justify-center py-6 gap-5 animate-fadeIn text-center">
              {/* Pulse Speed Indicator */}
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center animate-pulse ${
                    exportAlpha ? 'transparency-checkerboard border-2 border-cyan-400 text-cyan-300' : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                  }`}
                >
                  {format === 'png-sequence' ? (
                    <FileArchive className="w-10 h-10" />
                  ) : (
                    <Zap className="w-10 h-10" />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="font-display font-bold text-lg text-white">
                  {format === 'png-sequence'
                    ? 'Rasterizing Transparent PNG Sequence'
                    : exportAlpha
                    ? 'Rendering Transparent Alpha Video'
                    : 'Headless Video Rendering'}
                </h3>
                <p className="text-xs text-cyan-400 font-mono">
                  {progress.speedMultiplier > 0
                    ? `⚡ ${progress.fps} FPS (${progress.speedMultiplier}x faster than real-time)`
                    : 'Encoding audio & initializing frames...'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full flex flex-col gap-2">
                <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-150 shadow-[0_0_12px_#06b6d4]"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                  <span>
                    Frame {progress.currentFrame} / {progress.totalFrames} ({progress.percentage}%)
                  </span>
                  <span>
                    {progress.elapsedSeconds}s elapsed • ~{progress.estimatedRemainingSeconds}s left
                  </span>
                </div>
              </div>

              <button
                id="cancel-export-btn"
                onClick={handleCancelExport}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors cursor-pointer mt-2"
              >
                Cancel Export
              </button>
            </div>
          )}

          {/* STATE 3: Completed View with Video Preview / Archive Info & Download */}
          {!isExporting && exportResult && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              {/* Success Badge */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-xs text-emerald-300">
                      {isZipExport
                        ? 'Transparent PNG Sequence Archive Ready!'
                        : exportAlpha
                        ? 'Transparent Alpha Video Rendered Successfully!'
                        : 'Video Rendered Successfully!'}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Rendered in {exportResult.renderTimeSec}s at {exportResult.averageFps} FPS ({exportResult.speedRatio}x speed)
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-neutral-300">
                  {(exportResult.fileSize / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>

              {/* Video Player Preview or ZIP Archive Card */}
              {isZipExport ? (
                <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
                      <FileArchive className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">ZIP Image Sequence Archive</div>
                      <div className="text-xs text-neutral-400 font-mono">
                        {exportResult.totalFrames} frames • {exportResult.width}×{exportResult.height} • + audio.wav
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 flex flex-col gap-1.5 leading-relaxed">
                    <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>How to import into video editors:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-neutral-400">
                      <li>
                        <strong className="text-neutral-200">Premiere Pro:</strong> File &gt; Import &gt; Click first PNG &gt; Check &apos;Image Sequence&apos; box.
                      </li>
                      <li>
                        <strong className="text-neutral-200">DaVinci Resolve:</strong> Drag the extracted frames folder straight into the Media Pool.
                      </li>
                      <li>
                        <strong className="text-neutral-200">Audio Sync:</strong> Place the bundled &apos;audio.wav&apos; on an audio track below the video.
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div
                    className={`relative rounded-xl overflow-hidden border border-neutral-800 shadow-xl max-h-[280px] flex items-center justify-center ${
                      exportAlpha ? 'transparency-checkerboard' : 'bg-black'
                    }`}
                  >
                    <video
                      src={exportResult.url}
                      controls
                      autoPlay
                      loop
                      className="w-full max-h-[280px] object-contain block"
                    />
                  </div>

                  {exportAlpha && (
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-400/90 font-mono px-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Alpha channel active: Checkerboard pattern indicates transparent pixels.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  id="export-another-btn"
                  onClick={() => setExportResult(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Configure Another</span>
                </button>

                <button
                  id="download-video-file-btn"
                  onClick={handleDownload}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 ring-1 ring-white/20"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download {isZipExport ? 'PNG Sequence (.ZIP)' : exportAlpha ? 'WebM Alpha Video' : 'Video File'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isExporting && !exportResult && (
          <div className="px-5 py-4 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between gap-3">
            <div className="text-xs text-neutral-400 font-mono">
              Est. Render Time:{' '}
              <span className="text-cyan-400 font-semibold">
                ~{Math.max(1, Math.round(exportDuration / 4))}–{Math.max(2, Math.round(exportDuration / 2))}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {/* Payload Generator Button next to Render */}
              <button
                id="open-payload-generator-btn"
                type="button"
                onClick={() => setIsPayloadModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white font-medium text-xs border border-neutral-700/80 hover:border-cyan-500/50 transition-all cursor-pointer"
                title="View headless cURL / JSON / Node payload for this visualizer"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Payload Generator</span>
              </button>

              <button
                id="start-headless-export-btn"
                onClick={handleStartExport}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer ring-1 ring-cyan-400/30 active:scale-[0.98]"
              >
                {format === 'png-sequence' ? (
                  <FileArchive className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4 fill-current" />
                )}
                <span>
                  {format === 'png-sequence'
                    ? 'Export PNG Sequence'
                    : exportAlpha
                    ? 'Export Alpha Video'
                    : 'Render'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payload Generator Modal */}
      {isPayloadModalOpen && (
        <PayloadGeneratorModal
          isOpen={isPayloadModalOpen}
          onClose={() => setIsPayloadModalOpen(false)}
          settings={exportAlpha ? { ...settings, backgroundType: 'transparent' } : settings}
          theme={theme}
          exportConfig={{
            width: getExportDimensions().width,
            height: getExportDimensions().height,
            fps,
            format: format === 'webm-alpha' || format === 'webm' ? 'webm' : 'mp4',
            duration: exportDuration,
            trimStart: activeStart,
            trimEnd: activeEnd,
            useTrim,
          }}
          audioBuffer={audioBuffer}
          audioUrl={audioUrl}
          profileImage={profileImage}
          profileImageUrl={profileImageUrl}
          backgroundImage={backgroundImage}
          backgroundImageUrl={backgroundImageUrl}
          backgroundVideo={backgroundVideo}
          backgroundVideoUrl={backgroundVideoUrl}
        />
      )}
    </div>
  );
};
