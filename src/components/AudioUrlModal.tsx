import React, { useState } from 'react';
import { Link2, Music, AlertCircle, Loader2, X, Sparkles } from 'lucide-react';

interface AudioUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadUrl: (url: string) => Promise<void>;
  isLoading: boolean;
}

const SAMPLE_URLS = [
  {
    name: 'Tech House Vibes',
    genre: 'Electronic',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
  },
  {
    name: 'Deep Urban Beat',
    genre: 'Hip Hop',
    url: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
  },
  {
    name: 'Serene Waves Lofi',
    genre: 'Chillhop',
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
  },
];

export const AudioUrlModal: React.FC<AudioUrlModalProps> = ({
  isOpen,
  onClose,
  onLoadUrl,
  isLoading,
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a valid audio file URL');
      return;
    }
    setError(null);
    try {
      await onLoadUrl(url.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to load audio from the provided URL');
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">Load Audio from URL</h3>
              <p className="text-xs text-neutral-400">Stream or import remote MP3, WAV, FLAC, or OGG</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="audio-url-input" className="text-xs font-semibold text-neutral-300">
              Audio File URL
            </label>
            <div className="relative">
              <input
                id="audio-url-input"
                type="url"
                required
                placeholder="https://example.com/track.mp3"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 font-mono transition-colors"
              />
            </div>
            <span className="text-[11px] text-neutral-500">
              Direct link to an audio file (CORS is automatically handled via backend proxy)
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Quick Sample Tracks
            </span>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_URLS.map((sample) => (
                <button
                  key={sample.url}
                  type="button"
                  onClick={() => handleSelectSample(sample.url)}
                  disabled={isLoading}
                  className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    url === sample.url
                      ? 'bg-neutral-800 border-cyan-500/50 text-white'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-xs font-medium">{sample.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                    {sample.genre}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Load Audio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
