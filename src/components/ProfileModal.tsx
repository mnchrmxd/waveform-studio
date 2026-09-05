import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Link2,
  Camera,
  Sparkles,
  User,
  Trash2,
  RotateCcw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { ProfileImageShape, VisualizerSettings } from '../types';
import { loadImageFromUrl } from '../utils/imageLoader';
import { loadDefaultAvatarImage } from '../utils/defaultAvatar';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileImage: HTMLImageElement | null;
  profileImageUrl?: string | null;
  onProfileImageUpload: (image: HTMLImageElement | null) => void;
  onProfileImageUrlChange?: (url: string | null) => void;
  settings: VisualizerSettings;
  onSettingsChange: (settings: Partial<VisualizerSettings>) => void;
}

interface ProfilePreset {
  id: string;
  name: string;
  url: string;
  category: string;
}

const PROFILE_PRESETS: ProfilePreset[] = [
  {
    id: 'studio-dj',
    name: 'Studio DJ',
    category: 'Electronic & Turntables',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'vocal-mic',
    name: 'Vintage Studio Mic',
    category: 'Vocalist & Podcast',
    url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'cyber-art',
    name: 'Abstract Fluid Neon',
    category: 'Synthwave & Electronic',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'vinyl-groove',
    name: 'Retro Vinyl Record',
    category: 'Analog & Hi-Fi',
    url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&auto=format&fit=crop&q=80',
  },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profileImage,
  profileImageUrl,
  onProfileImageUpload,
  onProfileImageUrlChange,
  settings,
  onSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'record' | 'presets'>('upload');
  
  // Link state
  const [urlInput, setUrlInput] = useState(profileImageUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Webcam Camera snapshot state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  if (!isOpen) return null;

  const handleResetToDefault = async () => {
    try {
      const img = await loadDefaultAvatarImage();
      onProfileImageUpload(img);
      onProfileImageUrlChange?.(null);
      onSettingsChange({ showProfileImage: true });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearProfile = () => {
    onProfileImageUpload(null);
    onProfileImageUrlChange?.(null);
    onSettingsChange({ showProfileImage: false });
  };

  const handleFile = (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;

    img.onload = () => {
      setIsLoading(false);
      onProfileImageUpload(img);
      onProfileImageUrlChange?.(null);
      onSettingsChange({ showProfileImage: true });
      onClose();
    };

    img.onerror = () => {
      setIsLoading(false);
      setErrorMsg('Failed to decode image file. Please check format (JPG, PNG, WebP).');
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleLoadUrl = async (urlToLoad: string) => {
    const cleanUrl = urlToLoad.trim();
    if (!cleanUrl) {
      setErrorMsg('Please enter a valid image URL');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const img = await loadImageFromUrl(cleanUrl);
      setIsLoading(false);
      onProfileImageUpload(img);
      onProfileImageUrlChange?.(cleanUrl);
      onSettingsChange({ showProfileImage: true });
      onClose();
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Failed to load image from URL';
      setErrorMsg(msg);
    }
  };

  // Webcam Handlers
  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied or unavailable.';
      setCameraError(msg);
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(v.videoWidth || 400, v.videoHeight || 400);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const sx = ((v.videoWidth || size) - size) / 2;
    const sy = ((v.videoHeight || size) - size) / 2;
    ctx.drawImage(v, sx, sy, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      onProfileImageUpload(img);
      onProfileImageUrlChange?.(null);
      onSettingsChange({ showProfileImage: true });
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      onClose();
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Profile Picture / Avatar</h2>
              <p className="text-xs text-neutral-400">Add an artist avatar, DJ badge, or camera selfie</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Avatar Status Bar */}
        <div className="px-5 py-2.5 bg-neutral-900/40 border-b border-neutral-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                settings.showProfileImage && profileImage ? 'bg-emerald-400' : 'bg-neutral-600'
              }`}
            />
            <span className="text-neutral-300 font-medium">
              {settings.showProfileImage && profileImage
                ? 'Profile picture active on visualizer'
                : 'Profile picture hidden or disabled'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline cursor-pointer"
              title="Reset to default audio badge"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default</span>
            </button>
            {profileImage && (
              <button
                type="button"
                onClick={handleClearProfile}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:underline cursor-pointer ml-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Unified 4-Action Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-neutral-900/80 border-b border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-neutral-800 text-amber-400 shadow-sm font-semibold'
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
                ? 'bg-neutral-800 text-amber-400 shadow-sm font-semibold'
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
            <Camera className="w-3.5 h-3.5" />
            <span>Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-neutral-800 text-cyan-400 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Presets</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
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
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/70'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm text-white">Click or drag image here</span>
                  <span className="text-xs text-neutral-400">Supports PNG, JPG, WebP, SVG</span>
                </div>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading profile image...</span>
                </div>
              )}

              {errorMsg && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LINK / URL */}
          {activeTab === 'link' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLoadUrl(urlInput);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-300">Profile Image URL</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://example.com/artist-avatar.jpg"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 font-mono transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !urlInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-amber-500/10 shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    <span>Load URL</span>
                  </button>
                </div>

                {errorMsg && (
                  <div className="text-xs text-rose-400 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* TAB 3: RECORD / CAMERA SNAPSHOT */}
          {activeTab === 'record' && (
            <div className="flex flex-col items-center justify-center gap-4 py-2 text-center">
              <div className="w-44 h-44 rounded-full overflow-hidden bg-neutral-900 border-2 border-neutral-800 relative flex items-center justify-center shadow-xl">
                {cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 text-neutral-500">
                    <Camera className="w-8 h-8 text-neutral-600" />
                    <span className="text-[11px]">Selfie Snapshot</span>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5 max-w-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div>
                {!cameraStream ? (
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Webcam</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Snapshot</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PRESETS */}
          {activeTab === 'presets' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-neutral-400">
                Choose from artist and DJ avatar presets:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Default Studio Badge Card */}
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="p-3 rounded-xl bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-400/40 transition-all text-left flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shrink-0 border border-white/20">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors block truncate">
                      Default Studio Badge
                    </span>
                    <span className="text-[10px] text-neutral-400">Synthesizer badge & headphones</span>
                  </div>
                </button>

                {PROFILE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadUrl(preset.url)}
                    className="p-3 rounded-xl bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-400/40 transition-all text-left flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-neutral-700 group-hover:border-amber-400/50"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors block truncate">
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 truncate block">{preset.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Avatar Shape & Visibility Settings */}
          <div className="pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={settings.showProfileImage}
                onChange={(e) => onSettingsChange({ showProfileImage: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
              />
              <span>Show Profile Avatar on Visualizer</span>
            </label>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-neutral-500 mr-1">Shape:</span>
              {(['circle', 'rounded', 'square'] as ProfileImageShape[]).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => onSettingsChange({ profileImageShape: shape, showProfileImage: true })}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer capitalize ${
                    settings.profileImageShape === shape
                      ? 'bg-amber-500 text-black font-bold shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
