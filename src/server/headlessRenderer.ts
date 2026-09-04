import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { createCanvas, loadImage, Image } from '@napi-rs/canvas';
import { ColorTheme, VisualizerSettings } from '../types';
import { DEFAULT_SETTINGS, COLOR_THEMES } from '../data/presets';
import { OfflineAudioAnalyzer } from '../services/fftAnalyzer';
import { renderVisualizerFrame } from '../services/visualizerRenderer';

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
  onProgress?: (progress: number) => void;
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
    const ffmpegSynth = spawn('ffmpeg', [
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
      const decodeProc = spawn('ffmpeg', [
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

    let selectedTheme: ColorTheme = COLOR_THEMES[0];
    if (typeof options.theme === 'string') {
      const found = COLOR_THEMES.find((t) => t.id === options.theme);
      if (found) selectedTheme = found;
    } else if (options.theme && typeof options.theme === 'object') {
      selectedTheme = {
        ...COLOR_THEMES[0],
        ...options.theme,
      };
    } else if (mergedSettings.themeId) {
      const found = COLOR_THEMES.find((t) => t.id === mergedSettings.themeId);
      if (found) selectedTheme = found;
    }

    // 4. Video Dimension & Timing Constraints
    let width = options.video?.width || 1280;
    let height = options.video?.height || 720;
    // Ensure even dimensions required by H.264 / VP9 encoders
    width = width - (width % 2);
    height = height - (height % 2);

    const fps = Math.max(15, Math.min(60, options.video?.fps || 30));
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
      // VP9 with Alpha Channel support
      ffmpegArgs.push(
        '-c:v', 'libvpx-vp9',
        '-pix_fmt', isTransparent ? 'yuva420p' : 'yuv420p',
        '-auto-alt-ref', '0',
        '-crf', '24',
        '-b:v', '0',
        '-c:a', 'libopus',
        '-b:a', '128k',
        '-shortest',
        outputPath
      );
    } else {
      // Standard H.264 MP4
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        outputPath
      );
    }

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
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

      if (options.onProgress && f % 15 === 0) {
        options.onProgress(f / totalFrames);
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
