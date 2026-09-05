import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Link2,
  Mic,
  Sparkles,
  Music,
  Square,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Play,
  Pause,
  Disc,
  Volume2,
} from 'lucide-react';
import { audioEngine, SAMPLE_PRESETS } from '../services/audioEngine';
import { AudioMetadata, SampleAudioPreset, WaveformData } from '../types';

interface AudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: AudioMetadata | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onFileUpload: (file: File) => Promise<void>;
  onLoadUrl: (url: string) => Promise<void>;
  onSelectPreset: (preset: SampleAudioPreset) => Promise<void>;
  onRecordingComplete: (data: { buffer: AudioBuffer; metadata: AudioMetadata; waveform: WaveformData }) => void;
  isLoading: boolean;
}

const SAMPLE_URLS = [
  {
    name: 'Tech House Vibes',
    genre: 'Electronic • 126 BPM',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
  },
  {
    name: 'Deep Urban Beat',
    genre: 'Hip Hop • 95 BPM',
    url: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
  },
  {
    name: 'Serene Waves Lofi',
    genre: 'Chillhop • 80 BPM',
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
  },
];

export const AudioModal: React.FC<AudioModalProps> = ({
  isOpen,
  onClose,
  metadata,
  isPlaying,
  onTogglePlay,
  onFileUpload,
  onLoadUrl,
  onSelectPreset,
  onRecordingComplete,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'record' | 'presets'>('upload');
  
  // Link state
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Microphone state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  useEffect(() => {
    let timer: number;
    if (isRecording) {
      timer = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  if (!isOpen) return null;

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setUrlError('Please enter a valid audio stream or file URL');
      return;
    }
    setUrlError(null);
    try {
      await onLoadUrl(cleanUrl);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load audio from the provided URL';
      setUrlError(msg);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)) {
        await onFileUpload(file);
        onClose();
      } else {
        alert('Please drop a valid audio file (.mp3, .wav, .flac, .ogg, .m4a).');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await onFileUpload(file);
      onClose();
    }
  };

  const handleStartRecording = async () => {
    setMicError(null);
    try {
      await audioEngine.startRecording();
      setIsRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied or unavailable.';
      setMicError(msg);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await audioEngine.stopRecording();
      setIsRecording(false);
      onRecordingComplete(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process microphone audio.';
      setMicError(msg);
      setIsRecording(false);
    }
  };

  const handlePresetSelect = async (preset: SampleAudioPreset) => {
    await onSelectPreset(preset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Audio Source</h2>
              <p className="text-xs text-neutral-400">Upload file, paste link, record voice, or pick a synth preset</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Track Status Pill (if any) */}
        {metadata && (
          <div className="px-5 py-2.5 bg-neutral-900/40 border-b border-neutral-800/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={onTogglePlay}
                className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/30 transition-colors shrink-0"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
              </button>
              <span className="text-neutral-400 text-[11px] shrink-0">Current Track:</span>
              <span className="font-medium text-white truncate max-w-[200px] sm:max-w-[280px]">{metadata.fileName}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px] shrink-0">
              <span>{Math.floor(metadata.duration / 60)}:{Math.floor(metadata.duration % 60).toString().padStart(2, '0')}</span>
              <span>•</span>
              <span>{(metadata.sampleRate / 1000).toFixed(1)}kHz</span>
            </div>
          </div>
        )}

        {/* Unified 4-Action Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-neutral-900/80 border-b border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-neutral-800 text-cyan-400 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-neutral-800 text-cyan-400 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link / URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'record'
                ? 'bg-neutral-800 text-rose-400 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-neutral-800 text-amber-400 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Presets</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* TAB 1: UPLOAD FILE */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer text-center ${
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/70'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm text-white">Click or drag audio file here</span>
                  <span className="text-xs text-neutral-400">Supports MP3, WAV, FLAC, OGG, M4A, AAC up to 100MB</span>
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  {['MP3', 'WAV', 'FLAC', 'OGG', 'M4A'].map((fmt) => (
                    <span key={fmt} className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-300 border border-neutral-700">
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-xs text-cyan-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Decoding audio data into high-resolution waveforms...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LINK / URL */}
          {activeTab === 'link' && (
            <form onSubmit={handleUrlSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-300">Direct Audio Stream / File Link</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://example.com/audio.mp3"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        setUrlError(null);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 font-mono transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !urlInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-cyan-500/10 shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    <span>Load Audio</span>
                  </button>
                </div>

                {urlError && (
                  <div className="text-xs text-rose-400 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{urlError}</span>
                  </div>
                )}
              </div>

              {/* Sample Links */}
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/60">
                <span className="text-xs font-semibold text-neutral-400">Or try a curated audio sample:</span>
                <div className="grid grid-cols-1 gap-2">
                  {SAMPLE_URLS.map((sample) => (
                    <button
                      key={sample.url}
                      type="button"
                      onClick={() => {
                        setUrlInput(sample.url);
                        onLoadUrl(sample.url).then(() => onClose()).catch((e) => setUrlError(e?.message));
                      }}
                      className="p-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center justify-between text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-neutral-800 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/20">
                          <Music className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-white group-hover:text-cyan-300 transition-colors block">
                            {sample.name}
                          </span>
                          <span className="text-[10px] text-neutral-400">{sample.genre}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-cyan-400 font-medium group-hover:underline">Select & Load</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: RECORD MICROPHONE */}
          {activeTab === 'record' && (
            <div className="flex flex-col items-center justify-center gap-5 py-4 text-center">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-rose-500/20 text-rose-400 border-2 border-rose-500 ring-8 ring-rose-500/20 animate-pulse'
                      : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </div>
                {isRecording && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-2xl font-mono font-bold text-white tracking-wider">
                  {Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:
                  {(recordSeconds % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-neutral-400">
                  {isRecording ? 'Recording voice / instruments from your microphone...' : 'Capture live microphone audio with zero lag'}
                </span>
              </div>

              {micError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5 max-w-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{micError}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700 transition-all active:scale-95 cursor-pointer"
                  >
                    <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
                    <span>Finish & Visualize Audio</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PRESETS / SYNTHESIZERS */}
          {activeTab === 'presets' && (
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold text-neutral-400 mb-1">
                Zero-download procedural synthesizer presets (instant load):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SAMPLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    id={`modal-preset-${preset.id}`}
                    disabled={isLoading}
                    onClick={() => handlePresetSelect(preset)}
                    className="p-3.5 rounded-xl bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-800 hover:border-cyan-500/40 transition-all text-left flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-neutral-800 group-hover:bg-cyan-500/20 text-neutral-400 group-hover:text-cyan-400 flex items-center justify-center shrink-0 transition-colors border border-neutral-700">
                      <Disc className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate mt-0.5">{preset.description}</div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[9px] font-mono text-cyan-400 border border-neutral-700">
                          {preset.genre}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[9px] font-mono text-neutral-400">
                          {preset.bpm} BPM
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[9px] font-mono text-neutral-400">
                          {preset.duration}s
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
