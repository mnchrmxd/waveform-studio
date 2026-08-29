import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Zap,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
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

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioBuffer: AudioBuffer | null;
  waveformData: WaveformData | null;
  settings: VisualizerSettings;
  theme: ColorTheme;
  trimStart: number;
  trimEnd: number;
  backgroundImage?: HTMLImageElement | null;
  backgroundBlur?: number;
  backgroundDim?: number;
  profileImage?: HTMLImageElement | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  audioBuffer,
  waveformData,
  settings,
  theme,
  trimStart,
  trimEnd,
  backgroundImage,
  backgroundBlur,
  backgroundDim,
  profileImage,
}) => {
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [fps, setFps] = useState<30 | 60>(60);
  const [videoBitrate, setVideoBitrate] = useState<number>(8_000_000); // 8 Mbps
  const [audioBitrate] = useState<number>(192_000); // 192 kbps
  const [useTrim, setUseTrim] = useState<boolean>(false);

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
    }
  }, [isOpen]);

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
      trimStart: activeStart,
      trimEnd: activeEnd,
      settings,
      theme,
      backgroundImage,
      backgroundBlur,
      backgroundDim,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Fast Headless Video Export</h2>
              <p className="text-xs text-neutral-400">Offline WebCodecs hardware-accelerated MP4 rendering</p>
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
          {/* STATE 1: Configuration Form */}
          {!isExporting && !exportResult && (
            <>
              {/* Speed Highlight Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-neutral-900 border border-cyan-500/20 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-cyan-300">Blazing Fast Headless Processing</div>
                  <div className="text-neutral-400">
                    Frames are rasterized headlessly with zero UI delay and strictly bounded memory.
                  </div>
                </div>
              </div>

              {/* Format & Aspect Ratio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Format</label>
                  <div className="flex items-center gap-2 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
                    <button
                      id="format-mp4-btn"
                      onClick={() => setFormat('mp4')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        format === 'mp4'
                          ? 'bg-cyan-500 text-black shadow-sm font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      MP4 (H.264)
                    </button>
                    <button
                      id="format-webm-btn"
                      onClick={() => setFormat('webm')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        format === 'webm'
                          ? 'bg-cyan-500 text-black shadow-sm font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      WebM (VP9)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Aspect Ratio</label>
                  <div className="p-2 bg-neutral-900 rounded-xl border border-neutral-800 text-xs font-mono text-cyan-400 flex items-center justify-between">
                    <span className="font-semibold">{settings.aspectRatio}</span>
                    <span className="text-[11px] text-neutral-400 font-sans">
                      {settings.aspectRatio === '9:16'
                        ? 'TikTok/Reels'
                        : settings.aspectRatio === '1:1'
                        ? 'Instagram'
                        : 'YouTube 16:9'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resolution Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '720p', label: '720p HD', desc: 'Ultra Fast' },
                    { id: '1080p', label: '1080p FHD', desc: 'Crisp (Recommended)' },
                    { id: '4k', label: '4K Ultra', desc: 'Highest Detail' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      id={`resolution-btn-${res.id}`}
                      onClick={() => setResolution(res.id as ExportResolution)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        resolution === res.id
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="font-semibold text-xs text-white">{res.label}</span>
                      <span className="text-[10px] text-neutral-400">{res.desc}</span>
                    </button>
                  ))}
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
                          ? 'bg-neutral-800 text-cyan-400 border border-neutral-700'
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
                          ? 'bg-neutral-800 text-cyan-400 border border-neutral-700'
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
                <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
                  <Zap className="w-10 h-10" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="font-display font-bold text-lg text-white">Headless Video Rendering</h3>
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

          {/* STATE 3: Completed View with Video Preview & Download */}
          {!isExporting && exportResult && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              {/* Success Badge */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-xs text-emerald-300">Video Rendered Successfully!</div>
                    <div className="text-[11px] text-neutral-400">
                      Rendered in {exportResult.renderTimeSec}s at {exportResult.averageFps} FPS ({exportResult.speedRatio}x speed)
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-neutral-300">
                  {(exportResult.fileSize / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>

              {/* Video Player Preview */}
              <div className="relative rounded-xl overflow-hidden bg-black border border-neutral-800 shadow-xl max-h-[300px] flex items-center justify-center">
                <video
                  src={exportResult.url}
                  controls
                  autoPlay
                  loop
                  className="w-full max-h-[300px] object-contain block"
                />
              </div>

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
                  <span>Download {exportResult.fileName.endsWith('.mp4') ? 'MP4' : 'Video'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (only on config screen) */}
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

              <button
                id="start-headless-export-btn"
                onClick={handleStartExport}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer ring-1 ring-cyan-400/30"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Start Fast Export</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
