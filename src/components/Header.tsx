import React from 'react';
import { Download, FileAudio } from 'lucide-react';
import { AudioMetadata } from '../types';

interface HeaderProps {
  metadata: AudioMetadata | null;
  onAudioClick: () => void;
  onExportClick: () => void;
  isExportDisabled?: boolean;
  hasBackground?: boolean;
  isBackgroundVideo?: boolean;
  hasProfile?: boolean;
  onBackgroundClick?: () => void;
  onProfileClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  onAudioClick,
  onExportClick,
  isExportDisabled,
}) => {
  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & App Title + Clickable Audio Selector */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
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
              <h1 className="font-display font-bold text-lg tracking-tight text-white leading-tight">Waveform Studio</h1>
              <p className="text-xs text-neutral-400 hidden sm:block">Fast audio waveform & transparent video generator</p>
            </div>
          </div>

          {/* Clickable audio track label next to logo */}
          <button
            type="button"
            id="header-audio-track-btn"
            onClick={onAudioClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/50 text-xs text-neutral-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 min-w-0 max-w-[155px] sm:max-w-[260px] truncate group"
            title="Click to choose, upload, or record audio"
          >
            <FileAudio className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate font-medium">{metadata ? metadata.fileName : 'Choose Audio Track...'}</span>
            {metadata && (
              <span className="font-mono text-[11px] text-neutral-400 hidden md:inline shrink-0">
                • {Math.floor(metadata.duration / 60)}:{Math.floor(metadata.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </button>
        </div>

        {/* Primary Fast Export Video Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="header-export-mp4-btn"
            onClick={onExportClick}
            disabled={isExportDisabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs shadow-lg transition-all cursor-pointer ${
              isExportDisabled
                ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 ring-1 ring-cyan-400/30 active:scale-[0.98]'
            }`}
            title="Export high-resolution MP4 or transparent Alpha WebM video"
          >
            <Download className="w-4 h-4" />
            <span className="font-semibold">Export Video</span>
          </button>
        </div>
      </div>
    </header>
  );
};
