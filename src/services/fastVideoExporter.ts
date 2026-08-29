import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import { ColorTheme, VisualizerSettings, WaveformData } from '../types';
import { OfflineAudioAnalyzer } from './fftAnalyzer';
import { renderVisualizerFrame } from './visualizerRenderer';

export type ExportResolution = '720p' | '1080p' | '4k' | 'custom';
export type ExportFormat = 'mp4' | 'webm';

export interface ExportConfig {
  resolution: ExportResolution;
  customWidth?: number;
  customHeight?: number;
  fps: 30 | 60;
  videoBitrate: number; // in bps, e.g. 8_000_000 (8 Mbps)
  audioBitrate: number; // in bps, e.g. 192_000 (192 kbps)
  format: ExportFormat;
  trimStart: number; // in seconds
  trimEnd: number; // in seconds
  settings: VisualizerSettings;
  theme: ColorTheme;
  backgroundImage?: HTMLImageElement | ImageBitmap | null;
  backgroundBlur?: number;
  backgroundDim?: number;
  profileImage?: HTMLImageElement | ImageBitmap | null;
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  fps: number; // Speed multiplier (e.g. 180 FPS)
  speedMultiplier: number; // e.g. 6.0x faster than real-time
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  status: 'initializing' | 'encoding-audio' | 'rendering-video' | 'finalizing' | 'completed' | 'canceled' | 'error';
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
  speedRatio: number;
}

export class FastHeadlessVideoExporter {
  private abortController: AbortController | null = null;

  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
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

    // 1. Calculate Dimensions based on Aspect Ratio and Target Resolution
    const { width, height } = this.calculateDimensions(config);
    const fps = config.fps || 60;
    const trimStart = Math.max(0, Math.min(config.trimStart, audioBuffer.duration));
    const trimEnd = Math.min(audioBuffer.duration, Math.max(trimStart + 0.1, config.trimEnd || audioBuffer.duration));
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

    // 2. Prepare Offline Fast FFT Analyzer (Precomputed tables)
    const analyzer = new OfflineAudioAnalyzer(audioBuffer, 1024);

    // 3. Create Offscreen or Virtual Canvas
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as OffscreenCanvasRenderingContext2D;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d', { alpha: false });
    }

    if (!ctx) {
      throw new Error('Failed to create canvas rendering context for video exporter.');
    }

    // 4. Verify WebCodecs Availability
    const hasWebCodecs = typeof window.VideoEncoder !== 'undefined';
    if (!hasWebCodecs) {
      throw new Error(
        'WebCodecs API is not supported in this browser. Please use modern Chrome, Edge, or Safari for hardware-accelerated export.'
      );
    }

    // 5. Initialize Muxer (MP4 or WebM)
    const isMp4 = config.format === 'mp4';
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
        fastStart: 'in-memory',
      });
    } else {
      webmMuxer = new WebmMuxer({
        target: new WebmArrayBufferTarget(),
        video: {
          codec: 'V_VP9',
          width,
          height,
        },
        audio: {
          codec: 'A_OPUS',
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: Math.min(2, audioBuffer.numberOfChannels),
        },
      });
    }

    // 6. Setup Video Encoder
    let videoEncoder: VideoEncoder | null = null;
    const videoInit = {
      output: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => {
        if (mp4Muxer) mp4Muxer.addVideoChunk(chunk, meta);
        if (webmMuxer) webmMuxer.addVideoChunk(chunk, meta);
      },
      error: (e: DOMException) => {
        throw new Error(`Video encoding failed: ${e.message}`);
      },
    };

    videoEncoder = new VideoEncoder(videoInit);

    let videoCodecString = 'avc1.4d002a';
    if (width > 1920 || height > 1920) {
      videoCodecString = 'avc1.640033';
    } else if (width <= 1280 && height <= 1280) {
      videoCodecString = 'avc1.4d001f';
    }

    if (!isMp4) {
      videoCodecString = 'vp09.00.10.08';
    }

    videoEncoder.configure({
      codec: videoCodecString,
      width,
      height,
      bitrate: config.videoBitrate || 8_000_000,
      framerate: fps,
    });

    // 7. Setup Audio Encoder
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
        sampleRate,
        numberOfChannels: channels,
        bitrate: config.audioBitrate || 192_000,
      });

      const startSample = Math.floor(trimStart * sampleRate);
      const endSample = Math.min(audioBuffer.length, Math.floor(trimEnd * sampleRate));
      const chunkSize = 2048;

      let offset = startSample;
      while (offset < endSample) {
        if (signal.aborted) throw new Error('Export canceled by user.');

        const frames = Math.min(chunkSize, endSample - offset);
        const planarData = new Float32Array(channels * frames);

        for (let c = 0; c < channels; c++) {
          const chData = audioBuffer.getChannelData(c);
          planarData.set(chData.subarray(offset, offset + frames), c * frames);
        }

        const timestampUs = Math.round(((offset - startSample) / sampleRate) * 1_000_000);

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: frames,
          numberOfChannels: channels,
          timestamp: timestampUs,
          data: planarData,
        });

        audioEncoder.encode(audioData);
        audioData.close();
        offset += frames;
      }

      await audioEncoder.flush();
    }

    // 8. Headless Ultra-Fast Video Rendering Loop
    let lastReportTime = performance.now();
    let framesEncodedSinceLastReport = 0;
    let currentFps = 0;
    const barCount = config.settings.barCount || 100;

    for (let i = 0; i < totalFrames; i++) {
      if (signal.aborted) {
        videoEncoder.close();
        if (audioEncoder) audioEncoder.close();
        throw new Error('Export canceled by user.');
      }

      // Memory backpressure protection: Strict bounds on queue size
      while (videoEncoder.encodeQueueSize > 4) {
        await new Promise((resolve) => setTimeout(resolve, 2));
        if (signal.aborted) break;
      }

      const frameTimeSec = trimStart + i / fps;
      const spectrum = analyzer.getSpectrumAtTime(
        frameTimeSec,
        barCount,
        config.settings.smoothing,
        config.settings.softKneeCompression,
        (config.settings.maxBarHeight ?? 100) / 100
      );

      // Render Visualizer onto Headless Canvas
      renderVisualizerFrame({
        ctx,
        width,
        height,
        time: frameTimeSec - trimStart,
        duration,
        isPlaying: true,
        spectrum,
        waveformData,
        settings: config.settings,
        theme: config.theme,
        backgroundImage: config.backgroundImage,
        backgroundBlur: config.backgroundBlur,
        backgroundDim: config.backgroundDim,
        profileImage: config.profileImage,
        isExport: true,
      });

      // Construct VideoFrame from Canvas
      const timestampUs = Math.round((i / fps) * 1_000_000);
      const frameDurationUs = Math.round((1 / fps) * 1_000_000);

      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampUs,
        duration: frameDurationUs,
      });

      // Keyframe every 2 seconds
      const isKeyFrame = i % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      framesEncodedSinceLastReport++;

      // Throttled UI Progress update
      const now = performance.now();
      const reportDelta = now - lastReportTime;

      if (reportDelta >= 80 || i === totalFrames - 1) {
        currentFps = Math.round((framesEncodedSinceLastReport / (reportDelta / 1000)) || 1);
        const speedMultiplier = Number((currentFps / fps).toFixed(1));
        const elapsedSec = (now - startTime) / 1000;
        const framesLeft = totalFrames - (i + 1);
        const estimatedRemainingSec = currentFps > 0 ? framesLeft / currentFps : 0;

        onProgress?.({
          currentFrame: i + 1,
          totalFrames,
          percentage: Math.round(((i + 1) / totalFrames) * 98),
          fps: currentFps,
          speedMultiplier,
          elapsedSeconds: Number(elapsedSec.toFixed(1)),
          estimatedRemainingSeconds: Number(estimatedRemainingSec.toFixed(1)),
          status: 'rendering-video',
        });

        lastReportTime = now;
        framesEncodedSinceLastReport = 0;

        // Yield to browser event loop
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // 9. Finalize Video Stream & Muxing
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

    await videoEncoder.flush();
    videoEncoder.close();
    if (audioEncoder) audioEncoder.close();

    let rawBuffer: ArrayBuffer;
    let mimeType = 'video/mp4';

    if (isMp4 && mp4Muxer) {
      mp4Muxer.finalize();
      rawBuffer = mp4Muxer.target.buffer;
      mimeType = 'video/mp4';
    } else if (webmMuxer) {
      webmMuxer.finalize();
      rawBuffer = webmMuxer.target.buffer;
      mimeType = 'video/webm';
    } else {
      throw new Error('Muxer instance was not initialized.');
    }

    const videoBlob = new Blob([rawBuffer], { type: mimeType });
    const videoUrl = URL.createObjectURL(videoBlob);
    const totalRenderTime = (performance.now() - startTime) / 1000;
    const averageFps = Math.round(totalFrames / totalRenderTime);
    const speedRatio = Number((duration / totalRenderTime).toFixed(1));

    const cleanTitle = (config.settings.trackTitle || 'visualizer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const fileName = `${cleanTitle}_${config.resolution}_${fps}fps.${isMp4 ? 'mp4' : 'webm'}`;

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
