import React from 'react';
import { AudioMetadata } from '../types';

interface HeaderProps {
  metadata?: AudioMetadata | null;
  onAudioClick?: () => void;
  onExportClick?: () => void;
  isExportDisabled?: boolean;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & App Title */}
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
        </div>
      </div>
    </header>
  );
};

