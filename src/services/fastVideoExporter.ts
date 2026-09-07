import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import JSZip from 'jszip';
import { ColorTheme, VisualizerSettings, WaveformData } from '../types';
import { OfflineAudioAnalyzer } from './fftAnalyzer';
import { renderVisualizerFrame } from './visualizerRenderer';
import { checkCloudAvailability } from './cloudDetection';

export type ExportResolution = '720p' | '1080p' | '4k' | 'custom';
export type ExportFormat = 'mp4' | 'webm' | 'webm-alpha' | 'png-sequence';

export interface ExportConfig {
  resolution: ExportResolution;
  customWidth?: number;
  customHeight?: number;
  fps: 30 | 60;
  videoBitrate: number; // in bps, e.g. 8_000_000 (8 Mbps)
  audioBitrate: number; // in bps, e.g. 192_000 (192 kbps)
  format: ExportFormat;
  exportAlpha?: boolean; // When true, forces 100% transparent background
  trimStart?: number; // in seconds (deprecated: full audio duration used by default)
  trimEnd?: number; // in seconds (deprecated: full audio duration used by default)
  settings: VisualizerSettings;
  theme: ColorTheme;
  backgroundImage?: HTMLImageElement | ImageBitmap | null;
  backgroundVideo?: HTMLVideoElement | null;
  backgroundBlur?: number;
  backgroundDim?: number;
  profileImage?: HTMLImageElement | ImageBitmap | null;
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  fps: number; // Real encoding frames per second (e.g. 60 FPS, 95 FPS)
  elapsedSeconds: number; // Real elapsed time in seconds
  speedMultiplier?: number; // (Retired)
  estimatedRemainingSeconds?: number; // (Retired)
  status:
    | 'initializing'
    | 'encoding-audio'
    | 'rendering-video'
    | 'finalizing'
    | 'completed'
    | 'canceled'
    | 'error';
  errorMessage?: string;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  fileName: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  totalFrames: number;
  renderTimeSec: number;
  averageFps: number;
  speedRatio?: number; // (Retired)
}

/**
 * Encodes an AudioBuffer slice into a standard 16-bit PCM WAV Blob
 */
export function audioBufferToWavBlob(
  buffer: AudioBuffer,
  startSec: number = 0,
  endSec: number = buffer.duration
): Blob {
  const sampleRate = buffer.sampleRate;
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(buffer.length, Math.floor(endSec * sampleRate));
  const numSamples = Math.max(0, endSample - startSample);

  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');

  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16 bits per sample

  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const ch0 = buffer.getChannelData(0);
  const ch1 = numChannels > 1 ? buffer.getChannelData(1) : ch0;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s0 = Math.max(-1, Math.min(1, ch0[startSample + i]));
    view.setInt16(offset, s0 < 0 ? s0 * 0x8000 : s0 * 0x7fff, true);
    offset += 2;

    if (numChannels > 1) {
      const s1 = Math.max(-1, Math.min(1, ch1[startSample + i]));
      view.setInt16(offset, s1 < 0 ? s1 * 0x8000 : s1 * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export function getVp9CodecString(width: number, height: number, fps: number): string {
  const maxDim = Math.max(width, height);
  if (maxDim > 1920) return 'vp09.00.51.08';
  if (maxDim > 1280) return fps > 30 ? 'vp09.00.41.08' : 'vp09.00.40.08';
  return 'vp09.00.31.08';
}

export class FastHeadlessVideoExporter {
  private abortController: AbortController | null = null;

  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private async findOptimalVideoConfig(
    width: number,
    height: number,
    fps: number,
    bitrate: number,
    isMp4: boolean,
    isAlpha: boolean
  ): Promise<VideoEncoderConfig | null> {
    if (typeof window.VideoEncoder === 'undefined' || typeof VideoEncoder.isConfigSupported !== 'function') {
      return null;
    }

    if (isAlpha) {
      const vp9LevelCodec = getVp9CodecString(width, height, fps);
      const candidates: Array<{ codec: string; hardwareAcceleration: HardwareAcceleration; latencyMode: LatencyMode }> = [
        { codec: vp9LevelCodec, hardwareAcceleration: 'prefer-hardware', latencyMode: 'realtime' },
        { codec: vp9LevelCodec, hardwareAcceleration: 'no-preference', latencyMode: 'realtime' },
        { codec: vp9LevelCodec, hardwareAcceleration: 'prefer-software', latencyMode: 'realtime' },
        { codec: vp9LevelCodec, hardwareAcceleration: 'prefer-software', latencyMode: 'quality' },
        { codec: 'vp09.00.41.08', hardwareAcceleration: 'prefer-hardware', latencyMode: 'realtime' },
        { codec: 'vp09.00.41.08', hardwareAcceleration: 'prefer-software', latencyMode: 'realtime' },
        { codec: 'vp09.00.31.08', hardwareAcceleration: 'prefer-software', latencyMode: 'realtime' },
        { codec: 'vp9', hardwareAcceleration: 'prefer-software', latencyMode: 'realtime' },
      ];

      for (const cand of candidates) {
        try {
          const testConfig: VideoEncoderConfig = {
            codec: cand.codec,
            width,
            height,
            bitrate,
            framerate: fps,
            alpha: 'keep',
            hardwareAcceleration: cand.hardwareAcceleration,
            latencyMode: cand.latencyMode,
          };
          const res = await VideoEncoder.isConfigSupported(testConfig);
          if (res.supported && res.config) {
            return {
              ...res.config,
              alpha: 'keep',
              width,
              height,
              bitrate,
              framerate: fps,
              latencyMode: cand.latencyMode,
            };
          }
        } catch {}
      }
      return null;
    }

    if (isMp4) {
      // H.264 profiles: High, Main, Baseline
      const h264Candidates: string[] = [];
      if (width > 1920 || height > 1920) {
        h264Candidates.push('avc1.640033', 'avc1.4d0033', 'avc1.420033');
      } else if (width <= 1280 && height <= 1280) {
        h264Candidates.push('avc1.4d001f', 'avc1.42001f', 'avc1.64001f');
      } else {
        h264Candidates.push('avc1.4d002a', 'avc1.64002a', 'avc1.42002a');
      }

      const accelModes: HardwareAcceleration[] = ['prefer-hardware', 'no-preference', 'prefer-software'];
      const latencyModes: LatencyMode[] = ['realtime', 'quality'];

      for (const accel of accelModes) {
        for (const lat of latencyModes) {
          for (const codec of h264Candidates) {
            try {
              const testConfig: VideoEncoderConfig = {
                codec,
                width,
                height,
                bitrate,
                framerate: fps,
                hardwareAcceleration: accel,
                latencyMode: lat,
              };
              const res = await VideoEncoder.isConfigSupported(testConfig);
              if (res.supported && res.config) {
                return {
                  ...res.config,
                  width,
                  height,
                  bitrate,
                  framerate: fps,
                  hardwareAcceleration: accel,
                  latencyMode: lat,
                };
              }
            } catch {}
          }
        }
      }

      return {
        codec: h264Candidates[0],
        width,
        height,
        bitrate,
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware',
      };
    } else {
      // Standard VP9 WebM
      const vp9Codec = getVp9CodecString(width, height, fps);
      const accelModes: HardwareAcceleration[] = ['prefer-hardware', 'no-preference', 'prefer-software'];
      for (const accel of accelModes) {
        try {
          const testConfig: VideoEncoderConfig = {
            codec: vp9Codec,
            width,
            height,
            bitrate,
            framerate: fps,
            hardwareAcceleration: accel,
            latencyMode: 'realtime',
          };
          const res = await VideoEncoder.isConfigSupported(testConfig);
          if (res.supported && res.config) {
            return {
              ...res.config,
              width,
              height,
              bitrate,
              framerate: fps,
              hardwareAcceleration: accel,
              latencyMode: 'realtime',
            };
          }
        } catch {}
      }

      return {
        codec: vp9Codec,
        width,
        height,
        bitrate,
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware',
      };
    }
  }

  public async exportVideo(
    audioBuffer: AudioBuffer,
    waveformData: WaveformData | null,
    config: ExportConfig,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const startTime = performance.now();

    // 1. Check if transparency is requested
    const isAlphaExport = Boolean(
      config.exportAlpha ||
      config.format === 'webm-alpha' ||
      config.format === 'png-sequence' ||
      config.settings.backgroundType === 'transparent'
    );

    // 2. If PNG Sequence export is chosen, handle through fast headless ZIP exporter
    if (config.format === 'png-sequence') {
      return this.exportPngSequence(audioBuffer, waveformData, config, onProgress);
    }

    // 3. Calculate Dimensions based on Aspect Ratio and Target Resolution
    const { width, height } = this.calculateDimensions(config);
    const fps = config.fps || 60;
    const trimStart = Math.max(0, Math.min(config.trimStart, audioBuffer.duration));
    const trimEnd = Math.min(
      audioBuffer.duration,
      Math.max(trimStart + 0.1, config.trimEnd || audioBuffer.duration)
    );
    const duration = trimEnd - trimStart;
    const totalFrames = Math.max(1, Math.ceil(duration * fps));

    onProgress?.({
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      fps: 0,
      speedMultiplier: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: 0,
      status: 'initializing',
    });

    const isMp4 = config.format === 'mp4' && !isAlphaExport;

    // 4. If Alpha export is requested in WebM, dynamically detect if WebCodecs supports alpha: 'keep'
    let supportedAlphaConfig: VideoEncoderConfig | null = null;
    if (isAlphaExport && typeof window.VideoEncoder !== 'undefined' && typeof VideoEncoder.isConfigSupported === 'function') {
      supportedAlphaConfig = await this.findOptimalVideoConfig(
        width,
        height,
        fps,
        config.videoBitrate || 8_000_000,
        false,
        true
      );
    }

    // If browser does not support WebCodecs alpha (e.g. mobile Safari / Chrome Android),
    // use Server-Side Headless rendering (FFmpeg libvpx-vp9 -pix_fmt yuva420p) if cloud is available,
    // otherwise fallback immediately to in-browser MediaRecorder alpha rendering!
    if (isAlphaExport && !supportedAlphaConfig) {
      const isCloud = await checkCloudAvailability();
      if (isCloud) {
        try {
          return await this.exportViaServerHeadless(
            audioBuffer,
            waveformData,
            config,
            width,
            height,
            fps,
            trimStart,
            trimEnd,
            duration,
            onProgress
          );
        } catch (err: any) {
          if (signal.aborted) {
            throw new Error('Export canceled by user.');
          }
          console.warn('Server headless alpha render failed, attempting in-browser MediaRecorder fallback:', err);
        }
      }

      try {
        return await this.exportViaMediaRecorder(
          audioBuffer,
          waveformData,
          config,
          width,
          height,
          fps,
          trimStart,
          trimEnd,
          duration,
          onProgress
        );
      } catch (mediaErr: any) {
        if (signal.aborted) {
          throw new Error('Export canceled by user.');
        }
        console.warn('MediaRecorder alpha export failed:', mediaErr);
        throw new Error(`Transparent WebM export failed: ${mediaErr?.message || 'Unsupported in this environment'}`);
      }
    }

    // 5. Prepare Offline Fast FFT Analyzer (1024 points for fast 43Hz binning & continuous sub-bin interpolation)
    let analyzer: OfflineAudioAnalyzer | null = new OfflineAudioAnalyzer(audioBuffer, 1024);

    // 6. Create Offscreen or Virtual Canvas
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d', {
        alpha: isAlphaExport ? true : false,
      }) as OffscreenCanvasRenderingContext2D;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d', { alpha: isAlphaExport ? true : false });
    }

    if (!ctx) {
      throw new Error('Failed to create canvas rendering context for video exporter.');
    }

    // 7. Verify WebCodecs Availability
    const hasWebCodecs = typeof window.VideoEncoder !== 'undefined';
    if (!hasWebCodecs) {
      throw new Error(
        'WebCodecs API is not supported in this browser. Please use modern Chrome, Edge, or Firefox for hardware-accelerated export.'
      );
    }

    // 8. Initialize Muxer (MP4 or WebM)
    let mp4Muxer: Mp4Muxer<Mp4ArrayBufferTarget> | null = null;
    let webmMuxer: WebmMuxer<WebmArrayBufferTarget> | null = null;

    if (isMp4) {
      mp4Muxer = new Mp4Muxer({
        target: new Mp4ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width,
          height,
        },
        audio: {
          codec: 'aac',
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: Math.min(2, audioBuffer.numberOfChannels),
        },
        // fastStart: false writes chunk bytes directly to target without accumulating all chunk objects in memory
        fastStart: false,
      });
    } else {
      webmMuxer = new WebmMuxer({
        target: new WebmArrayBufferTarget(),
        video: {
          codec: 'V_VP9',
          width,
          height,
          frameRate: fps,
          alpha: isAlphaExport,
        },
        audio: {
          codec: 'A_OPUS',
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: Math.min(2, audioBuffer.numberOfChannels),
        },
      });
    }

    // 9. Setup Video Encoder
    let videoEncoder: VideoEncoder | null = null;
    let fatalError: Error | null = null;
    const videoInit = {
      output: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => {
        try {
          if (mp4Muxer) mp4Muxer.addVideoChunk(chunk, meta);
          if (webmMuxer) webmMuxer.addVideoChunk(chunk, meta);
        } catch (err: any) {
          fatalError = err instanceof Error ? err : new Error(String(err));
        }
      },
      error: (e: DOMException) => {
        fatalError = new Error(`Video encoder error: ${e.message}`);
      },
    };

    videoEncoder = new VideoEncoder(videoInit);

    let activeVideoConfig: VideoEncoderConfig | null = supportedAlphaConfig;

    if (!activeVideoConfig) {
      activeVideoConfig = await this.findOptimalVideoConfig(
        width,
        height,
        fps,
        config.videoBitrate || 8_000_000,
        isMp4,
        isAlphaExport
      );
    }

    if (activeVideoConfig) {
      videoEncoder.configure(activeVideoConfig);
    } else {
      let fallbackCodec = 'avc1.4d002a';
      if (width > 1920 || height > 1920) {
        fallbackCodec = 'avc1.640033';
      } else if (width <= 1280 && height <= 1280) {
        fallbackCodec = 'avc1.4d001f';
      }
      if (!isMp4) {
        fallbackCodec = getVp9CodecString(width, height, fps);
      }

      videoEncoder.configure({
        codec: fallbackCodec,
        width,
        height,
        bitrate: config.videoBitrate || 8_000_000,
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware',
      });
    }

    // 10. Setup Audio Encoder
    onProgress?.({
      currentFrame: 0,
      totalFrames,
      percentage: 2,
      fps: 0,
      speedMultiplier: 0,
      elapsedSeconds: (performance.now() - startTime) / 1000,
      estimatedRemainingSeconds: 0,
      status: 'encoding-audio',
    });

    let audioEncoder: AudioEncoder | null = null;
    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;

    if (typeof window.AudioEncoder !== 'undefined') {
      const audioInit = {
        output: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => {
          if (mp4Muxer) mp4Muxer.addAudioChunk(chunk, meta);
          if (webmMuxer) webmMuxer.addAudioChunk(chunk, meta);
        },
        error: (e: DOMException) => {
          console.warn('AudioEncoder error:', e);
        },
      };

      audioEncoder = new AudioEncoder(audioInit);
      const audioCodec = isMp4 ? 'mp4a.40.2' : 'opus';

      audioEncoder.configure({
        codec: audioCodec,
        numberOfChannels: channels,
        sampleRate: sampleRate,
        bitrate: config.audioBitrate || 192_000,
      });

      // Encode trimmed audio in chunks
      const audioChunkFrames = 1024;
      const startSample = Math.floor(trimStart * sampleRate);
      const endSample = Math.floor(trimEnd * sampleRate);
      const totalAudioSamples = endSample - startSample;

      const planarBuffer = new Float32Array(channels * audioChunkFrames);

      for (let s = 0; s < totalAudioSamples; s += audioChunkFrames) {
        if (signal.aborted) {
          videoEncoder.close();
          audioEncoder.close();
          throw new Error('Export canceled by user.');
        }

        const chunkLen = Math.min(audioChunkFrames, totalAudioSamples - s);
        const chunkStart = startSample + s;

        for (let ch = 0; ch < channels; ch++) {
          const chData = audioBuffer.getChannelData(ch);
          const channelOffset = ch * audioChunkFrames;
          for (let j = 0; j < chunkLen; j++) {
            planarBuffer[channelOffset + j] = chData[chunkStart + j] || 0;
          }
        }

        const audioTimestampUs = Math.round((s / sampleRate) * 1_000_000);
        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate: sampleRate,
          numberOfFrames: chunkLen,
          numberOfChannels: channels,
          timestamp: audioTimestampUs,
          data: planarBuffer.subarray(0, channels * chunkLen),
        });

        audioEncoder.encode(audioData);
        audioData.close();

        // Audio backpressure pacing: ensure audio encoder queue stays small and doesn't swamp memory
        while (audioEncoder.encodeQueueSize > 8) {
          if (fatalError) throw fatalError;
          await new Promise<void>((resolve) => setTimeout(resolve, 2));
        }

        // Periodic yield to allow garbage collection during long audio tracks
        if ((s / audioChunkFrames) % 50 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      await audioEncoder.flush();
    }

    // 11. Headless Render Loop for Video Frames
    onProgress?.({
      currentFrame: 0,
      totalFrames,
      percentage: 5,
      fps: 0,
      speedMultiplier: 0,
      elapsedSeconds: (performance.now() - startTime) / 1000,
      estimatedRemainingSeconds: 0,
      status: 'rendering-video',
    });

    const barCount = config.settings.barCount || 100;
    let lastTime = performance.now();
    let framesRenderedSinceLast = 0;
    let currentFps = 0;

    const effectiveSettings: VisualizerSettings = isAlphaExport
      ? { ...config.settings, backgroundType: 'transparent' }
      : config.settings;

    for (let i = 0; i < totalFrames; i++) {
      if (signal.aborted) {
        videoEncoder.close();
        if (audioEncoder) audioEncoder.close();
        throw new Error('Export canceled by user.');
      }

      const frameTimeSec = trimStart + i / fps;

      // Extract precise frequency spectrum and waveform for this exact millisecond
      const spectrum = analyzer.getSpectrumAtTime(
        frameTimeSec,
        barCount,
        config.settings.smoothing ?? 0.65,
        config.settings.softKneeCompression !== false,
        (config.settings.heightScale || 1.0) * (config.settings.sensitivity || 1.0)
      );

      // Sync background video frame if active
      if (config.backgroundVideo && !isAlphaExport && config.backgroundVideo.duration > 0) {
        const vidTarget = ((frameTimeSec - trimStart) % config.backgroundVideo.duration);
        if (Math.abs(config.backgroundVideo.currentTime - vidTarget) > 0.035) {
          config.backgroundVideo.currentTime = vidTarget;
          await new Promise<void>((resolve) => {
            const onDone = () => {
              config.backgroundVideo?.removeEventListener('seeked', onDone);
              resolve();
            };
            config.backgroundVideo?.addEventListener('seeked', onDone);
            setTimeout(onDone, 50);
          });
        }
      }

      // Render frame
      renderVisualizerFrame({
        ctx,
        width,
        height,
        time: frameTimeSec - trimStart,
        duration,
        isPlaying: true,
        spectrum,
        waveformData,
        settings: effectiveSettings,
        theme: config.theme,
        backgroundImage: isAlphaExport ? null : config.backgroundImage,
        backgroundVideo: isAlphaExport ? null : config.backgroundVideo,
        backgroundBlur: isAlphaExport ? 0 : config.backgroundBlur,
        backgroundDim: isAlphaExport ? 0 : config.backgroundDim,
        profileImage: config.profileImage,
        isExport: true,
      });

      // Construct VideoFrame from Canvas
      const timestampUs = Math.round((i / fps) * 1_000_000);
      const frameDurationUs = Math.round((1 / fps) * 1_000_000);

      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampUs,
        duration: frameDurationUs,
        alpha: isAlphaExport ? 'keep' : 'discard',
      });

      // Keyframe every 2 seconds
      const isKeyframe = i % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyframe });
      videoFrame.close();

      // Strict bounded encoder queue pacing:
      // Never allow more than 2 uncompressed frames to accumulate in GPU/encoder memory.
      // This eliminates the massive queue buildup that causes GPU out-of-memory and browser crashes.
      while (videoEncoder.encodeQueueSize > 2) {
        if (fatalError) throw fatalError;
        await new Promise<void>((resolve) => {
          let resolved = false;
          const onDequeue = () => {
            if (!resolved) {
              resolved = true;
              if (videoEncoder && 'removeEventListener' in videoEncoder) {
                videoEncoder.removeEventListener('dequeue', onDequeue);
              }
              resolve();
            }
          };
          if ('addEventListener' in videoEncoder) {
            videoEncoder.addEventListener('dequeue', onDequeue, { once: true });
          }
          // Polling fallback every 4ms in case dequeue event was missed
          setTimeout(onDequeue, 4);
        });
      }

      // Micro-yield to browser event loop every 15 frames to keep UI responsive and allow GC passes
      if (i % 15 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      framesRenderedSinceLast++;
      const now = performance.now();
      const delta = now - lastTime;

      // Update progress every 80ms or on final frame
      if (delta >= 80 || i === totalFrames - 1) {
        currentFps = Math.round((framesRenderedSinceLast / (delta / 1000)) || 1);
        const speedMultiplier = Number((currentFps / fps).toFixed(1));
        const elapsedSec = (now - startTime) / 1000;
        const framesLeft = totalFrames - (i + 1);
        const estimatedRemainingSec = currentFps > 0 ? framesLeft / currentFps : 0;

        onProgress?.({
          currentFrame: i + 1,
          totalFrames,
          percentage: 5 + Math.round(((i + 1) / totalFrames) * 94),
          fps: currentFps,
          speedMultiplier,
          elapsedSeconds: Number(elapsedSec.toFixed(1)),
          estimatedRemainingSeconds: Number(estimatedRemainingSec.toFixed(1)),
          status: 'rendering-video',
        });

        lastTime = now;
        framesRenderedSinceLast = 0;
      }
    }

    if (fatalError) throw fatalError;

    // 12. Finalize & Mux
    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 99,
      fps: currentFps,
      speedMultiplier: Number((currentFps / fps).toFixed(1)),
      elapsedSeconds: (performance.now() - startTime) / 1000,
      estimatedRemainingSeconds: 0,
      status: 'finalizing',
    });

    // Flush remaining frames (guaranteed <= 2 frames in queue due to strict pacing)
    await videoEncoder.flush();
    videoEncoder.close();
    videoEncoder = null;
    if (audioEncoder) {
      audioEncoder.close();
      audioEncoder = null;
    }

    // Immediately release canvas GPU framebuffers, textures, and audio FFT buffers
    if (canvas instanceof HTMLCanvasElement) {
      canvas.width = 0;
      canvas.height = 0;
    }
    ctx = null;
    analyzer = null;

    // Micro-yield to allow browser GC to reclaim canvas textures and intermediate frame buffers
    await new Promise((resolve) => setTimeout(resolve, 40));

    let rawBuffer: ArrayBuffer;
    let mimeType = 'video/mp4';

    if (isMp4 && mp4Muxer) {
      mp4Muxer.finalize();
      rawBuffer = mp4Muxer.target.buffer;
      mimeType = 'video/mp4';
      mp4Muxer = null;
    } else if (webmMuxer) {
      webmMuxer.finalize();
      rawBuffer = webmMuxer.target.buffer;
      mimeType = 'video/webm';
      webmMuxer = null;
    } else {
      throw new Error('Muxer instance was not initialized.');
    }

    // Micro-yield before Blob allocation to ensure clean memory transition
    await new Promise((resolve) => setTimeout(resolve, 40));

    const videoBlob = new Blob([rawBuffer], { type: mimeType });
    rawBuffer = null as any;
    const videoUrl = URL.createObjectURL(videoBlob);
    const totalRenderTime = (performance.now() - startTime) / 1000;
    const averageFps = Math.round(totalFrames / Math.max(0.1, totalRenderTime));
    const speedRatio = Number((duration / Math.max(0.1, totalRenderTime)).toFixed(1));

    const cleanTitle = (config.settings.trackTitle || 'visualizer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const alphaTag = isAlphaExport ? '_alpha' : '';
    const fileName = `${cleanTitle}${alphaTag}_${config.resolution}_${fps}fps.${isMp4 ? 'mp4' : 'webm'}`;

    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      fps: averageFps,
      speedMultiplier: speedRatio,
      elapsedSeconds: Number(totalRenderTime.toFixed(1)),
      estimatedRemainingSeconds: 0,
      status: 'completed',
    });

    return {
      blob: videoBlob,
      url: videoUrl,
      fileName,
      fileSize: videoBlob.size,
      duration,
      width,
      height,
      totalFrames,
      renderTimeSec: Number(totalRenderTime.toFixed(1)),
      averageFps,
      speedRatio,
    };
  }

  /**
   * Transparent WebM export via Headless Server rendering (FFmpeg libvpx-vp9 -pix_fmt yuva420p)
   * Deterministic offline frame-by-frame encoding with genuine alpha channel, zero dropped frames, and true 60fps/30fps
   */
  private async exportViaServerHeadless(
    audioBuffer: AudioBuffer,
    waveformData: WaveformData | null,
    config: ExportConfig,
    width: number,
    height: number,
    fps: number,
    trimStart: number,
    trimEnd: number,
    duration: number,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    const startTime = performance.now();
    const cleanTitle = (config.settings.trackTitle || 'visualizer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const fileName = `${cleanTitle}_alpha_${config.resolution}_${fps}fps.webm`;
    const totalFrames = Math.max(1, Math.floor(duration * fps));

    onProgress?.({
      currentFrame: 0,
      totalFrames,
      percentage: 2,
      fps,
      speedMultiplier: 1.0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: duration,
      status: 'initializing',
    });

    // 1. Convert trimmed AudioBuffer to high-fidelity WAV blob
    const wavBlob = audioBufferToWavBlob(audioBuffer, trimStart, trimEnd);
    const wavDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(wavBlob);
    });

    // 2. Prepare Profile Image if available
    let profileDataUrl: string | undefined;
    if (config.profileImage && config.profileImage instanceof HTMLImageElement) {
      profileDataUrl = config.profileImage.src;
    }

    // 3. Register Unique Job ID & Connect SSE for Real-Time Server Progress
    const jobId = `export_alpha_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let sse: EventSource | null = null;
    try {
      sse = new EventSource(`/api/render-progress/${jobId}`);
      sse.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && typeof data.progress === 'number') {
            const pct = Math.max(0, Math.min(99, data.progress));
            const currentFrame = data.currentFrame || Math.round((pct / 100) * totalFrames);
            const elapsed = (performance.now() - startTime) / 1000;
            const remaining = pct > 0 ? (elapsed / (pct / 100)) - elapsed : duration;

            onProgress?.({
              currentFrame,
              totalFrames,
              percentage: pct,
              fps: data.fps || fps,
              speedMultiplier: 1.0,
              elapsedSeconds: Number(elapsed.toFixed(1)),
              estimatedRemainingSeconds: Number(Math.max(0, remaining).toFixed(1)),
              status: 'rendering-video',
            });
          }
        } catch {}
      };
    } catch {
      // SSE optional
    }

    onProgress?.({
      currentFrame: 0,
      totalFrames,
      percentage: 5,
      fps,
      speedMultiplier: 1.0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: duration,
      status: 'rendering-video',
    });

    // 4. POST to /api/render-headless with full options
    const payload = {
      video: {
        width,
        height,
        fps,
        format: 'webm',
        duration,
      },
      settings: {
        ...config.settings,
        backgroundType: 'transparent',
      },
      theme: config.theme,
      audio: wavDataUrl,
      profileImage: profileDataUrl,
    };

    const response = await fetch(`/api/render-headless?jobId=${jobId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-job-id': jobId,
      },
      body: JSON.stringify(payload),
      signal: this.abortController?.signal,
    });

    if (sse) {
      sse.close();
    }

    if (!response.ok) {
      throw new Error(`Server headless render failed: ${response.statusText} (${response.status})`);
    }

    const videoBlob = await response.blob();
    const videoUrl = URL.createObjectURL(videoBlob);
    const totalTimeMs = performance.now() - startTime;

    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      fps,
      speedMultiplier: 1.0,
      elapsedSeconds: Number((totalTimeMs / 1000).toFixed(1)),
      estimatedRemainingSeconds: 0,
      status: 'completed',
    });

    return {
      blob: videoBlob,
      url: videoUrl,
      fileName,
      fileSize: videoBlob.size,
      duration,
      width,
      height,
      totalFrames,
      renderTimeSec: totalTimeMs / 1000,
      averageFps: totalFrames / (totalTimeMs / 1000),
      speedRatio: duration / (totalTimeMs / 1000),
    };
  }

  /**
   * Transparent WebM export via MediaRecorder canvas capture
   * Provides 100% genuine alpha preservation across Chrome, Edge, and Firefox
   */
  private async exportViaMediaRecorder(
    audioBuffer: AudioBuffer,
    waveformData: WaveformData | null,
    config: ExportConfig,
    width: number,
    height: number,
    fps: number,
    trimStart: number,
    trimEnd: number,
    duration: number,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    const startTime = performance.now();
    const cleanTitle = (config.settings.trackTitle || 'visualizer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const fileName = `${cleanTitle}_alpha_${config.resolution}_${fps}fps.webm`;

    // 1. Create transparent DOM Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Failed to create transparent 2D canvas context for recording.');

    // 2. Determine best supported mime type
    let mimeType = 'video/webm;codecs=vp9';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }
    }

    // 3. Setup Audio Stream Destination
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const dest = audioCtx.createMediaStreamDestination();
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(dest);

    // 4. Capture canvas stream and combine with audio
    const canvasStream = canvas.captureStream(fps);
    const audioTracks = dest.stream.getAudioTracks();
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(audioTracks[0] ? [audioTracks[0]] : []),
    ]);

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: config.videoBitrate || 8_000_000,
      audioBitsPerSecond: config.audioBitrate || 192_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const analyzer = new OfflineAudioAnalyzer(audioBuffer, 2048);
    const barCount = config.settings.barCount || 100;
    const totalFrames = Math.max(1, Math.ceil(duration * fps));
    const isAlphaExport = Boolean(config.exportAlpha || config.settings.backgroundType === 'transparent');

    return new Promise((resolve, reject) => {
      let animId: number;
      let isCanceled = false;

      const cleanup = () => {
        if (animId) cancelAnimationFrame(animId);
        try {
          source.stop();
        } catch {}
        try {
          audioCtx.close();
        } catch {}
        combinedStream.getTracks().forEach((t) => t.stop());
      };

      if (this.abortController) {
        this.abortController.signal.addEventListener('abort', () => {
          isCanceled = true;
          cleanup();
          try {
            recorder.stop();
          } catch {}
          reject(new Error('Export canceled by user.'));
        });
      }

      recorder.onerror = (err) => {
        cleanup();
        reject(err);
      };

      recorder.onstop = () => {
        cleanup();
        if (isCanceled) return;

        const videoBlob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        const totalRenderTime = (performance.now() - startTime) / 1000;
        const averageFps = Math.round(totalFrames / Math.max(0.1, totalRenderTime));
        const speedRatio = Number((duration / Math.max(0.1, totalRenderTime)).toFixed(1));

        onProgress?.({
          currentFrame: totalFrames,
          totalFrames,
          percentage: 100,
          fps: averageFps,
          speedMultiplier: speedRatio,
          elapsedSeconds: Number(totalRenderTime.toFixed(1)),
          estimatedRemainingSeconds: 0,
          status: 'completed',
        });

        resolve({
          blob: videoBlob,
          url: videoUrl,
          fileName,
          fileSize: videoBlob.size,
          duration,
          width,
          height,
          totalFrames,
          renderTimeSec: Number(totalRenderTime.toFixed(1)),
          averageFps,
          speedRatio,
        });
      };

      // Start recording and audio playback
      recorder.start(100);
      source.start(0, trimStart, duration);
      const renderStartTime = performance.now();

      const renderLoop = () => {
        if (isCanceled) return;

        const now = performance.now();
        const elapsed = (now - renderStartTime) / 1000;
        const currentPlaybackTime = trimStart + elapsed;
        const currentFrameIndex = Math.min(totalFrames, Math.floor(elapsed * fps));

        if (elapsed >= duration) {
          try {
            recorder.stop();
          } catch {}
          return;
        }

        const spectrum = analyzer.getSpectrumAtTime(
          currentPlaybackTime,
          barCount,
          config.settings.smoothing ?? 0.65,
          config.settings.softKneeCompression !== false,
          (config.settings.heightScale || 1.0) * (config.settings.sensitivity || 1.0)
        );

        renderVisualizerFrame({
          ctx,
          width,
          height,
          time: elapsed,
          duration,
          isPlaying: true,
          spectrum,
          waveformData,
          settings: isAlphaExport ? { ...config.settings, backgroundType: 'transparent' } : config.settings,
          theme: config.theme,
          backgroundImage: isAlphaExport ? null : config.backgroundImage,
          backgroundVideo: isAlphaExport ? null : config.backgroundVideo,
          backgroundBlur: isAlphaExport ? 0 : config.backgroundBlur,
          backgroundDim: isAlphaExport ? 0 : config.backgroundDim,
          profileImage: config.profileImage,
          isExport: true,
        });

        const progressPercent = Math.min(99, Math.round((elapsed / duration) * 100));
        const estRemaining = Math.max(0, duration - elapsed);

        onProgress?.({
          currentFrame: currentFrameIndex,
          totalFrames,
          percentage: progressPercent,
          fps,
          speedMultiplier: 1.0,
          elapsedSeconds: Number(elapsed.toFixed(1)),
          estimatedRemainingSeconds: Number(estRemaining.toFixed(1)),
          status: 'rendering-video',
        });

        animId = requestAnimationFrame(renderLoop);
      };

      animId = requestAnimationFrame(renderLoop);
    });
  }

  /**
   * Transparent PNG Sequence export packed in a ZIP archive with companion audio.wav
   * Universal format for Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro, and After Effects
   */
  private async exportPngSequence(
    audioBuffer: AudioBuffer,
    waveformData: WaveformData | null,
    config: ExportConfig,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    const startTime = performance.now();
    const { width, height } = this.calculateDimensions(config);
    const fps = config.fps || 60;
    const trimStart = Math.max(0, Math.min(config.trimStart, audioBuffer.duration));
    const trimEnd = Math.min(
      audioBuffer.duration,
      Math.max(trimStart + 0.1, config.trimEnd || audioBuffer.duration)
    );
    const duration = trimEnd - trimStart;
    const totalFrames = Math.max(1, Math.ceil(duration * fps));
    const signal = this.abortController?.signal;

    onProgress?.({
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      fps: 0,
      speedMultiplier: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: 0,
      status: 'initializing',
    });

    const analyzer = new OfflineAudioAnalyzer(audioBuffer, 2048);
    const barCount = config.settings.barCount || 100;
    const isAlphaExport = Boolean(config.exportAlpha || config.settings.backgroundType === 'transparent');

    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d', {
        alpha: true,
        desynchronized: true,
      }) as OffscreenCanvasRenderingContext2D;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d', { alpha: true });
    }

    if (!ctx) throw new Error('Failed to create canvas context for PNG sequence export.');

    const zip = new JSZip();
    const framesFolder = zip.folder('frames') || zip;

    let lastReportTime = performance.now();
    let framesRenderedSinceReport = 0;
    let currentFps = 0;

    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) {
        throw new Error('Export canceled by user.');
      }

      const frameTimeSec = trimStart + i / fps;
      const spectrum = analyzer.getSpectrumAtTime(
        frameTimeSec,
        barCount,
        config.settings.smoothing ?? 0.65,
        config.settings.softKneeCompression !== false,
        (config.settings.heightScale || 1.0) * (config.settings.sensitivity || 1.0)
      );

      renderVisualizerFrame({
        ctx,
        width,
        height,
        time: frameTimeSec - trimStart,
        duration,
        isPlaying: true,
        spectrum,
        waveformData,
        settings: isAlphaExport ? { ...config.settings, backgroundType: 'transparent' } : config.settings,
        theme: config.theme,
        backgroundImage: isAlphaExport ? null : config.backgroundImage,
        backgroundVideo: isAlphaExport ? null : config.backgroundVideo,
        backgroundBlur: isAlphaExport ? 0 : config.backgroundBlur,
        backgroundDim: isAlphaExport ? 0 : config.backgroundDim,
        profileImage: config.profileImage,
        isExport: true,
      });

      let pngBlob: Blob;
      if ('convertToBlob' in canvas) {
        pngBlob = await (canvas as OffscreenCanvas).convertToBlob({ type: 'image/png' });
      } else {
        pngBlob = await new Promise<Blob>((resolve) => {
          (canvas as HTMLCanvasElement).toBlob((b) => resolve(b || new Blob()), 'image/png');
        });
      }

      const frameFileName = `frame_${String(i).padStart(6, '0')}.png`;
      framesFolder.file(frameFileName, pngBlob);

      framesRenderedSinceReport++;
      const now = performance.now();
      const reportDelta = now - lastReportTime;

      if (reportDelta >= 100 || i === totalFrames - 1) {
        currentFps = Math.round(framesRenderedSinceReport / (reportDelta / 1000) || 1);
        const speedMultiplier = Number((currentFps / fps).toFixed(1));
        const elapsedSec = (now - startTime) / 1000;
        const framesLeft = totalFrames - (i + 1);
        const estimatedRemainingSec = currentFps > 0 ? framesLeft / currentFps : 0;

        onProgress?.({
          currentFrame: i + 1,
          totalFrames,
          percentage: Math.round(((i + 1) / totalFrames) * 90),
          fps: currentFps,
          speedMultiplier,
          elapsedSeconds: Number(elapsedSec.toFixed(1)),
          estimatedRemainingSeconds: Number(estimatedRemainingSec.toFixed(1)),
          status: 'rendering-video',
        });

        lastReportTime = now;
        framesRenderedSinceReport = 0;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 92,
      fps: currentFps,
      speedMultiplier: Number((currentFps / fps).toFixed(1)),
      elapsedSeconds: (performance.now() - startTime) / 1000,
      estimatedRemainingSeconds: 2,
      status: 'finalizing',
    });

    // Add audio WAV companion track
    const wavBlob = audioBufferToWavBlob(audioBuffer, trimStart, trimEnd);
    zip.file('audio.wav', wavBlob);

    // Add instructions README
    const cleanTitle = (config.settings.trackTitle || 'visualizer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();

    const readme = `=== TRANSPARENT AUDIO VISUALIZER PNG SEQUENCE ===
Track: ${config.settings.trackTitle || 'Visualizer'}
Resolution: ${width}x${height}
Frame Rate: ${fps} FPS
Total Frames: ${totalFrames}
Duration: ${duration.toFixed(2)} seconds

HOW TO IMPORT TRANSPARENT SEQUENCE INTO VIDEO EDITORS:
1. Adobe Premiere Pro:
   - Go to File > Import.
   - Navigate to the extracted 'frames' folder and click 'frame_000000.png'.
   - Check the 'Image Sequence' checkbox at the bottom of the file picker.
   - Click Import. Premiere will import the entire sequence as a single transparent video track.
   - Drag 'audio.wav' directly below the video clip.

2. DaVinci Resolve:
   - In Media Storage or Media Pool, open the extracted folder.
   - DaVinci Resolve automatically collapses all PNG frames into a single image sequence clip with transparency.
   - Drag it onto your timeline over any background, video, or gameplay.
   - Add 'audio.wav' on an audio track.

3. Final Cut Pro:
   - Drag the frames into timeline or use QuickTime Player to open image sequence and export ProRes 4444.

4. After Effects:
   - File > Import > File...
   - Select 'frame_000000.png', check 'PNG Sequence', click Import.
`;
    zip.file('README_IMPORT.txt', readme);

    // Packaging ZIP archive with STORE compression (PNGs are already compressed)
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (metadata) => {
      onProgress?.({
        currentFrame: totalFrames,
        totalFrames,
        percentage: 90 + Math.round((metadata.percent / 100) * 10),
        fps: currentFps,
        speedMultiplier: Number((currentFps / fps).toFixed(1)),
        elapsedSeconds: (performance.now() - startTime) / 1000,
        estimatedRemainingSeconds: 1,
        status: 'finalizing',
      });
    });

    const totalRenderTime = (performance.now() - startTime) / 1000;
    const averageFps = Math.round(totalFrames / Math.max(0.1, totalRenderTime));
    const speedRatio = Number((duration / Math.max(0.1, totalRenderTime)).toFixed(1));
    const fileName = `${cleanTitle}_alpha_sequence_${config.resolution}_${fps}fps.zip`;

    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      fps: averageFps,
      speedMultiplier: speedRatio,
      elapsedSeconds: Number(totalRenderTime.toFixed(1)),
      estimatedRemainingSeconds: 0,
      status: 'completed',
    });

    return {
      blob: zipBlob,
      url: URL.createObjectURL(zipBlob),
      fileName,
      fileSize: zipBlob.size,
      duration,
      width,
      height,
      totalFrames,
      renderTimeSec: Number(totalRenderTime.toFixed(1)),
      averageFps,
      speedRatio,
    };
  }

  private calculateDimensions(config: ExportConfig): { width: number; height: number } {
    if (config.resolution === 'custom' && config.customWidth && config.customHeight) {
      return {
        width: Math.floor(config.customWidth / 2) * 2,
        height: Math.floor(config.customHeight / 2) * 2,
      };
    }

    const aspect = config.settings.aspectRatio || '16:9';
    const is1080p = config.resolution === '1080p';
    const is4k = config.resolution === '4k';
    const is720p = config.resolution === '720p';

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

    // 16:9 Landscape default
    if (is4k) return { width: 3840, height: 2160 };
    if (is720p) return { width: 1280, height: 720 };
    return { width: 1920, height: 1080 };
  }
}

export const fastVideoExporter = new FastHeadlessVideoExporter();
