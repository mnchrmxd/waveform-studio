import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Copy,
  Check,
  Terminal,
  Code2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ColorTheme, VisualizerSettings } from '../types';
import { audioBufferToWavBlob } from '../services/fastVideoExporter';
import { useCloudStatus } from '../services/cloudDetection';

export interface ExportConfiguration {
  width: number;
  height: number;
  fps: number;
  format: 'mp4' | 'webm';
  duration?: number;
  trimStart?: number;
  trimEnd?: number;
  useTrim?: boolean;
}

interface PayloadGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VisualizerSettings;
  theme: ColorTheme;
  exportConfig: ExportConfiguration;
  audioBuffer: AudioBuffer | null;
  audioUrl?: string | null;
  profileImage?: HTMLImageElement | null;
  profileImageUrl?: string | null;
  backgroundImage?: HTMLImageElement | null;
  backgroundImageUrl?: string | null;
  backgroundVideo?: HTMLVideoElement | null;
  backgroundVideoUrl?: string | null;
}

export const PayloadGeneratorModal: React.FC<PayloadGeneratorModalProps> = ({
  isOpen,
  onClose,
  settings,
  theme,
  exportConfig,
  audioBuffer,
  audioUrl,
  profileImage,
  profileImageUrl,
  backgroundImage,
  backgroundImageUrl,
  backgroundVideo,
  backgroundVideoUrl,
}) => {
  // The user requested NO MORE EDITS beyond the format (cURL, JSON, Node)
  const { isCloudAvailable } = useCloudStatus();
  const [activeFormat, setActiveFormat] = useState<'curl' | 'json'>('curl');
  const [copied, setCopied] = useState(false);
  const [isServerRendering, setIsServerRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{
    percentage: number;
    currentFrame?: number;
    totalFrames?: number;
    fps?: number;
  } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  // Auto-encode local audio / images to base64 if no remote URL was provided
  const [localAudioBase64, setLocalAudioBase64] = useState<string | null>(null);
  const [localProfileBase64, setLocalProfileBase64] = useState<string | null>(null);
  const [localBgBase64, setLocalBgBase64] = useState<string | null>(null);
  const [isPreparingAssets, setIsPreparingAssets] = useState(false);

  // Determine if assets originate from a URL (remote preset or user-provided link)
  const isAudioUrl = Boolean(
    audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://'))
  );
  const effectiveAudioUrl = isAudioUrl ? audioUrl : null;

  const isProfileUrl = Boolean(
    (profileImageUrl && (profileImageUrl.startsWith('http://') || profileImageUrl.startsWith('https://'))) ||
    (profileImage?.src && (profileImage.src.startsWith('http://') || profileImage.src.startsWith('https://')))
  );
  const effectiveProfileUrl = isProfileUrl
    ? (profileImageUrl && (profileImageUrl.startsWith('http://') || profileImageUrl.startsWith('https://'))
        ? profileImageUrl
        : profileImage?.src || null)
    : null;

  const isBackgroundUrl = Boolean(
    (backgroundVideoUrl && (backgroundVideoUrl.startsWith('http://') || backgroundVideoUrl.startsWith('https://'))) ||
    (backgroundVideo?.src && (backgroundVideo.src.startsWith('http://') || backgroundVideo.src.startsWith('https://'))) ||
    (backgroundImageUrl && (backgroundImageUrl.startsWith('http://') || backgroundImageUrl.startsWith('https://'))) ||
    (backgroundImage?.src && (backgroundImage.src.startsWith('http://') || backgroundImage.src.startsWith('https://')))
  );
  const effectiveBackgroundUrl = isBackgroundUrl
    ? (backgroundVideoUrl && (backgroundVideoUrl.startsWith('http://') || backgroundVideoUrl.startsWith('https://'))
        ? backgroundVideoUrl
        : (backgroundVideo?.src && (backgroundVideo.src.startsWith('http://') || backgroundVideo.src.startsWith('https://')))
          ? backgroundVideo.src
          : (backgroundImageUrl && (backgroundImageUrl.startsWith('http://') || backgroundImageUrl.startsWith('https://')))
            ? backgroundImageUrl
            : backgroundImage?.src || null)
    : null;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const prepareAssets = async () => {
      setIsPreparingAssets(true);
      try {
        // 1. Audio: ONLY generate base64 if audio is NOT from a URL
        if (!isAudioUrl && audioBuffer) {
          try {
            const wavBlob = audioBufferToWavBlob(
              audioBuffer,
              0,
              audioBuffer.duration
            );
            const reader = new FileReader();
            reader.onloadend = () => {
              if (isMounted) setLocalAudioBase64(reader.result as string);
            };
            reader.readAsDataURL(wavBlob);
          } catch (e) {
            console.warn('Audio base64 conversion deferred:', e);
          }
        }

        // 2. Profile Image: ONLY generate base64 if image is NOT from a URL
        if (!isProfileUrl && profileImage && profileImage.src) {
          if (profileImage.src.startsWith('data:')) {
            if (isMounted) setLocalProfileBase64(profileImage.src);
          } else if (profileImage.src.startsWith('blob:')) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = profileImage.naturalWidth || 200;
              canvas.height = profileImage.naturalHeight || 200;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(profileImage, 0, 0);
                if (isMounted) setLocalProfileBase64(canvas.toDataURL('image/png'));
              }
            } catch (e) {
              console.warn('Profile canvas toDataURL error (CORS):', e);
            }
          }
        }

        // 3. Background Image: ONLY generate base64 if background is NOT from a URL
        if (!isBackgroundUrl && backgroundImage && backgroundImage.src) {
          if (backgroundImage.src.startsWith('data:')) {
            if (isMounted) setLocalBgBase64(backgroundImage.src);
          } else if (backgroundImage.src.startsWith('blob:')) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = backgroundImage.naturalWidth || 800;
              canvas.height = backgroundImage.naturalHeight || 450;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(backgroundImage, 0, 0);
                if (isMounted) setLocalBgBase64(canvas.toDataURL('image/jpeg', 0.85));
              }
            } catch (e) {
              console.warn('Background canvas toDataURL error (CORS):', e);
            }
          }
        }
      } finally {
        if (isMounted) setIsPreparingAssets(false);
      }
    };

    prepareAssets();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    audioUrl,
    audioBuffer,
    isAudioUrl,
    isProfileUrl,
    isBackgroundUrl,
    exportConfig.useTrim,
    exportConfig.trimStart,
    exportConfig.trimEnd,
    profileImageUrl,
    profileImage,
    backgroundImageUrl,
    backgroundImage,
  ]);

  // Construct optimized payload strictly from main page + export settings, ignoring useless parameters
  const payloadObject = useMemo(() => {
    // Audio specification: Prioritize URL if available, never base64 when a preset or source has a URL
    let audioField: string | undefined = undefined;
    if (effectiveAudioUrl) {
      audioField = effectiveAudioUrl;
    } else if (localAudioBase64) {
      audioField = localAudioBase64;
    } else if (audioUrl) {
      audioField = audioUrl;
    } else {
      audioField = 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3';
    }

    // Profile specification: Prioritize URL if preset/remote URL, only fallback to base64 for local upload
    const profileField = settings.showProfileImage
      ? (effectiveProfileUrl || localProfileBase64 || undefined)
      : undefined;

    // Background specification: Prioritize URL if preset/remote URL, only fallback to base64 for local upload
    const isTransparent = settings.backgroundType === 'transparent';
    const bgField = !isTransparent
      ? (effectiveBackgroundUrl || localBgBase64 || undefined)
      : undefined;

    // Clean, pruned settings object ignoring useless parameters
    const prunedSettings: Record<string, any> = {
      style: settings.style,
      barCount: settings.barCount,
      barWidthRatio: settings.barWidthRatio,
      barGap: settings.barGap,
      barRadius: settings.barRadius,
      heightScale: settings.heightScale,
      sensitivity: settings.sensitivity,
      softKneeCompression: settings.softKneeCompression,
      smoothing: settings.smoothing,
      easingMode: settings.easingMode,
      invert: settings.invert,
      normalize: settings.normalize,
      glowIntensity: settings.glowIntensity,
      backgroundType: settings.backgroundType,
    };

    // Symmetry: only relevant for mirrored-bars and bars-up
    if (settings.style === 'mirrored-bars' || settings.style === 'bars-up') {
      prunedSettings.symmetry = settings.symmetry;
    }

    // Radial specific parameters
    if (settings.style === 'radial') {
      prunedSettings.radialInnerRadius = settings.radialInnerRadius;
      prunedSettings.radialRotation = settings.radialRotation;
    }

    // Solid/Custom background color (omit if transparent)
    if (!isTransparent) {
      prunedSettings.backgroundColor = settings.backgroundColor || '#09090b';
    }

    // Profile picture settings (always output boolean flag so backend doesn't fall back to defaults)
    prunedSettings.showProfileImage = Boolean(settings.showProfileImage);
    if (settings.showProfileImage) {
      prunedSettings.profileImageShape = settings.profileImageShape;
      prunedSettings.profileImageSize = settings.profileImageSize;
      prunedSettings.profileImageXOffset = settings.profileImageXOffset;
      prunedSettings.profileImageYOffset = settings.profileImageYOffset;
      prunedSettings.profileBorderWidth = settings.profileBorderWidth;
      prunedSettings.profileBorderColor = settings.profileBorderColor;
      prunedSettings.profileAudioReactiveScale = settings.profileAudioReactiveScale;
      prunedSettings.profileGlow = settings.profileGlow;
      prunedSettings.sideSymmetry = settings.sideSymmetry;
      if (settings.sideSymmetry !== 'none') {
        prunedSettings.profileWingGap = settings.profileWingGap;
      }
    }

    // Joint / tapering settings (omit if disabled)
    if (settings.enableJoint) {
      prunedSettings.enableJoint = true;
      prunedSettings.jointAtEnds = settings.jointAtEnds;
      if (settings.showProfileImage) {
        prunedSettings.jointAtProfile = settings.jointAtProfile;
      }
      prunedSettings.jointWidth = settings.jointWidth;
      prunedSettings.jointCurve = settings.jointCurve;
    }

    // Overlays: only include when enabled
    if (settings.showDbGrid) prunedSettings.showDbGrid = true;
    if (settings.showCenterLine) prunedSettings.showCenterLine = true;

    // Track info: always output boolean flag so backend doesn't fall back to defaults
    prunedSettings.showTrackInfo = Boolean(settings.showTrackInfo);
    if (settings.showTrackInfo) {
      prunedSettings.trackTitle = settings.trackTitle;
      prunedSettings.artistName = settings.artistName;
      prunedSettings.infoPosition = settings.infoPosition;
    }

    // Watermark: omit customWatermark text if watermark is turned off
    if (settings.showWatermark) {
      prunedSettings.showWatermark = true;
      prunedSettings.customWatermark = settings.customWatermark;
    }

    // Canvas framing
    prunedSettings.aspectRatio = settings.aspectRatio;
    prunedSettings.padding = settings.padding;

    // Colors: presets and UI provide primary and secondary colors directly (Theme ID deprecated)
    prunedSettings.primaryColor = settings.primaryColor || '#06b6d4';
    if (settings.enableGradient !== false) {
      prunedSettings.enableGradient = true;
      prunedSettings.colorMode = settings.colorMode || 'bottom-to-top';
      prunedSettings.gradientColor = settings.gradientColor || settings.primaryGradientEnd || '#38bdf8';
    } else {
      prunedSettings.enableGradient = false;
    }

    return {
      audio: audioField,
      video: {
        width: exportConfig.width,
        height: exportConfig.height,
        fps: exportConfig.fps,
        format: exportConfig.format,
      },
      settings: prunedSettings,
      colors: {
        primary: settings.primaryColor || '#06b6d4',
        secondary: settings.gradientColor || settings.primaryGradientEnd || '#38bdf8',
      },
      ...(profileField ? { profileImage: profileField } : {}),
      ...(bgField ? { backgroundImage: bgField } : {}),
    };
  }, [
    effectiveAudioUrl,
    audioUrl,
    localAudioBase64,
    effectiveProfileUrl,
    profileImageUrl,
    localProfileBase64,
    effectiveBackgroundUrl,
    backgroundImageUrl,
    backgroundVideoUrl,
    localBgBase64,
    exportConfig,
    settings,
    theme,
  ]);

  // Full string output (for copying/saving)
  const fullJsonString = useMemo(() => {
    return JSON.stringify(payloadObject, null, 2);
  }, [payloadObject]);

  // Truncated preview string (keeps UI super fast if audio is a massive base64 string)
  const displayJsonString = useMemo(() => {
    const preview = JSON.parse(JSON.stringify(payloadObject));
    if (preview.audio && preview.audio.startsWith('data:') && preview.audio.length > 80) {
      preview.audio = `${preview.audio.substring(0, 48)}... [base64 audio data truncated for display, length: ${preview.audio.length} chars]`;
    }
    if (preview.profileImage && preview.profileImage.startsWith('data:') && preview.profileImage.length > 80) {
      preview.profileImage = `${preview.profileImage.substring(0, 48)}... [base64 image truncated for display]`;
    }
    if (preview.backgroundImage && preview.backgroundImage.startsWith('data:') && preview.backgroundImage.length > 80) {
      preview.backgroundImage = `${preview.backgroundImage.substring(0, 48)}... [base64 image truncated for display]`;
    }
    return JSON.stringify(preview, null, 2);
  }, [payloadObject]);

  // cURL representation
  const curlCode = useMemo(() => {
    return `# Headless Audio Visualizer Video Render via Waveform Studio API
curl -X POST http://localhost:3000/api/render-video \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payloadObject)}' \\
  --output visualizer.${exportConfig.format}`;
  }, [payloadObject, exportConfig.format]);

  // Display cURL (truncated for viewer)
  const displayCurlCode = useMemo(() => {
    const preview = JSON.parse(JSON.stringify(payloadObject));
    if (preview.audio && preview.audio.startsWith('data:') && preview.audio.length > 80) {
      preview.audio = `${preview.audio.substring(0, 40)}...<BASE64_AUDIO_DATA>`;
    }
    return `# Headless Audio Visualizer Video Render via Waveform Studio API
curl -X POST http://localhost:3000/api/render-video \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(preview)}' \\
  --output visualizer.${exportConfig.format}`;
  }, [payloadObject, exportConfig.format]);

  // Copy handler
  const handleCopy = () => {
    const content = activeFormat === 'json' ? fullJsonString : curlCode;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download handler
  const handleDownloadFile = () => {
    let content = '';
    let fileName = '';
    let mimeType = 'text/plain';

    if (activeFormat === 'json') {
      content = fullJsonString;
      fileName = 'visualizer-payload.json';
      mimeType = 'application/json';
    } else {
      content = curlCode;
      fileName = 'render-visualizer.sh';
      mimeType = 'application/x-sh';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Test Run directly on server
  const handleServerTestRun = async () => {
    setIsServerRendering(true);
    setServerError(null);
    setServerSuccess(null);
    setRenderProgress({ percentage: 0 });

    const testJobId = `test_run_${Date.now()}`;
    let sse: EventSource | null = null;

    try {
      // Connect to SSE for real-time progress events
      sse = new EventSource(`/api/render-progress/${testJobId}`);
      sse.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (typeof data.progress === 'number') {
            setRenderProgress({
              percentage: data.progress,
              currentFrame: data.currentFrame,
              totalFrames: data.totalFrames,
              fps: data.fps,
            });
          }
        } catch {}
      };

      const response = await fetch(`/api/render-video?jobId=${testJobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payloadObject, jobId: testJobId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned status ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `server_rendered_${Date.now()}.${exportConfig.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setServerSuccess(`Video rendered successfully by FFmpeg server (${(blob.size / 1024 / 1024).toFixed(2)} MB)!`);
    } catch (err: any) {
      setServerError(err?.message || 'Server rendering failed.');
    } finally {
      if (sse) sse.close();
      setRenderProgress(null);
      setIsServerRendering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-display font-bold text-sm text-white">Payload Generator</h2>
          </div>
        </div>

        {/* Format Selector Bar (cURL, JSON) & Colab */}
        <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-neutral-800/80 bg-neutral-950">
          <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
            <button
              id="payload-format-curl-btn"
              onClick={() => setActiveFormat('curl')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFormat === 'curl'
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>cURL</span>
            </button>
            <button
              id="payload-format-json-btn"
              onClick={() => setActiveFormat('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFormat === 'json'
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>JSON</span>
            </button>
          </div>

          <div className="flex items-center p-1 bg-neutral-900 rounded-xl border border-neutral-800">
            <a
              id="open-in-colab-btn"
              href="https://colab.research.google.com/github/mnchrmXD/waveform-studio/blob/main/waveform_studio.ipynb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-amber-300 hover:bg-neutral-800 transition-all cursor-pointer"
              title="Open waveform_studio.ipynb in Google Colab (mnchrmXD/waveform-studio)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Colab</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>
          </div>
        </div>

        {/* Code Box Area */}
        <div className="flex-1 overflow-hidden p-5 bg-neutral-950 flex flex-col gap-3 min-h-[300px]">
          <div className="flex-1 flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden shadow-inner">
            {/* Code Box Header with file label & action buttons */}
            <div className="px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-300">
                {activeFormat === 'curl' ? (
                  <>
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>curl_render.sh</span>
                  </>
                ) : (
                  <>
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>payload.json</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  id="download-payload-file-btn"
                  onClick={handleDownloadFile}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                  title="Save payload to file"
                >
                  <Download className="w-3 h-3 text-neutral-400" />
                  <span>Save</span>
                </button>

                <button
                  id="copy-payload-btn"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                  title="Copy code to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 p-4 font-mono text-xs overflow-auto text-neutral-300 leading-relaxed select-all">
              <pre>
                <code>
                  {activeFormat === 'curl' ? displayCurlCode : displayJsonString}
                </code>
              </pre>
            </div>
          </div>

          {/* Feedback alerts & Progress */}
          {renderProgress && (
            <div id="server-render-progress" className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-cyan-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  Rendering Video... {renderProgress.percentage}%
                </span>
                <span className="text-neutral-400 font-mono text-[11px]">
                  {renderProgress.currentFrame && renderProgress.totalFrames
                    ? `${renderProgress.currentFrame} / ${renderProgress.totalFrames} frames`
                    : ''}
                  {renderProgress.fps ? ` • ${renderProgress.fps} fps` : ''}
                </span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 h-full rounded-full transition-all duration-150"
                  style={{ width: `${Math.max(2, renderProgress.percentage)}%` }}
                />
              </div>
            </div>
          )}

          {serverSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{serverSuccess}</span>
            </div>
          )}

          {serverError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between gap-3">
          <button
            id="payload-modal-back-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-800 hover:border-neutral-700"
          >
            Back
          </button>

          {/* Test Run Server Render Button */}
          <button
            id="test-server-render-btn"
            onClick={handleServerTestRun}
            disabled={isServerRendering || isPreparingAssets || !isCloudAvailable}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              !isCloudAvailable
                ? 'Node.js backend server is not available in this environment'
                : 'Executes the POST request against local FFmpeg backend right now'
            }
          >
            {isServerRendering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>FFmpeg Rendering...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isCloudAvailable ? 'Test Run on Server' : 'Server Unavailable'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
