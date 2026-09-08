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
  Type,
  User,
  Grid,
  Cpu,
  Cloud,
} from 'lucide-react';
import {
  fastVideoExporter,
  audioBufferToWavBlob,
  ExportConfig,
  ExportProgress,
  ExportResult,
  ExportResolution,
  ExportFormat,
} from '../services/fastVideoExporter';
import { ColorTheme, VisualizerSettings, WaveformData } from '../types';
import { PayloadGeneratorModal } from './PayloadGeneratorModal';
import { useCloudStatus } from '../services/cloudDetection';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioBuffer: AudioBuffer | null;
  audioUrl?: string | null;
  waveformData: WaveformData | null;
  settings: VisualizerSettings;
  theme: ColorTheme;
  trimStart?: number;
  trimEnd?: number;
  backgroundImage?: HTMLImageElement | null;
  backgroundImageUrl?: string | null;
  backgroundVideo?: HTMLVideoElement | null;
  backgroundVideoUrl?: string | null;
  backgroundBlur?: number;
  backgroundDim?: number;
  profileImage?: HTMLImageElement | null;
  profileImageUrl?: string | null;
  onSettingsChange?: (newSettings: Partial<VisualizerSettings>) => void;
  jobId?: string | null;
  autoStart?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  audioBuffer,
  audioUrl,
  waveformData,
  settings,
  theme,
  backgroundImage,
  backgroundImageUrl,
  backgroundVideo,
  backgroundVideoUrl,
  backgroundBlur,
  backgroundDim,
  profileImage,
  profileImageUrl,
  onSettingsChange,
  jobId,
  autoStart,
}) => {
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [exportAlpha, setExportAlpha] = useState<boolean>(
    settings.backgroundType === 'transparent'
  );
  const [fps, setFps] = useState<30 | 60>(60);
  const [videoBitrate, setVideoBitrate] = useState<number>(8_000_000); // 8 Mbps
  const [audioBitrate] = useState<number>(192_000); // 192 kbps
  const [isPayloadModalOpen, setIsPayloadModalOpen] = useState<boolean>(false);

  // Debug Terminal Mode
  const [showDebugTerminal, setShowDebugTerminal] = useState<boolean>(false);
  const [debugLogs, setDebugLogs] = useState<
    Array<{ time: string; text: string; type?: 'info' | 'warn' | 'success' | 'frame' }>
  >([]);

  const addDebugLog = (
    text: string,
    type: 'info' | 'warn' | 'success' | 'frame' = 'info'
  ) => {
    const time = (performance.now() / 1000).toFixed(2) + 's';
    setDebugLogs((prev) => [...prev.slice(-150), { time, text, type }]);
  };

  // Unified Job ID (from prop, URL query param, or session)
  const [activeJobId, setActiveJobId] = useState<string | null>(() => {
    if (jobId) return jobId;
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('jobId');
    }
    return null;
  });

  // Direct element visibility toggles for export
  const [effectiveTrackInfo, setEffectiveTrackInfo] = useState<boolean>(Boolean(settings.showTrackInfo));
  const [effectiveProfileImage, setEffectiveProfileImage] = useState<boolean>(Boolean(settings.showProfileImage));
  const [effectiveDbGrid, setEffectiveDbGrid] = useState<boolean>(Boolean(settings.showDbGrid));

  const { isCloudAvailable } = useCloudStatus();
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renderEngine, setRenderEngine] = useState<'client' | 'server'>('client');
  const serverAbortRef = React.useRef<AbortController | null>(null);
  const serverSseRef = React.useRef<EventSource | null>(null);
  const serverJobIdRef = React.useRef<string | null>(null);
  const prevIsOpenRef = React.useRef<boolean>(false);

  // If cloud becomes unavailable, automatically fallback to client engine
  useEffect(() => {
    if (!isCloudAvailable && renderEngine === 'server') {
      setRenderEngine('client');
    }
  }, [isCloudAvailable, renderEngine]);

  // Initialize modal state ONLY when modal transitions from closed to open.
  // This prevents settings changes (like toggling dB grid) from re-triggering side-effects or resetting format/alpha.
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setEffectiveTrackInfo(Boolean(settings.showTrackInfo));
      setEffectiveProfileImage(Boolean(settings.showProfileImage));
      setEffectiveDbGrid(Boolean(settings.showDbGrid));

      const isInitialAlpha = settings.backgroundType === 'transparent';
      setExportAlpha(isInitialAlpha);
      if (isInitialAlpha) {
        setFormat('webm-alpha');
      } else {
        setFormat('mp4');
      }

      setExportResult(null);
      setProgress(null);
      setErrorMessage(null);
      setIsExporting(false);

      if (!isCloudAvailable) {
        setRenderEngine('client');
      }

      // Check URL for jobId if not already set
      if (!activeJobId && typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const jId = sp.get('jobId');
        if (jId) setActiveJobId(jId);
      }
    } else if (!isOpen && prevIsOpenRef.current) {
      if (isExporting) {
        handleCancelExport();
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, isCloudAvailable]);

  // Load external job payload if jobId is present
  useEffect(() => {
    if (!isOpen || !activeJobId) return;

    let isMounted = true;
    const loadJobDetails = async () => {
      try {
        addDebugLog(`Fetching job configuration for "${activeJobId}" from server...`, 'info');
        const res = await fetch(`/api/render-job/${activeJobId}`);
        if (!res.ok) {
          addDebugLog(`Job "${activeJobId}" not found on server (${res.status})`, 'warn');
          return;
        }
        const data = await res.json();
        const payload = data.payload || data;
        if (!isMounted) return;

        addDebugLog(`Loaded configuration for job "${activeJobId}".`, 'success');

        if (payload.video?.format) {
          setFormat(payload.video.format === 'webm' ? 'webm' : 'mp4');
        }
        if (payload.video?.fps) {
          setFps(payload.video.fps === 30 ? 30 : 60);
        }
        if (payload.video?.width) {
          if (payload.video.width >= 3840) setResolution('4k');
          else if (payload.video.width <= 1280) setResolution('720p');
          else setResolution('1080p');
        }
        if (payload.video?.videoBitrate) {
          setVideoBitrate(payload.video.videoBitrate);
        }
        if (payload.settings) {
          if (payload.settings.backgroundType === 'transparent') {
            setExportAlpha(true);
            setFormat('webm-alpha');
          }
          onSettingsChange?.(payload.settings);
        }

        // Auto-start export if requested via query or prop
        const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        if (autoStart || sp?.get('auto') === 'true') {
          setTimeout(() => {
            if (isMounted) {
              handleStartExport();
            }
          }, 300);
        }
      } catch (err: any) {
        addDebugLog(`Failed to load job "${activeJobId}": ${err.message}`, 'warn');
      }
    };

    loadJobDetails();
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeJobId, autoStart]);

  if (!isOpen) return null;

  const duration = audioBuffer?.duration || 0;
  const activeStart = 0;
  const activeEnd = duration;
  const exportDuration = duration;

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

  const handleServerExport = async () => {
    if (!audioBuffer) return;

    setIsExporting(true);
    setErrorMessage(null);
    setExportResult(null);

    const serverJobId = activeJobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    serverJobIdRef.current = serverJobId;
    addDebugLog(`Starting Cloud Server FFmpeg Render for job "${serverJobId}"...`, 'info');

    const totalEstFrames = Math.round(exportDuration * fps);
    setProgress({
      currentFrame: 0,
      totalFrames: totalEstFrames,
      percentage: 2,
      fps: 0,
      speedMultiplier: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: Number((exportDuration * 0.7).toFixed(1)),
      status: 'preparing',
    });

    // 1. Prepare high-fidelity audio track as base64 data URL
    addDebugLog('Encoding lossless WAV track for cloud renderer...', 'info');
    let audioBase64 = '';
    try {
      const wavBlob = audioBufferToWavBlob(audioBuffer, activeStart, activeEnd);
      audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(wavBlob);
      });
      addDebugLog(`Lossless audio ready (${(audioBase64.length / 1024).toFixed(0)} KB)`, 'info');
    } catch (wavErr: any) {
      addDebugLog(`Failed to prepare audio: ${wavErr.message}`, 'warn');
      setIsExporting(false);
      setErrorMessage(`Audio processing error: ${wavErr.message}`);
      return;
    }

    // 2. Connect to SSE stream for live progress tracking
    const sse = new EventSource(`/api/render-progress/${serverJobId}`);
    serverSseRef.current = sse;
    const startRenderTime = performance.now();

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== undefined) {
          const elapsed = (performance.now() - startRenderTime) / 1000;
          const pct = Math.max(2, Math.min(99, data.progress));
          const estTotal = pct > 0 ? (elapsed / pct) * 100 : 0;
          const rem = Math.max(0, estTotal - elapsed);

          setProgress({
            currentFrame: data.currentFrame || Math.round((pct / 100) * totalEstFrames),
            totalFrames: data.totalFrames || totalEstFrames,
            percentage: pct,
            fps: data.fps || 0,
            speedMultiplier: data.fps ? Number((data.fps / fps).toFixed(1)) : 1,
            elapsedSeconds: Number(elapsed.toFixed(1)),
            estimatedRemainingSeconds: Number(rem.toFixed(1)),
            status: data.status === 'completed' ? 'finalizing' : 'rendering-video',
          });

          if (data.message && data.progress % 10 === 0) {
            addDebugLog(`[Cloud Engine] ${data.message}`, 'frame');
          }
        }
      } catch {}
    };

    const abortCtrl = new AbortController();
    serverAbortRef.current = abortCtrl;

    const dims = getExportDimensions();
    const exportSettings: VisualizerSettings = {
      ...settings,
      showTrackInfo: effectiveTrackInfo,
      showProfileImage: effectiveProfileImage,
      showDbGrid: effectiveDbGrid,
    };

    const serverFormat = format === 'webm-alpha' ? 'webm' : format === 'png-sequence' ? 'mp4' : format;
    const isMp4 = serverFormat === 'mp4';
    const serverPayload = {
      jobId: serverJobId,
      audio: audioBase64,
      video: {
        width: dims.width,
        height: dims.height,
        fps,
        format: serverFormat,
        bitrate: Math.round(videoBitrate / 1000),
      },
      settings: exportAlpha ? { ...exportSettings, backgroundType: 'transparent' } : exportSettings,
      theme,
      trimStart: activeStart,
      trimEnd: activeEnd,
      profileImage: effectiveProfileImage ? profileImageUrl || profileImage?.src : undefined,
      backgroundImage: !exportAlpha ? backgroundImageUrl || backgroundImage?.src : undefined,
    };

    try {
      addDebugLog('Dispatching rendering job to backend FFmpeg pipeline...', 'info');
      const res = await fetch(`/api/render-video?jobId=${serverJobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverPayload),
        signal: abortCtrl.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server render error (${res.status}): ${errText}`);
      }

      addDebugLog('Cloud render complete! Streaming finalized video binary...', 'success');
      const blob = await res.blob();
      sse.close();
      serverSseRef.current = null;

      const videoUrl = URL.createObjectURL(blob);
      const totalRenderTime = Number(((performance.now() - startRenderTime) / 1000).toFixed(1));
      const avgFps = Math.round(totalEstFrames / Math.max(0.1, totalRenderTime));

      const cleanTitle = (settings.trackTitle || 'visualizer').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const alphaTag = exportAlpha ? '_alpha' : '';
      const fileName = `${cleanTitle}${alphaTag}_${resolution}_${fps}fps.${isMp4 ? 'mp4' : 'webm'}`;

      const finalResult: ExportResult = {
        blob,
        url: videoUrl,
        fileName,
        fileSize: blob.size,
        duration: exportDuration,
        renderTimeSec: totalRenderTime,
        averageFps: avgFps,
        totalFrames: totalEstFrames,
        width: dims.width,
        height: dims.height,
      };

      setExportResult(finalResult);
      setIsExporting(false);
      addDebugLog(`Cloud export succeeded: ${(blob.size / (1024 * 1024)).toFixed(2)} MB in ${totalRenderTime}s`, 'success');
    } catch (serverErr: any) {
      sse.close();
      serverSseRef.current = null;
      if (abortCtrl.signal.aborted) {
        addDebugLog('Server render cancelled by user.', 'warn');
        setIsExporting(false);
        setProgress(null);
        setErrorMessage(null);
        return;
      }
      setIsExporting(false);
      setProgress(null);
      setErrorMessage(serverErr.message || 'Server rendering failed.');
      addDebugLog(`Server render error: ${serverErr.message}`, 'warn');
    }
  };

  const handleStartExport = async () => {
    if (!audioBuffer) return;

    if (renderEngine === 'server') {
      if (!isCloudAvailable) {
        setRenderEngine('client');
      } else {
        return handleServerExport();
      }
    }

    setIsExporting(true);
    setErrorMessage(null);
    setExportResult(null);

    const dims = getExportDimensions();
    addDebugLog(`Initializing render pipeline: ${dims.width}x${dims.height} @ ${fps} FPS (${format})`, 'info');
    addDebugLog(`Audio stream loaded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels} channels`, 'info');

    const exportSettings: VisualizerSettings = {
      ...settings,
      showTrackInfo: effectiveTrackInfo,
      showProfileImage: effectiveProfileImage,
      showDbGrid: effectiveDbGrid,
      backgroundType: exportAlpha ? 'transparent' : settings.backgroundType,
    };

    const config: ExportConfig = {
      resolution,
      fps,
      videoBitrate,
      audioBitrate,
      format,
      exportAlpha,
      trimStart: activeStart,
      trimEnd: activeEnd,
      settings: exportSettings,
      theme,
      backgroundImage: exportAlpha ? null : backgroundImage,
      backgroundVideo: exportAlpha ? null : backgroundVideo,
      backgroundBlur: exportAlpha ? 0 : backgroundBlur,
      backgroundDim: exportAlpha ? 0 : backgroundDim,
      profileImage: effectiveProfileImage ? profileImage : null,
    };

    try {
      const result = await fastVideoExporter.exportVideo(
        audioBuffer,
        waveformData,
        config,
        (p) => {
          setProgress(p);

          // Report progress to local server if jobId exists
          if (activeJobId && (p.currentFrame % 30 === 0 || p.currentFrame === p.totalFrames)) {
            fetch(`/api/render-progress/${activeJobId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                currentFrame: p.currentFrame,
                totalFrames: p.totalFrames,
                progress: p.percentage,
                fps: p.fps,
                elapsedSec: Number(p.elapsedSeconds.toFixed(1)),
                status: p.status,
                message: `Rendering frames in browser: ${p.percentage}% (${p.fps} FPS)`,
              }),
            }).catch(() => {});
          }

          if (p.currentFrame % 60 === 0 && p.currentFrame > 0) {
            addDebugLog(`Frame ${p.currentFrame}/${p.totalFrames} (${p.percentage}%) • ${p.fps} FPS`, 'frame');
          }
        }
      );

      setExportResult(result);
      setIsExporting(false);
      addDebugLog(
        `Render completed! ${result.fileName} (${(result.blob.size / (1024 * 1024)).toFixed(2)} MB) in ${result.renderTimeSec}s @ ${result.averageFps} FPS`,
        'success'
      );

      // Upload completed video to local server if jobId is present
      if (activeJobId) {
        addDebugLog(`Uploading rendered file to server for job ${activeJobId}...`, 'info');
        try {
          const fd = new FormData();
          fd.append('video', result.blob, result.fileName);
          fd.append('mimeType', result.fileName.endsWith('.mp4') ? 'video/mp4' : 'video/webm');
          await fetch(`/api/render-complete/${activeJobId}`, {
            method: 'POST',
            body: fd,
          });
          addDebugLog(`File uploaded to server. Available for download at /api/render-download/${activeJobId}`, 'success');
        } catch (uploadErr: any) {
          addDebugLog(`Notice: Server upload returned ${uploadErr.message}`, 'warn');
        }
      }
    } catch (err: unknown) {
      setIsExporting(false);
      setProgress(null);
      const isAbort =
        fastVideoExporter.isAborted() ||
        (err instanceof Error &&
          (err.name === 'AbortError' ||
            err.message.toLowerCase().includes('cancel') ||
            err.message.toLowerCase().includes('abort')));
      if (isAbort) {
        setErrorMessage(null);
        addDebugLog('Export cancelled cleanly by user.', 'info');
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error during export.';
        setErrorMessage(msg);
        addDebugLog(`Export error: ${msg}`, 'warn');
      }
    }
  };

  const handleCancelExport = () => {
    if (renderEngine === 'server') {
      serverAbortRef.current?.abort();
      serverSseRef.current?.close();
      serverSseRef.current = null;
    } else {
      fastVideoExporter.cancel();
    }
    setIsExporting(false);
    setProgress(null);
    setErrorMessage(null);
    setExportResult(null);
    addDebugLog('Export cancelled by user', 'warn');
    const targetJobId = serverJobIdRef.current || activeJobId;
    if (targetJobId) {
      fetch(`/api/render-cancel/${targetJobId}`, { method: 'POST' }).catch(() => {});
      fetch(`/api/render-progress/${targetJobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'canceled',
          message: 'Export cancelled in browser',
        }),
      }).catch(() => {});
    }
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
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <h2 className="font-display font-bold text-sm text-white">Export Video</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Debug Mode Toggle Button */}
            <button
              id="toggle-debug-terminal-btn"
              type="button"
              onClick={() => setShowDebugTerminal(!showDebugTerminal)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                showDebugTerminal
                  ? 'bg-neutral-800 border-cyan-500/60 text-cyan-300 shadow-sm'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
              title="Toggle debug terminal"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Debug</span>
            </button>

            {/* Header Close Button */}
            <button
              id="export-modal-header-close-btn"
              type="button"
              onClick={() => {
                if (isExporting) {
                  handleCancelExport();
                }
                onClose();
              }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {/* Debug Console Terminal (Toggled by Debug Mode) */}
          {showDebugTerminal && (
            <div className="p-3 bg-black/95 rounded-xl border border-neutral-800/90 font-mono text-[11px] flex flex-col gap-1.5 shadow-inner">
              <div className="flex items-center justify-between text-neutral-400 pb-1.5 border-b border-neutral-800">
                <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Execution & WebCodecs Debugger</span>
                  {activeJobId && (
                    <span className="text-[10px] text-neutral-500 font-normal">
                      (Job ID: {activeJobId})
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setDebugLogs([])}
                  className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1 select-text scrollbar-thin">
                {debugLogs.length === 0 ? (
                  <span className="text-neutral-600 italic">No telemetry logged yet. Ready to export.</span>
                ) : (
                  debugLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 leading-tight">
                      <span className="text-neutral-500 shrink-0 select-none">[{log.time}]</span>
                      <span
                        className={
                          log.type === 'success'
                            ? 'text-emerald-400'
                            : log.type === 'warn'
                            ? 'text-amber-400'
                            : log.type === 'frame'
                            ? 'text-cyan-400'
                            : 'text-neutral-300'
                        }
                      >
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {/* Configuration Form */}
          {!isExporting && !exportResult && (
            <>
              {/* Engine Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Engine
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="engine-client-btn"
                    type="button"
                    onClick={() => setRenderEngine('client')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      renderEngine === 'client'
                        ? 'bg-neutral-900 border-cyan-400 ring-2 ring-cyan-500/20 text-white'
                        : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Cpu className={`w-4 h-4 ${renderEngine === 'client' ? 'text-cyan-400' : 'text-neutral-500'}`} />
                      <span className="font-semibold text-xs text-white">Client GPU</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                      Fast
                    </span>
                  </button>

                  <button
                    id="engine-server-btn"
                    type="button"
                    disabled={!isCloudAvailable}
                    onClick={() => {
                      if (isCloudAvailable) {
                        setRenderEngine('server');
                      }
                    }}
                    title={
                      !isCloudAvailable
                        ? 'Node.js cloud server is not available in this environment'
                        : 'Render headlessly on the cloud server'
                    }
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      !isCloudAvailable
                        ? 'bg-neutral-900/20 border-neutral-800/40 text-neutral-600 cursor-not-allowed opacity-50'
                        : renderEngine === 'server'
                        ? 'bg-neutral-900 border-blue-400 ring-2 ring-blue-500/20 text-white cursor-pointer'
                        : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Cloud
                        className={`w-4 h-4 ${
                          !isCloudAvailable
                            ? 'text-neutral-600'
                            : renderEngine === 'server'
                            ? 'text-blue-400'
                            : 'text-neutral-500'
                        }`}
                      />
                      <span
                        className={`font-semibold text-xs ${
                          !isCloudAvailable ? 'text-neutral-500' : 'text-white'
                        }`}
                      >
                        Cloud Server
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        !isCloudAvailable
                          ? 'bg-neutral-900/80 text-neutral-500 border-neutral-800/60'
                          : 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                      }`}
                    >
                      {!isCloudAvailable ? 'Unavailable' : 'Zero RAM'}
                    </span>
                  </button>
                </div>
                {!isCloudAvailable && (
                  <div className="flex items-center gap-1.5 px-0.5 pt-0.5 text-[11px] text-neutral-500">
                    <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span>No Node.js environment detected. Cloud rendering is disabled.</span>
                  </div>
                )}
              </div>

              {/* Alpha Transparency Toggle Card */}
              <div
                id="toggle-alpha-export-card"
                onClick={handleToggleAlpha}
                className={`p-2.5 px-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  exportAlpha
                    ? 'bg-neutral-900 border-cyan-400/80 ring-2 ring-cyan-500/20 shadow-md shadow-cyan-500/10'
                    : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      exportAlpha
                        ? 'transparency-checkerboard border border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white">
                    Transparent Background (Alpha)
                  </span>
                </div>

                <div
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                    exportAlpha ? 'bg-cyan-500' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      exportAlpha ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Format Selection based on Alpha state */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300">Format</label>
                {exportAlpha ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="format-webm-alpha-btn"
                      onClick={() => setFormat('webm-alpha')}
                      className={`p-2.5 rounded-xl border text-center font-semibold text-xs transition-all cursor-pointer ${
                        format === 'webm-alpha'
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      WebM (Alpha)
                    </button>
                    <button
                      id="format-png-sequence-btn"
                      onClick={() => setFormat('png-sequence')}
                      className={`p-2.5 rounded-xl border text-center font-semibold text-xs transition-all cursor-pointer ${
                        format === 'png-sequence'
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      PNG Sequence (.zip)
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="format-mp4-btn"
                      onClick={() => setFormat('mp4')}
                      className={`p-2.5 rounded-xl border text-center font-semibold text-xs transition-all cursor-pointer ${
                        format === 'mp4'
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      MP4 (H.264)
                    </button>
                    <button
                      id="format-webm-btn"
                      onClick={() => setFormat('webm')}
                      className={`p-2.5 rounded-xl border text-center font-semibold text-xs transition-all cursor-pointer ${
                        format === 'webm'
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      WebM (VP9)
                    </button>
                  </div>
                )}
              </div>

              {/* Resolution & Aspect Ratio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Resolution</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['720p', '1080p', '4k'].map((res) => (
                      <button
                        key={res}
                        id={`resolution-btn-${res}`}
                        onClick={() => setResolution(res as ExportResolution)}
                        className={`py-2 px-1 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                          resolution === res
                            ? 'bg-neutral-800 border-cyan-400 text-white ring-2 ring-cyan-500/20'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        {res.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Aspect Ratio</label>
                  <div className="p-2 px-3 bg-neutral-900 rounded-xl border border-neutral-800 text-xs font-mono text-cyan-400 flex items-center justify-between h-[38px]">
                    <span className="font-semibold">{settings.aspectRatio}</span>
                    <span className="text-[11px] text-neutral-400 font-sans">
                      {settings.aspectRatio === '9:16'
                        ? 'Vertical'
                        : settings.aspectRatio === '1:1'
                        ? 'Square'
                        : 'Landscape'}
                    </span>
                  </div>
                </div>
              </div>

              {/* FPS & Quality */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Frame Rate</label>
                  <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800 h-[38px]">
                    <button
                      id="fps-60-btn"
                      onClick={() => setFps(60)}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        fps === 60
                          ? 'bg-neutral-800 text-cyan-400 border border-neutral-700 shadow-sm font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      60 FPS
                    </button>
                    <button
                      id="fps-30-btn"
                      onClick={() => setFps(30)}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
                    className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:border-cyan-500 focus:outline-none cursor-pointer h-[38px]"
                  >
                    <option value={4_000_000}>4 Mbps</option>
                    <option value={8_000_000}>8 Mbps</option>
                    <option value={16_000_000}>16 Mbps</option>
                  </select>
                </div>
              </div>

              {/* Visual Overlays */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300">Visual Overlays</label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    id="export-toggle-track-info"
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      effectiveTrackInfo
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      <Type className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate font-medium">Track Info</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={effectiveTrackInfo}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEffectiveTrackInfo(checked);
                        onSettingsChange?.({ showTrackInfo: checked });
                      }}
                      className="rounded accent-indigo-500 shrink-0"
                    />
                  </label>

                  <label
                    id="export-toggle-profile-avatar"
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      effectiveProfileImage
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate font-medium">Profile Pic</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={effectiveProfileImage}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEffectiveProfileImage(checked);
                        onSettingsChange?.({ showProfileImage: checked });
                      }}
                      className="rounded accent-amber-500 shrink-0"
                    />
                  </label>

                  <label
                    id="export-toggle-db-grid"
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      effectiveDbGrid
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      <Grid className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate font-medium">dB Grid</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={effectiveDbGrid}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEffectiveDbGrid(checked);
                        onSettingsChange?.({ showDbGrid: checked });
                      }}
                      className="rounded accent-cyan-500 shrink-0"
                    />
                  </label>
                </div>
              </div>

              {/* Compact Meta Summary Bar */}
              <div className="px-3 py-2 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono text-neutral-200">{formatTime(duration)}</span>
                </div>
                <div className="font-mono text-[11px] text-neutral-400 truncate max-w-[200px]">
                  {exportAlpha ? 'Alpha' : settings.backgroundType}
                </div>
              </div>

              {/* Error Display */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Export Error Encountered: </span>
                      <span>{errorMessage}</span>
                    </div>
                  </div>

                  {renderEngine === 'client' && isCloudAvailable && (
                    <div className="pt-1 flex items-center justify-between gap-3 border-t border-rose-500/20">
                      <span className="text-[11px] text-rose-300/80">
                        Browser memory exhausted or GPU driver reset?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRenderEngine('server');
                          setErrorMessage(null);
                          setTimeout(() => {
                            handleServerExport();
                          }, 50);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Switch to Cloud Server & Retry</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* STATE 2: Exporting Progress View */}
          {isExporting && progress && (
            <div className="flex flex-col items-center justify-center py-5 px-2 gap-5 animate-fadeIn">
              {/* Radial Progress Ring with Percentage Display */}
              <div className="relative flex items-center justify-center">
                {/* Ambient backdrop glow */}
                <div className="absolute w-36 h-36 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none" />

                <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 120 120">
                  {/* Track ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    className="stroke-neutral-800/80"
                    strokeWidth="6"
                    fill="none"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    className="stroke-cyan-400 transition-all duration-200 ease-out"
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * (1 - Math.min(Math.max(progress.percentage / 100, 0), 1))}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>

                {/* Inner Content inside ring */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-display font-black text-3xl text-white tracking-tight">
                    {progress.percentage}%
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
                    {progress.currentFrame}/{progress.totalFrames}
                  </span>
                </div>
              </div>

              {/* Status Header */}
              <div className="text-center flex flex-col gap-1 max-w-md">
                <h3 className="font-display font-bold text-base text-white">
                  {format === 'png-sequence'
                    ? 'Exporting PNG Sequence'
                    : exportAlpha
                    ? 'Exporting Transparent Video'
                    : 'Exporting Video'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {progress.fps > 0
                    ? renderEngine === 'server'
                      ? 'Rendering on cloud server'
                      : 'Rendering frames with GPU acceleration'
                    : 'Initializing audio & encoder...'}
                </p>
              </div>

              {/* Metric Bento Cards (4 columns) */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Speed</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-white">
                      {progress.fps > 0 ? `${progress.fps} FPS` : '—'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Remaining</span>
                  <span className="font-mono text-xs font-semibold text-cyan-300">
                    {progress.estimatedRemainingSeconds !== undefined
                      ? progress.estimatedRemainingSeconds > 60
                        ? `~${Math.floor(progress.estimatedRemainingSeconds / 60)}m ${Math.round(progress.estimatedRemainingSeconds % 60)}s`
                        : `~${Math.round(progress.estimatedRemainingSeconds)}s`
                      : '—'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Elapsed</span>
                  <span className="font-mono text-xs font-semibold text-neutral-200">
                    {progress.elapsedSeconds.toFixed(1)}s
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Engine</span>
                  <span className="font-mono text-xs font-semibold text-neutral-200">
                    {renderEngine === 'server' ? 'Cloud Server' : 'Client GPU'}
                  </span>
                </div>
              </div>

              {/* Cancel Button */}
              <div className="pt-1">
                <button
                  id="cancel-export-btn"
                  onClick={handleCancelExport}
                  className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-xs font-medium text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  Cancel Export
                </button>
              </div>
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
                      Rendered in {exportResult.renderTimeSec}s at {exportResult.averageFps} FPS
                      {activeJobId && (
                        <span className="ml-2 text-cyan-400 font-mono text-[10px]">
                          • Synced with job {activeJobId}
                        </span>
                      )}
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
                      preload="metadata"
                      playsInline
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
          <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between gap-3">
            <button
              id="export-modal-cancel-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-800 hover:border-neutral-700"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {/* Payload Generator Button next to Export */}
              <button
                id="open-payload-generator-btn"
                type="button"
                onClick={() => setIsPayloadModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-medium text-xs border border-neutral-700/80 hover:border-cyan-500/50 transition-all cursor-pointer"
                title="View headless cURL / JSON payload"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Payload</span>
              </button>

              <button
                id="start-headless-export-btn"
                onClick={handleStartExport}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white font-bold text-xs shadow-lg transition-all cursor-pointer ring-1 active:scale-[0.98] ${
                  renderEngine === 'server'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 ring-blue-400/30'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25 ring-cyan-400/30'
                }`}
              >
                {format === 'png-sequence' ? (
                  <FileArchive className="w-4 h-4" />
                ) : renderEngine === 'server' ? (
                  <Cloud className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4 fill-current" />
                )}
                <span>Export</span>
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
