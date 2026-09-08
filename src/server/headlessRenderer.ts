import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, spawnSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { createCanvas, loadImage, Image } from '@napi-rs/canvas';
import { ColorTheme, VisualizerSettings } from '../types';
import { DEFAULT_SETTINGS, COLOR_THEMES } from '../data/presets';
import { OfflineAudioAnalyzer } from '../services/fftAnalyzer';
import { renderVisualizerFrame } from '../services/visualizerRenderer';

/**
 * GPU & Hardware Acceleration detection for Headless Node.js server.
 * Accurately probes Google Colab (Tesla T4, A100, V100, L4), Linux, and local environments
 * to prioritize system FFmpeg with NVENC hardware acceleration over generic static binaries.
 */
export interface ServerGpuStatus {
  isColab: boolean;
  hasNvidiaGpu: boolean;
  gpuModel: string | null;
  vramMb: number | null;
  driverVersion: string | null;
  ffmpegBinary: string;
  supportsNvenc: boolean;
  activeEncoder: 'h264_nvenc' | 'libx264';
  nvencPreset: string;
  recommendation: string;
}

let cachedGpuStatus: ServerGpuStatus | null = null;

export function getServerGpuStatus(): ServerGpuStatus {
  if (cachedGpuStatus) {
    return cachedGpuStatus;
  }

  // 1. Detect if running inside Google Colab
  const isColab = Boolean(
    process.env.COLAB_GPU !== undefined ||
    process.env.GCS_READ_CACHE !== undefined ||
    fs.existsSync('/content') ||
    fs.existsSync('/colabtools')
  );

  // 2. Query NVIDIA GPU via nvidia-smi
  let hasNvidiaGpu = false;
  let gpuModel: string | null = null;
  let vramMb: number | null = null;
  let driverVersion: string | null = null;

  try {
    const smiRes = spawnSync('nvidia-smi', [
      '--query-gpu=name,memory.total,driver_version',
      '--format=csv,noheader,nounits',
    ]);
    if (smiRes.status === 0) {
      const line = (smiRes.stdout || '').toString().trim().split('\n')[0];
      if (line) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          hasNvidiaGpu = true;
          gpuModel = parts[0];
          vramMb = parseInt(parts[1], 10) || null;
          driverVersion = parts[2] || null;
        }
      }
    }
  } catch {
    // nvidia-smi not available or not on path
  }

  // 3. Find Best FFmpeg Binary (prioritize candidate with working NVENC)
  const candidates: string[] = [];
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    candidates.push(process.env.FFMPEG_PATH);
  }
  candidates.push('ffmpeg');
  candidates.push('/usr/bin/ffmpeg');
  candidates.push('/usr/local/bin/ffmpeg');

  const staticPath = typeof ffmpegStatic === 'string'
    ? ffmpegStatic
    : (ffmpegStatic as any)?.default;
  if (typeof staticPath === 'string' && fs.existsSync(staticPath)) {
    candidates.push(staticPath);
  }

  let chosenBinary = 'ffmpeg';
  let supportsNvenc = false;
  let chosenPreset = 'p1';

  // Test candidates for NVENC support
  for (const candidate of candidates) {
    try {
      const encCheck = spawnSync(candidate, ['-hide_banner', '-encoders']);
      if (encCheck.status === 0) {
        const out = (encCheck.stdout || '').toString();
        if (out.includes('h264_nvenc')) {
          // Probe if NVENC can actually encode on this system
          // Try newer SDK preset 'p1' (fastest low-latency)
          const testP1 = spawnSync(candidate, [
            '-f', 'lavfi',
            '-i', 'color=c=black:s=64x64:d=0.04',
            '-c:v', 'h264_nvenc',
            '-preset', 'p1',
            '-tune', 'll',
            '-f', 'null',
            '-',
          ]);

          if (testP1.status === 0) {
            chosenBinary = candidate;
            supportsNvenc = true;
            chosenPreset = 'p1';
            break;
          }

          // Fallback to legacy/universal preset 'fast'
          const testFast = spawnSync(candidate, [
            '-f', 'lavfi',
            '-i', 'color=c=black:s=64x64:d=0.04',
            '-c:v', 'h264_nvenc',
            '-preset', 'fast',
            '-tune', 'll',
            '-f', 'null',
            '-',
          ]);

          if (testFast.status === 0) {
            chosenBinary = candidate;
            supportsNvenc = true;
            chosenPreset = 'fast';
            break;
          }
        }
      }
    } catch {
      // Continue checking next candidate
    }
  }

  // If NVENC not working, select first working binary for CPU encoding
  if (!supportsNvenc) {
    for (const candidate of candidates) {
      try {
        const testVer = spawnSync(candidate, ['-version']);
        if (testVer.status === 0) {
          chosenBinary = candidate;
          break;
        }
      } catch {}
    }
  }

  const activeEncoder = supportsNvenc ? 'h264_nvenc' : 'libx264';

  let recommendation = '';
  if (supportsNvenc) {
    recommendation = `Hardware GPU acceleration active (${gpuModel || 'NVIDIA GPU'} via ${activeEncoder}). Best headless settings (1080p @ 60 FPS) enabled for maximum speed.`;
  } else if (hasNvidiaGpu) {
    recommendation = `NVIDIA GPU (${gpuModel}) detected, but active FFmpeg binary lacks NVENC support. Falling back to multi-threaded CPU libx264.`;
  } else if (isColab) {
    recommendation = `Google Colab CPU runtime active. For 10x faster exports, go to Colab: Runtime > Change runtime type > Select T4 GPU.`;
  } else {
    recommendation = `Server CPU multi-threading active with ultrafast preset.`;
  }

  cachedGpuStatus = {
    isColab,
    hasNvidiaGpu,
    gpuModel,
    vramMb,
    driverVersion,
    ffmpegBinary: chosenBinary,
    supportsNvenc,
    activeEncoder,
    nvencPreset: chosenPreset,
    recommendation,
  };

  console.log(`[Hardware Detection] ${recommendation}`);
  return cachedGpuStatus;
}

export function getFfmpegPath(): string {
  return getServerGpuStatus().ffmpegBinary;
}

function getOptimalH264Encoder(): { encoder: string; extraArgs: string[] } {
  const status = getServerGpuStatus();

  if (status.supportsNvenc) {
    return {
      encoder: 'h264_nvenc',
      extraArgs: [
        '-preset', status.nvencPreset,
        '-tune', 'll',
        '-rc', 'vbr',
        '-cq', '20',
        '-b:v', '14M',
        '-maxrate', '24M',
        '-bufsize', '28M',
        '-pix_fmt', 'yuv420p',
      ],
    };
  }

  return {
    encoder: 'libx264',
    extraArgs: [
      '-preset', 'ultrafast',
      '-tune', 'fastdecode',
      '-threads', '0',
      '-crf', '21',
      '-bf', '0',
      '-pix_fmt', 'yuv420p',
    ],
  };
}

// Polyfill OffscreenCanvas for Node.js if not present
if (typeof (globalThis as any).OffscreenCanvas === 'undefined') {
  (globalThis as any).OffscreenCanvas = class {
    constructor(width: number, height: number) {
      return createCanvas(width, height);
    }
  };
}

export interface HeadlessVideoOptions {
  audio?: string | Buffer; // Base64 data URI, raw base64, URL, or Buffer
  audioUrl?: string;
  settings?: Partial<VisualizerSettings>;
  theme?: Partial<ColorTheme> | string; // ColorTheme object or themeId
  video?: {
    width?: number;
    height?: number;
    fps?: number;
    format?: 'mp4' | 'webm';
    duration?: number; // In seconds (optional clamp)
    crf?: number;
  };
  profileImage?: string | Buffer; // Base64 data URI, URL, or Buffer
  backgroundImage?: string | Buffer; // Base64 data URI, URL, or Buffer
  onProgress?: (
    progress: number,
    meta?: {
      currentFrame: number;
      totalFrames: number;
      fps: number;
      elapsedSec: number;
      etaSec: number;
    }
  ) => void;
}

export interface HeadlessRenderResult {
  outputPath: string;
  filename: string;
  mimeType: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: 'mp4' | 'webm';
  fileSizeBytes: number;
  cleanup: () => void;
}

/**
 * Downloads or decodes audio source into a local file path
 */
async function prepareAudioFile(
  audioSource: string | Buffer | undefined,
  audioUrl: string | undefined,
  tempDir: string
): Promise<string> {
  const audioPath = path.join(tempDir, 'input_audio');

  // Case 1: Audio URL provided
  if (audioUrl) {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio from URL: ${response.status} ${response.statusText}`);
    }
    const arrayBuf = await response.arrayBuffer();
    fs.writeFileSync(audioPath, Buffer.from(arrayBuf));
    return audioPath;
  }

  // Case 2: Audio Buffer or string provided
  if (audioSource) {
    if (Buffer.isBuffer(audioSource)) {
      fs.writeFileSync(audioPath, audioSource);
      return audioPath;
    }

    if (typeof audioSource === 'string') {
      if (audioSource.startsWith('http://') || audioSource.startsWith('https://')) {
        const response = await fetch(audioSource);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio from URL: ${response.status} ${response.statusText}`);
        }
        const arrayBuf = await response.arrayBuffer();
        fs.writeFileSync(audioPath, Buffer.from(arrayBuf));
        return audioPath;
      }

      // Base64 string (with or without data: URI prefix)
      let base64Data = audioSource;
      if (base64Data.includes(';base64,')) {
        base64Data = base64Data.split(';base64,')[1];
      }
      fs.writeFileSync(audioPath, Buffer.from(base64Data, 'base64'));
      return audioPath;
    }
  }

  // Case 3: No audio provided -> Synthesize a demo harmonic chord via FFmpeg
  const synthPath = path.join(tempDir, 'synth_audio.wav');
  await new Promise<void>((resolve, reject) => {
    const ffmpegSynth = spawn(getFfmpegPath(), [
      '-y',
      '-f', 'lavfi',
      '-i', 'sine=frequency=220:duration=12[a];sine=frequency=330:duration=12[b];sine=frequency=440:duration=12[c];sine=frequency=660:duration=12[d];[a][b][c][d]amix=inputs=4',
      '-c:a', 'pcm_s16le',
      synthPath,
    ]);

    ffmpegSynth.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to synthesize demo audio with ffmpeg (code ${code})`));
    });
    ffmpegSynth.on('error', reject);
  });

  return synthPath;
}

/**
 * Loads an image from base64, URL, or Buffer using @napi-rs/canvas loadImage
 */
async function prepareImage(source: string | Buffer | undefined): Promise<Image | null> {
  if (!source) return null;
  try {
    if (Buffer.isBuffer(source)) {
      return await loadImage(source);
    }
    if (typeof source === 'string') {
      if (source.startsWith('http://') || source.startsWith('https://')) {
        const res = await fetch(source);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        return await loadImage(buf);
      }
      if (source.startsWith('data:')) {
        return await loadImage(source);
      }
      // Raw base64 string
      return await loadImage(Buffer.from(source, 'base64'));
    }
    return null;
  } catch (err) {
    console.warn('Failed to load image in headless renderer:', err);
    return null;
  }
}

/**
 * Headless Video Renderer
 * Analyzes audio and renders video frames headlessly on Node via @napi-rs/canvas,
 * streaming directly into FFmpeg.
 */
export async function renderHeadlessVideo(
  options: HeadlessVideoOptions
): Promise<HeadlessRenderResult> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wave_headless_'));

  try {
    // 1. Resolve Audio File
    const audioInputPath = await prepareAudioFile(options.audio, options.audioUrl, tempDir);

    // 2. Decode Audio into Raw 32-bit Float PCM via FFmpeg
    const pcmPath = path.join(tempDir, 'audio.raw');
    await new Promise<void>((resolve, reject) => {
      const decodeProc = spawn(getFfmpegPath(), [
        '-y',
        '-i', audioInputPath,
        '-f', 'f32le',
        '-ac', '1',
        '-ar', '44100',
        pcmPath,
      ]);

      let stderr = '';
      decodeProc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      decodeProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg audio decode failed (code ${code}): ${stderr}`));
      });
      decodeProc.on('error', reject);
    });

    const pcmBuf = fs.readFileSync(pcmPath);
    const sampleRate = 44100;
    const floatSamples = new Float32Array(pcmBuf.buffer, pcmBuf.byteOffset, pcmBuf.byteLength / 4);
    const audioDuration = floatSamples.length / sampleRate;

    if (audioDuration <= 0) {
      throw new Error('Audio file contains no decodable audio samples');
    }

    // 3. Resolve Target Settings & Color Theme
    const mergedSettings: VisualizerSettings = {
      ...DEFAULT_SETTINGS,
      ...(options.settings || {}),
    };

    // Explicit boolean overrides
    if (options.settings && typeof options.settings.showTrackInfo === 'boolean') {
      mergedSettings.showTrackInfo = options.settings.showTrackInfo;
    }
    if (options.settings && typeof options.settings.showProfileImage === 'boolean') {
      mergedSettings.showProfileImage = options.settings.showProfileImage;
    }

    const colorsOpt = (options as any).colors;
    const primaryColor =
      colorsOpt?.primary ||
      mergedSettings.primaryColor ||
      (typeof options.theme === 'object' ? options.theme?.primaryColor : undefined);
    const gradientColor =
      colorsOpt?.secondary ||
      mergedSettings.gradientColor ||
      (typeof options.theme === 'object' ? options.theme?.gradientColor : undefined);

    let selectedTheme: ColorTheme = { ...COLOR_THEMES[0] };
    if (typeof options.theme === 'string') {
      const found = COLOR_THEMES.find((t) => t.id === options.theme);
      if (found) selectedTheme = { ...found };
    } else if (options.theme && typeof options.theme === 'object') {
      selectedTheme = {
        ...COLOR_THEMES[0],
        ...options.theme,
      };
    } else if (mergedSettings.themeId) {
      const found = COLOR_THEMES.find((t) => t.id === mergedSettings.themeId);
      if (found) selectedTheme = { ...found };
    }

    if (primaryColor) {
      selectedTheme.primaryColor = primaryColor;
      mergedSettings.primaryColor = primaryColor;
    }
    if (gradientColor) {
      selectedTheme.gradientColor = gradientColor;
      selectedTheme.primaryGradientEnd = gradientColor;
      mergedSettings.gradientColor = gradientColor;
    }

    // 4. Video Dimension & Timing Constraints (Auto-select Best Settings for Colab / NVENC GPU)
    const gpuStatus = getServerGpuStatus();
    let width = options.video?.width || (gpuStatus.supportsNvenc ? 1920 : 1280);
    let height = options.video?.height || (gpuStatus.supportsNvenc ? 1080 : 720);
    // Ensure even dimensions required by H.264 / VP9 encoders
    width = width - (width % 2);
    height = height - (height % 2);

    const fps = Math.max(15, Math.min(60, options.video?.fps || (gpuStatus.supportsNvenc ? 60 : 30)));
    const isTransparent = mergedSettings.backgroundType === 'transparent';
    const format: 'mp4' | 'webm' = options.video?.format || (isTransparent ? 'webm' : 'mp4');

    let maxDuration = audioDuration;
    if (options.video?.duration && options.video.duration > 0) {
      maxDuration = Math.min(options.video.duration, audioDuration);
    }
    const totalFrames = Math.max(1, Math.floor(maxDuration * fps));

    // 5. Load Optional Profile / Background Images
    const [profileImg, bgImg] = await Promise.all([
      prepareImage(options.profileImage),
      prepareImage(options.backgroundImage),
    ]);

    // 6. Initialize FFT Offline Analyzer
    const dummyAudioBuffer = {
      sampleRate,
      numberOfChannels: 1,
      length: floatSamples.length,
      duration: audioDuration,
      getChannelData: (_ch: number) => floatSamples,
    };
    const analyzer = new OfflineAudioAnalyzer(dummyAudioBuffer as any, 1024);

    // 7. Spawn FFmpeg Video Encoder Process
    const outputFilename = `visualizer_${Date.now()}.${format}`;
    const outputPath = path.join(tempDir, outputFilename);

    const ffmpegArgs: string[] = [
      '-y',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${width}x${height}`,
      '-r', fps.toString(),
      '-i', 'pipe:0',
      '-ss', '0',
      '-t', maxDuration.toString(),
      '-i', audioInputPath,
    ];

    if (format === 'webm') {
      // VP9 with Alpha Channel support - realtime multithreaded (30x faster)
      ffmpegArgs.push(
        '-c:v', 'libvpx-vp9',
        '-pix_fmt', isTransparent ? 'yuva420p' : 'yuv420p',
        '-auto-alt-ref', '0',
        '-deadline', 'realtime',
        '-cpu-used', '8',
        '-row-mt', '1',
        '-threads', '0',
        '-b:v', '6M',
        '-c:a', 'libopus',
        '-b:a', '128k',
        '-shortest',
        outputPath
      );
    } else {
      // Hardware-accelerated NVENC (GPU) or Ultrafast Multi-threaded CPU libx264
      const opt = getOptimalH264Encoder();
      ffmpegArgs.push(
        '-c:v', opt.encoder,
        ...opt.extraArgs,
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        outputPath
      );
    }

    const ffmpeg = spawn(getFfmpegPath(), ffmpegArgs);
    let ffmpegStderr = '';
    ffmpeg.stderr.on('data', (data) => {
      ffmpegStderr += data.toString();
    });

    const ffmpegPromise = new Promise<void>((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg video encoding failed (code ${code}): ${ffmpegStderr.slice(-400)}`));
      });
      ffmpeg.on('error', reject);
    });

    // 8. Render Frames Loop
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const renderStartTime = Date.now();
    let lastReportTime = renderStartTime;
    let framesSinceReport = 0;
    let currentFps = fps;

    for (let f = 0; f < totalFrames; f++) {
      const time = f / fps;
      const spectrum = analyzer.getSpectrumAtTime(
        time,
        Math.max(32, Math.min(256, (mergedSettings.barCount || 80) * 2)),
        mergedSettings.smoothing,
        mergedSettings.softKneeCompression,
        mergedSettings.sensitivity
      );

      renderVisualizerFrame({
        ctx: ctx as any,
        width,
        height,
        time,
        duration: maxDuration,
        isPlaying: true,
        spectrum,
        settings: mergedSettings,
        theme: selectedTheme,
        profileImage: profileImg as any,
        backgroundImage: bgImg as any,
        isExport: true,
      });

      const frameData = canvas.data();
      const canWrite = ffmpeg.stdin.write(frameData);
      if (!canWrite) {
        await new Promise<void>((res) => ffmpeg.stdin.once('drain', res));
      }

      framesSinceReport++;
      const now = Date.now();
      const deltaMs = now - lastReportTime;

      if (options.onProgress && (deltaMs >= 150 || f === totalFrames - 1)) {
        if (deltaMs > 0) {
          currentFps = Math.round((framesSinceReport / (deltaMs / 1000)) * 10) / 10;
        }
        const elapsedSec = Math.round(((now - renderStartTime) / 1000) * 10) / 10;
        const framesLeft = totalFrames - (f + 1);
        const etaSec = currentFps > 0 ? Math.round((framesLeft / currentFps) * 10) / 10 : 0;

        options.onProgress((f + 1) / totalFrames, {
          currentFrame: f + 1,
          totalFrames,
          fps: currentFps,
          elapsedSec,
          etaSec,
        });

        lastReportTime = now;
        framesSinceReport = 0;
      }
    }

    ffmpeg.stdin.end();
    await ffmpegPromise;

    if (!fs.existsSync(outputPath)) {
      throw new Error('FFmpeg finished but output video file was not generated');
    }

    const stats = fs.statSync(outputPath);

    return {
      outputPath,
      filename: outputFilename,
      mimeType: format === 'webm' ? 'video/webm' : 'video/mp4',
      duration: maxDuration,
      width,
      height,
      fps,
      format,
      fileSizeBytes: stats.size,
      cleanup: () => {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      },
    };
  } catch (err) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    throw err;
  }
}
