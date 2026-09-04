import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Copy,
  Check,
  Terminal,
  Code2,
  FileCode2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Layers,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { ColorTheme, VisualizerSettings } from '../types';
import { audioBufferToWavBlob } from '../services/fastVideoExporter';

export interface ExportConfiguration {
  width: number;
  height: number;
  fps: number;
  format: 'mp4' | 'webm';
  duration: number;
  trimStart: number;
  trimEnd: number;
  useTrim: boolean;
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
  const [activeFormat, setActiveFormat] = useState<'curl' | 'json' | 'node'>('curl');
  const [copied, setCopied] = useState(false);
  const [isServerRendering, setIsServerRendering] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  // Auto-encode local audio / images to base64 if no remote URL was provided
  const [localAudioBase64, setLocalAudioBase64] = useState<string | null>(null);
  const [localProfileBase64, setLocalProfileBase64] = useState<string | null>(null);
  const [localBgBase64, setLocalBgBase64] = useState<string | null>(null);
  const [isPreparingAssets, setIsPreparingAssets] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const prepareAssets = async () => {
      setIsPreparingAssets(true);
      try {
        // 1. Audio
        if (!audioUrl && audioBuffer) {
          try {
            const wavBlob = audioBufferToWavBlob(
              audioBuffer,
              exportConfig.useTrim ? exportConfig.trimStart : 0,
              exportConfig.useTrim ? exportConfig.trimEnd : audioBuffer.duration
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

        // 2. Profile Image
        if (!profileImageUrl && profileImage && profileImage.src) {
          if (profileImage.src.startsWith('data:')) {
            if (isMounted) setLocalProfileBase64(profileImage.src);
          } else {
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

        // 3. Background Image
        if (!backgroundImageUrl && backgroundImage && backgroundImage.src) {
          if (backgroundImage.src.startsWith('data:')) {
            if (isMounted) setLocalBgBase64(backgroundImage.src);
          } else {
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
    // Audio specification
    let audioField: string | undefined = undefined;
    if (audioUrl) {
      audioField = audioUrl;
    } else if (localAudioBase64) {
      audioField = localAudioBase64;
    } else {
      audioField = 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3';
    }

    // Profile specification (only if enabled)
    const profileField = settings.showProfileImage
      ? (profileImageUrl || localProfileBase64 || undefined)
      : undefined;

    // Background specification (only if not transparent)
    const isTransparent = settings.backgroundType === 'transparent';
    const bgField = !isTransparent
      ? (backgroundImageUrl || localBgBase64 || undefined)
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
      prunedSettings.backgroundColor = settings.useCustomColors ? settings.backgroundColor : theme.backgroundColor;
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

    // Gradient & Color Representation Mode
    if (settings.enableGradient !== false) {
      prunedSettings.enableGradient = true;
      prunedSettings.colorMode = settings.colorMode || 'bottom-to-top';
      prunedSettings.gradientColor = settings.useCustomColors
        ? (settings.gradientColor || settings.primaryGradientEnd || theme.gradientColor || '#38bdf8')
        : (theme.gradientColor || theme.primaryGradientEnd || '#38bdf8');
    } else {
      prunedSettings.enableGradient = false;
    }

    // Theme object: clean of deprecated fields, only primary + optional gradient
    const themeObj: Record<string, any> = {
      id: theme.id,
      name: theme.name,
      primaryColor: settings.useCustomColors ? settings.primaryColor : theme.primaryColor,
    };

    if (settings.enableGradient !== false) {
      themeObj.gradientColor = settings.useCustomColors
        ? (settings.gradientColor || settings.primaryGradientEnd || theme.gradientColor || '#38bdf8')
        : (theme.gradientColor || theme.primaryGradientEnd || '#38bdf8');
      themeObj.colorMode = settings.colorMode || 'bottom-to-top';
    }

    if (!isTransparent) {
      themeObj.backgroundColor = settings.useCustomColors ? settings.backgroundColor : theme.backgroundColor;
    }

    return {
      audio: audioField,
      video: {
        width: exportConfig.width,
        height: exportConfig.height,
        fps: exportConfig.fps,
        format: exportConfig.format,
        duration: Math.round(exportConfig.duration * 100) / 100,
      },
      settings: prunedSettings,
      theme: themeObj,
      ...(profileField ? { profileImage: profileField } : {}),
      ...(bgField ? { backgroundImage: bgField } : {}),
    };
  }, [
    audioUrl,
    localAudioBase64,
    profileImageUrl,
    localProfileBase64,
    backgroundImageUrl,
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

  // Node.js representation
  const nodeCode = useMemo(() => {
    return `// render-visualizer.mjs
// Run with: node render-visualizer.mjs
import fs from 'fs';

const payload = ${JSON.stringify(payloadObject, null, 2)};

async function renderVisualizer() {
  console.log('Rendering visualizer video headlessly on server...');
  const startTime = Date.now();

  const response = await fetch('http://localhost:3000/api/render-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(\`Server returned \${response.status}: \${errorText}\`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileName = 'visualizer.${exportConfig.format}';
  fs.writeFileSync(fileName, Buffer.from(arrayBuffer));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const sizeMb = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
  console.log(\`Done in \${elapsed}s! Saved \${fileName} (\${sizeMb} MB)\`);
}

renderVisualizer().catch(console.error);`;
  }, [payloadObject, exportConfig.format]);

  // Display Node.js representation
  const displayNodeCode = useMemo(() => {
    const preview = JSON.parse(JSON.stringify(payloadObject));
    if (preview.audio && preview.audio.startsWith('data:') && preview.audio.length > 80) {
      preview.audio = `${preview.audio.substring(0, 48)}... [base64 audio truncated]`;
    }
    return `// render-visualizer.mjs
// Run with: node render-visualizer.mjs
import fs from 'fs';

const payload = ${JSON.stringify(preview, null, 2)};

async function renderVisualizer() {
  console.log('Rendering visualizer video headlessly on server...');
  const startTime = Date.now();

  const response = await fetch('http://localhost:3000/api/render-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(\`Server returned \${response.status}: \${errorText}\`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileName = 'visualizer.${exportConfig.format}';
  fs.writeFileSync(fileName, Buffer.from(arrayBuffer));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const sizeMb = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
  console.log(\`Done in \${elapsed}s! Saved \${fileName} (\${sizeMb} MB)\`);
}

renderVisualizer().catch(console.error);`;
  }, [payloadObject, exportConfig.format]);

  // Copy handler
  const handleCopy = () => {
    let content = '';
    if (activeFormat === 'json') content = fullJsonString;
    else if (activeFormat === 'curl') content = curlCode;
    else if (activeFormat === 'node') content = nodeCode;

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
    } else if (activeFormat === 'curl') {
      content = curlCode;
      fileName = 'render-visualizer.sh';
      mimeType = 'application/x-sh';
    } else {
      content = nodeCode;
      fileName = 'render-visualizer.mjs';
      mimeType = 'application/javascript';
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

    try {
      const response = await fetch('/api/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadObject),
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
      setIsServerRendering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white">REST API Payload Generator</h3>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
                  HEADLESS
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                All parameters automatically inherited from current main canvas & export settings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inherited Parameters Summary Row (Zero redundant inputs!) */}
        <div className="px-5 py-2.5 bg-neutral-900/40 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto text-[11px] text-neutral-300 font-mono">
          <span className="text-neutral-500 uppercase tracking-wider font-sans font-bold text-[10px]">Inherited:</span>
          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 whitespace-nowrap">
            📐 {exportConfig.width}×{exportConfig.height} @ {exportConfig.fps}fps
          </span>
          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 whitespace-nowrap uppercase">
            🎞️ {exportConfig.format}
          </span>
          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 whitespace-nowrap">
            ⏱️ {exportConfig.duration.toFixed(1)}s
          </span>
          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 whitespace-nowrap">
            📊 {settings.style} ({settings.barCount} bars)
          </span>
          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 whitespace-nowrap">
            🔗 Joint: {settings.enableJoint ? `On (${settings.jointWidth}%)` : 'Off'}
          </span>
          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 whitespace-nowrap">
            🎨 {theme.name}
          </span>
          {audioUrl && (
            <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 whitespace-nowrap">
              🔗 Remote Audio URL
            </span>
          )}
        </div>

        {/* Format Selector Bar (cURL, JSON, Node.js) */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between gap-3 border-b border-neutral-800/80 bg-neutral-950">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
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
            <button
              id="payload-format-node-btn"
              onClick={() => setActiveFormat('node')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFormat === 'node'
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Node.js Script</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="copy-payload-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Copy {activeFormat.toUpperCase()}</span>
                </>
              )}
            </button>

            <button
              id="download-payload-file-btn"
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>Save File</span>
            </button>
          </div>
        </div>

        {/* Code Box Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-neutral-950 flex flex-col gap-3">
          <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 font-mono text-xs overflow-x-auto text-neutral-300 leading-relaxed max-h-[44vh] select-all shadow-inner">
            <pre>
              <code>
                {activeFormat === 'curl'
                  ? displayCurlCode
                  : activeFormat === 'json'
                  ? displayJsonString
                  : displayNodeCode}
              </code>
            </pre>
          </div>

          {/* Feedback alerts */}
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
          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
            <span className="font-mono text-cyan-400 font-medium">POST /api/render-video</span>
            <span className="hidden sm:inline text-neutral-500">• Ready for headless automation & CI/CD</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Export</span>
            </button>

            {/* Test Run Server Render Button */}
            <button
              id="test-server-render-btn"
              onClick={handleServerTestRun}
              disabled={isServerRendering || isPreparingAssets}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Executes the POST request against local FFmpeg backend right now"
            >
              {isServerRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>FFmpeg Rendering...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Test Run on Server</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
