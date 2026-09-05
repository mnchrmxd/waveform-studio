import { AudioMetadata, SampleAudioPreset, WaveformData } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private playbackRate = 1.0;
  private isLooping = false;

  private animationFrameId: number | null = null;
  private timeUpdateListeners: ((time: number, duration: number) => void)[] = [];
  private playbackStateListeners: ((playing: boolean) => void)[] = [];

  // Media recorder for mic
  private mediaRecorder: MediaRecorder | null = null;
  private micStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];

  constructor() {
    // Lazy AudioContext initialization
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public async decodeAudioFile(file: File): Promise<{ buffer: AudioBuffer; metadata: AudioMetadata; waveform: WaveformData }> {
    const arrayBuffer = await file.arrayBuffer();
    return this.decodeArrayBuffer(arrayBuffer, file.name, file.size, file.type || 'audio/mpeg');
  }

  public async loadAudioFromUrl(url: string): Promise<{ buffer: AudioBuffer; metadata: AudioMetadata; waveform: WaveformData }> {
    let response: Response;
    try {
      response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch {
      // Fallback via server proxy for cross-origin URLs
      response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`Failed to load audio from URL: HTTP ${response.status}`);
      }
    }
    const arrayBuffer = await response.arrayBuffer();
    const cleanUrl = url.split('?')[0];
    const fileName = cleanUrl.split('/').pop() || 'Remote Audio Track';
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    return this.decodeArrayBuffer(arrayBuffer, decodeURIComponent(fileName), arrayBuffer.byteLength, contentType);
  }

  public async decodeArrayBuffer(
    arrayBuffer: ArrayBuffer,
    fileName: string = 'Audio Track',
    fileSize: number = 0,
    format: string = 'audio/wav'
  ): Promise<{ buffer: AudioBuffer; metadata: AudioMetadata; waveform: WaveformData }> {
    const ctx = this.getContext();
    // Use copy of arrayBuffer as decodeAudioData detaches the buffer
    const copy = arrayBuffer.slice(0);
    const audioBuffer = await ctx.decodeAudioData(copy);
    this.currentBuffer = audioBuffer;

    const waveform = this.extractWaveformData(audioBuffer);
    const metadata = this.calculateMetadata(audioBuffer, fileName, fileSize, format);

    return { buffer: audioBuffer, metadata, waveform };
  }

  public extractWaveformData(buffer: AudioBuffer, targetSamples: number = 1000): WaveformData {
    const numChannels = buffer.numberOfChannels;
    const channelData: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channelData.push(buffer.getChannelData(c));
    }

    const primaryChannel = channelData[0];
    const totalSamples = primaryChannel.length;
    const blockSize = Math.max(1, Math.floor(totalSamples / targetSamples));
    const peaks: number[] = [];
    const rmsList: number[] = [];

    let globalMax = 0;

    for (let i = 0; i < targetSamples; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, totalSamples);
      let max = 0;
      let sumSquares = 0;
      let count = 0;

      for (let j = start; j < end; j++) {
        // Average across stereo channels if available
        let val = 0;
        for (let c = 0; c < numChannels; c++) {
          val += Math.abs(channelData[c][j]);
        }
        val = val / numChannels;

        if (val > max) max = val;
        sumSquares += val * val;
        count++;
      }

      const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
      peaks.push(max);
      rmsList.push(rms);
      if (max > globalMax) globalMax = max;
    }

    // Normalize peaks to 0..1 scale
    const normFactor = globalMax > 0 ? 1 / globalMax : 1;
    const normalizedPeaks = peaks.map((p) => Math.min(1, p * normFactor));
    const normalizedRms = rmsList.map((r) => Math.min(1, r * normFactor));

    return {
      peaks: normalizedPeaks,
      rms: normalizedRms,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channelData,
    };
  }

  private calculateMetadata(buffer: AudioBuffer, fileName: string, fileSize: number, format: string): AudioMetadata {
    const channelData = buffer.getChannelData(0);
    let peak = 0;
    let sumSq = 0;

    // Sample across the buffer for performance
    const step = Math.max(1, Math.floor(channelData.length / 50000));
    let sampledCount = 0;

    for (let i = 0; i < channelData.length; i += step) {
      const val = Math.abs(channelData[i]);
      if (val > peak) peak = val;
      sumSq += val * val;
      sampledCount++;
    }

    const rms = sampledCount > 0 ? Math.sqrt(sumSq / sampledCount) : 0;
    const peakDb = peak > 0 ? 20 * Math.log10(peak) : -96;
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -96;
    const dynamicRangeDb = Math.max(0, Math.round(peakDb - rmsDb));

    return {
      fileName: fileName.replace(/\.[^/.]+$/, ''),
      fileSize: fileSize || Math.round(buffer.length * buffer.numberOfChannels * 2),
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      numberOfChannels: buffer.numberOfChannels,
      peakAmplitude: Number(peak.toFixed(3)),
      rmsAmplitude: Number(rms.toFixed(3)),
      dynamicRangeDb,
      format: format.split('/')[1]?.toUpperCase() || 'AUDIO',
    };
  }

  // --- PLAYBACK CONTROLS ---

  public play(fromTime?: number): void {
    if (!this.currentBuffer) return;
    const ctx = this.getContext();

    if (this.isPlaying) {
      this.stopSource();
    }

    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.currentBuffer;
    this.sourceNode.loop = this.isLooping;
    this.sourceNode.playbackRate.value = this.playbackRate;

    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.connect(ctx.destination);
    }

    if (!this.analyserNode) {
      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.8;
    }

    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);

    const offset = fromTime !== undefined ? fromTime : this.pauseOffset;
    this.startTime = ctx.currentTime - offset / this.playbackRate;
    this.sourceNode.start(0, offset);

    this.isPlaying = true;
    this.notifyPlaybackState(true);

    this.sourceNode.onended = () => {
      if (this.getCurrentTime() >= (this.currentBuffer?.duration || 0) && !this.isLooping) {
        this.isPlaying = false;
        this.pauseOffset = 0;
        this.notifyPlaybackState(false);
        this.notifyTimeUpdate(0, this.currentBuffer?.duration || 0);
        this.stopProgressTracking();
      }
    };

    this.startProgressTracking();
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentTime();
    this.stopSource();
    this.isPlaying = false;
    this.notifyPlaybackState(false);
    this.stopProgressTracking();
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(seconds: number): void {
    if (!this.currentBuffer) return;
    const clamped = Math.max(0, Math.min(seconds, this.currentBuffer.duration));
    this.pauseOffset = clamped;

    if (this.isPlaying) {
      this.play(clamped);
    } else {
      this.notifyTimeUpdate(clamped, this.currentBuffer.duration);
    }
  }

  public seekFraction(fraction: number): void {
    if (!this.currentBuffer) return;
    const time = Math.max(0, Math.min(1, fraction)) * this.currentBuffer.duration;
    this.seek(time);
  }

  public setVolume(val: number): void {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(2, val)), this.getContext().currentTime);
    }
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.sourceNode && this.isPlaying) {
      this.sourceNode.playbackRate.setValueAtTime(rate, this.getContext().currentTime);
      const cur = this.getCurrentTime();
      this.startTime = this.getContext().currentTime - cur / rate;
    }
  }

  public setLoop(loop: boolean): void {
    this.isLooping = loop;
    if (this.sourceNode) {
      this.sourceNode.loop = loop;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsLooping(): boolean {
    return this.isLooping;
  }

  public getCurrentTime(): number {
    if (!this.currentBuffer) return 0;
    if (!this.isPlaying) return this.pauseOffset;

    const ctx = this.getContext();
    const elapsed = (ctx.currentTime - this.startTime) * this.playbackRate;
    if (this.isLooping) {
      return elapsed % this.currentBuffer.duration;
    }
    return Math.min(elapsed, this.currentBuffer.duration);
  }

  public getDuration(): number {
    return this.currentBuffer?.duration || 0;
  }

  public getAudioBuffer(): AudioBuffer | null {
    return this.currentBuffer;
  }

  private stopSource(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Source might already be stopped
      }
      this.sourceNode = null;
    }
  }

  private startProgressTracking(): void {
    this.stopProgressTracking();
    const track = () => {
      if (this.isPlaying && this.currentBuffer) {
        const cur = this.getCurrentTime();
        this.notifyTimeUpdate(cur, this.currentBuffer.duration);
        this.animationFrameId = requestAnimationFrame(track);
      }
    };
    this.animationFrameId = requestAnimationFrame(track);
  }

  private stopProgressTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // --- LISTENERS ---

  public onTimeUpdate(callback: (time: number, duration: number) => void): () => void {
    this.timeUpdateListeners.push(callback);
    return () => {
      this.timeUpdateListeners = this.timeUpdateListeners.filter((cb) => cb !== callback);
    };
  }

  public onPlaybackStateChange(callback: (playing: boolean) => void): () => void {
    this.playbackStateListeners.push(callback);
    return () => {
      this.playbackStateListeners = this.playbackStateListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyTimeUpdate(time: number, duration: number): void {
    this.timeUpdateListeners.forEach((cb) => cb(time, duration));
  }

  private notifyPlaybackState(playing: boolean): void {
    this.playbackStateListeners.forEach((cb) => cb(playing));
  }

  // --- MICROPHONE RECORDING ---

  public async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micStream = stream;
    this.recordedChunks = [];

    const recorder = new MediaRecorder(stream);
    this.mediaRecorder = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    recorder.start(100);
  }

  public async stopRecording(): Promise<{ buffer: AudioBuffer; metadata: AudioMetadata; waveform: WaveformData }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const result = await this.decodeArrayBuffer(arrayBuffer, `Mic-Recording-${new Date().toLocaleTimeString().replace(/:/g, '-')}`, blob.size, 'audio/webm');
          
          if (this.micStream) {
            this.micStream.getTracks().forEach((track) => track.stop());
            this.micStream = null;
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  public isRecordingActive(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  // --- SYNTHESIZED DEMO AUDIO GENERATORS ---
  // Fast, zero-external-network procedural audio generators for instant playability!

  public async generateDemoTrack(presetId: string): Promise<{ buffer: AudioBuffer; metadata: AudioMetadata; waveform: WaveformData }> {
    const ctx = this.getContext();
    let buffer: AudioBuffer;
    let name = 'Demo Track';

    switch (presetId) {
      case 'synthwave':
        buffer = await this.generateSynthwaveTrack(ctx);
        name = 'Midnight Cyberwave';
        break;
      case 'chill-lofi':
        buffer = await this.generateChillLofiTrack(ctx);
        name = 'Sunset Lo-Fi Chill';
        break;
      case 'acoustic':
        buffer = await this.generateAcousticTrack(ctx);
        name = 'Golden Hour Acoustic';
        break;
      case 'podcast':
        buffer = await this.generatePodcastVoiceTrack(ctx);
        name = 'Episode #42 - Sound Design Intro';
        break;
      case 'cinematic':
      default:
        buffer = await this.generateCinematicTrack(ctx);
        name = 'Cosmic Horizon (Cinematic)';
        break;
    }

    this.currentBuffer = buffer;
    const waveform = this.extractWaveformData(buffer);
    const metadata = this.calculateMetadata(buffer, name, Math.round(buffer.length * 4), 'audio/wav');

    return { buffer, metadata, waveform };
  }

  private async generateSynthwaveTrack(ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = ctx.sampleRate;
    const duration = 16; // 16 seconds loop
    const numSamples = sampleRate * duration;
    const offlineCtx = new OfflineAudioContext(2, numSamples, sampleRate);

    const bpm = 120;
    const beatSec = 60 / bpm;
    const sixteenth = beatSec / 4;

    // Bassline synth
    const bassNotes = [36, 36, 36, 36, 41, 41, 41, 41, 44, 44, 44, 44, 43, 43, 43, 43]; // C1, F1, G#1, G1
    const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

    for (let bar = 0; bar < 4; bar++) {
      for (let step = 0; step < 16; step++) {
        const time = bar * 4 * beatSec + step * sixteenth;
        const noteIdx = (bar * 4 + Math.floor(step / 4)) % bassNotes.length;
        const freq = mtof(bassNotes[noteIdx]);

        const osc = offlineCtx.createOscillator();
        const filter = offlineCtx.createBiquadFilter();
        const gain = offlineCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, time);
        filter.frequency.exponentialRampToValueAtTime(300, time + sixteenth * 0.9);

        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + sixteenth * 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(offlineCtx.destination);

        osc.start(time);
        osc.stop(time + sixteenth);
      }
    }

    // Drum beat: Kick on 1, 2, 3, 4, Snare on 2 & 4, Hihats on 16ths
    for (let beat = 0; beat < 32; beat++) {
      const time = beat * beatSec;

      // Kick
      const kickOsc = offlineCtx.createOscillator();
      const kickGain = offlineCtx.createGain();
      kickOsc.frequency.setValueAtTime(150, time);
      kickOsc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
      kickGain.gain.setValueAtTime(0.7, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
      kickOsc.connect(kickGain);
      kickGain.connect(offlineCtx.destination);
      kickOsc.start(time);
      kickOsc.stop(time + 0.25);

      // Snare on alternate beats
      if (beat % 2 === 1) {
        const noiseBuf = offlineCtx.createBuffer(1, sampleRate * 0.2, sampleRate);
        const out = noiseBuf.getChannelData(0);
        for (let i = 0; i < out.length; i++) {
          out[i] = Math.random() * 2 - 1;
        }
        const snareNoise = offlineCtx.createBufferSource();
        snareNoise.buffer = noiseBuf;
        const snareGain = offlineCtx.createGain();
        snareGain.gain.setValueAtTime(0.35, time);
        snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        snareNoise.connect(snareGain);
        snareGain.connect(offlineCtx.destination);
        snareNoise.start(time);
        snareNoise.stop(time + 0.2);
      }
    }

    // Arpeggio synth lead
    const leadNotes = [60, 63, 67, 70, 72, 75, 72, 70, 65, 68, 72, 75, 77, 72, 68, 65];
    for (let i = 0; i < 64; i++) {
      const time = i * sixteenth;
      const freq = mtof(leadNotes[i % leadNotes.length]);
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + sixteenth * 1.5);
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(time);
      osc.stop(time + sixteenth * 1.6);
    }

    return await offlineCtx.startRendering();
  }

  private async generateChillLofiTrack(ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = ctx.sampleRate;
    const duration = 14;
    const numSamples = sampleRate * duration;
    const offlineCtx = new OfflineAudioContext(2, numSamples, sampleRate);

    // Mellow Rhodes-like piano chords (Fmaj7 -> Em7 -> Dm7 -> Cmaj7)
    const chords = [
      [53, 60, 64, 67, 69], // Fmaj7 (F, C, E, G, A)
      [52, 59, 62, 67, 71], // Em7 (E, B, D, G, B)
      [50, 57, 60, 65, 69], // Dm7 (D, A, C, F, A)
      [48, 55, 60, 64, 67], // Cmaj7 (C, G, C, E, G)
    ];

    const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    const chordDuration = 3.5;

    chords.forEach((chord, idx) => {
      const time = idx * chordDuration;
      chord.forEach((note, noteIdx) => {
        const osc = offlineCtx.createOscillator();
        const filter = offlineCtx.createBiquadFilter();
        const gain = offlineCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(mtof(note), time + noteIdx * 0.04);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, time);

        gain.gain.setValueAtTime(0.12, time + noteIdx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, time + chordDuration * 0.95);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(offlineCtx.destination);

        osc.start(time + noteIdx * 0.04);
        osc.stop(time + chordDuration);
      });
    });

    return await offlineCtx.startRendering();
  }

  private async generateAcousticTrack(ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = ctx.sampleRate;
    const duration = 12;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    const notes = [57, 60, 64, 69, 72, 69, 64, 60, 55, 59, 62, 67, 71, 67, 62, 59];

    for (let i = 0; i < 48; i++) {
      const time = i * 0.25;
      const freq = mtof(notes[i % notes.length]);
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(time);
      osc.stop(time + 0.85);
    }

    return await offlineCtx.startRendering();
  }

  private async generatePodcastVoiceTrack(ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = ctx.sampleRate;
    const duration = 10;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    // Generate vocal speech cadence with natural pitch modulations and pauses
    const syllables = [
      { t: 0.3, dur: 0.25, f: 140 },
      { t: 0.6, dur: 0.3, f: 155 },
      { t: 0.95, dur: 0.4, f: 130 },
      { t: 1.6, dur: 0.35, f: 165 },
      { t: 2.0, dur: 0.3, f: 150 },
      { t: 2.35, dur: 0.5, f: 135 },
      { t: 3.2, dur: 0.25, f: 160 },
      { t: 3.5, dur: 0.3, f: 175 },
      { t: 3.85, dur: 0.45, f: 140 },
      { t: 4.8, dur: 0.3, f: 150 },
      { t: 5.15, dur: 0.6, f: 130 },
      { t: 6.2, dur: 0.35, f: 160 },
      { t: 6.6, dur: 0.4, f: 170 },
      { t: 7.05, dur: 0.5, f: 140 },
      { t: 8.0, dur: 0.8, f: 125 },
    ];

    syllables.forEach(({ t, dur, f }) => {
      const osc = offlineCtx.createOscillator();
      const form1 = offlineCtx.createBiquadFilter();
      const form2 = offlineCtx.createBiquadFilter();
      const gain = offlineCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 0.92, t + dur);

      // Formants for speech resonance (Vowel-like /a/ /o/)
      form1.type = 'bandpass';
      form1.frequency.value = 700;
      form1.Q.value = 4;

      form2.type = 'bandpass';
      form2.frequency.value = 1200;
      form2.Q.value = 5;

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.4, t + dur * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(form1);
      osc.connect(form2);
      form1.connect(gain);
      form2.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(t);
      osc.stop(t + dur);
    });

    return await offlineCtx.startRendering();
  }

  private async generateCinematicTrack(ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = ctx.sampleRate;
    const duration = 15;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    // Deep sub bass drone (C1)
    const subOsc = offlineCtx.createOscillator();
    const subGain = offlineCtx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(32.7, 0); // C1
    subGain.gain.setValueAtTime(0.0, 0);
    subGain.gain.linearRampToValueAtTime(0.6, 2.5);
    subGain.gain.setValueAtTime(0.6, 12);
    subGain.gain.linearRampToValueAtTime(0.0, 15);
    subOsc.connect(subGain);
    subGain.connect(offlineCtx.destination);
    subOsc.start(0);
    subOsc.stop(15);

    // Swelling chord tension
    const chordFrequencies = [130.8, 164.8, 196.0, 246.9]; // C3, E3, G3, B3
    chordFrequencies.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const filter = offlineCtx.createBiquadFilter();
      const gain = offlineCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq + (idx % 2 === 0 ? 0.3 : -0.3), 0);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, 0);
      filter.frequency.linearRampToValueAtTime(2200, 8);
      filter.frequency.linearRampToValueAtTime(400, 14.5);

      gain.gain.setValueAtTime(0.0, 0);
      gain.gain.linearRampToValueAtTime(0.12, 4);
      gain.gain.setValueAtTime(0.12, 10);
      gain.gain.linearRampToValueAtTime(0.001, 15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(0);
      osc.stop(15);
    });

    return await offlineCtx.startRendering();
  }
}

export const audioEngine = new AudioEngine();

export const SAMPLE_PRESETS: SampleAudioPreset[] = [
  {
    id: 'synthwave',
    name: 'Midnight Cyberwave',
    genre: 'Synthwave / Electronic',
    description: 'Energetic 80s synth bassline, 16th arpeggios, and 808 beat',
    duration: 16,
    bpm: 120,
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    generator: (ctx) => audioEngine.generateDemoTrack('synthwave').then((r) => r.buffer),
  },
  {
    id: 'chill-lofi',
    name: 'Sunset Lo-Fi Chill',
    genre: 'Lo-Fi / Hip Hop',
    description: 'Warm electric Rhodes piano 7th chords with vintage ambiance',
    duration: 14,
    bpm: 85,
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    generator: (ctx) => audioEngine.generateDemoTrack('chill-lofi').then((r) => r.buffer),
  },
  {
    id: 'cinematic',
    name: 'Cosmic Horizon',
    genre: 'Cinematic / Drone',
    description: 'Deep resonant sub bass and swelling atmospheric brass',
    duration: 15,
    bpm: 70,
    url: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
    generator: (ctx) => audioEngine.generateDemoTrack('cinematic').then((r) => r.buffer),
  },
  {
    id: 'acoustic',
    name: 'Golden Hour Acoustic',
    genre: 'Acoustic / Folk',
    description: 'Harmonic guitar-style plucked arpeggios with open chords',
    duration: 12,
    bpm: 100,
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    generator: (ctx) => audioEngine.generateDemoTrack('acoustic').then((r) => r.buffer),
  },
  {
    id: 'podcast',
    name: 'Sound Design Podcast',
    genre: 'Spoken Word / Voice',
    description: 'Speech formant cadence with conversational dynamics & pauses',
    duration: 10,
    bpm: 0,
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    generator: (ctx) => audioEngine.generateDemoTrack('podcast').then((r) => r.buffer),
  },
];
