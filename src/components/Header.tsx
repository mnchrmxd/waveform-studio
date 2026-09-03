import React from 'react';
import { Upload, Mic, Music, Sparkles, Download, FileAudio, Link2 } from 'lucide-react';
import { AudioMetadata } from '../types';

interface HeaderProps {
  metadata: AudioMetadata | null;
  onUploadClick: () => void;
  onDemoClick: () => void;
  onRecordClick: () => void;
  onExportClick: () => void;
  onUrlAudioClick?: () => void;
  isExportDisabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  onUploadClick,
  onDemoClick,
  onRecordClick,
  onExportClick,
  onUrlAudioClick,
  isExportDisabled,
}) => {
  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Logo & App Title */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 10v4" />
                <path d="M6 6v12" />
                <path d="M10 3v18" />
                <path d="M14 8v8" />
                <path d="M18 5v14" />
                <path d="M22 10v4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg tracking-tight text-white">Waveform Studio</h1>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">Fast offline audio waveform & transparent video generator</p>
            </div>
          </div>

          {/* Current track pill on mobile */}
          {metadata && (
            <div className="sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 max-w-[140px] truncate">
              <FileAudio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{metadata.fileName}</span>
            </div>
          )}
        </div>

        {/* Action Controls & Export Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {/* Track Info Badge on Desktop */}
          {metadata && (
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-300 mr-2">
              <FileAudio className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-medium text-neutral-200 max-w-[150px] truncate">{metadata.fileName}</span>
              <span className="text-neutral-500">•</span>
              <span className="font-mono text-neutral-400">{Math.floor(metadata.duration / 60)}:{Math.floor(metadata.duration % 60).toString().padStart(2, '0')}</span>
              <span className="text-neutral-500">•</span>
              <span className="font-mono text-neutral-400">{metadata.sampleRate / 1000}kHz</span>
            </div>
          )}

          {/* Demo Presets */}
          <button
            id="header-demo-presets-btn"
            onClick={onDemoClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
            title="Choose demo audio preset"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Presets</span>
          </button>

          {/* Mic Record */}
          <button
            id="header-record-mic-btn"
            onClick={onRecordClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
            title="Record audio from microphone"
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Record</span>
          </button>

          {/* Upload Button */}
          <button
            id="header-upload-audio-btn"
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-white shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Audio</span>
          </button>

          {/* Audio URL Button */}
          {onUrlAudioClick && (
            <button
              id="header-url-audio-btn"
              onClick={onUrlAudioClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 hover:text-white transition-colors cursor-pointer"
              title="Stream or import audio from a web URL"
            >
              <Link2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Audio URL</span>
            </button>
          )}

          {/* Primary Fast Export Video Button */}
          <button
            id="header-export-mp4-btn"
            onClick={onExportClick}
            disabled={isExportDisabled}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium text-xs shadow-lg transition-all cursor-pointer ${
              isExportDisabled
                ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 ring-1 ring-cyan-400/30 active:scale-[0.98]'
            }`}
            title="Export high-resolution MP4 or transparent Alpha WebM video"
          >
            <Download className="w-4 h-4" />
            <span className="font-semibold">Export Video</span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono">MP4 & Alpha</span>
          </button>
        </div>
      </div>
    </header>
  );
};
