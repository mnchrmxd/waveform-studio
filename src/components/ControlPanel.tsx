import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sliders,
  Type,
  Image as ImageIcon,
  Layers,
  Sparkles,
  BarChart3,
  CircleDot,
  Waves,
  Activity,
  Grid3X3,
  Flame,
  Radio,
  User,
  Split,
  Eye,
  EyeOff,
  MoveHorizontal,
  Check,
  Video,
  Film,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react';
import { ColorTheme, VisualizerSettings, WaveformStyle, BackgroundType, SideSymmetryType, ProfileImageShape, ColorRepresentationMode } from '../types';
import { COLOR_THEMES } from '../data/presets';

interface ControlPanelProps {
  settings: VisualizerSettings;
  theme: ColorTheme;
  onSettingsChange: (newSettings: Partial<VisualizerSettings>) => void;
  onThemeSelect: (themeId: string) => void;
  onBackgroundImageUpload: (image: HTMLImageElement | null) => void;
  backgroundImage: HTMLImageElement | null;
  backgroundImageUrl?: string | null;
  onBackgroundImageUrlChange?: (url: string | null) => void;
  onBackgroundVideoUpload?: (video: HTMLVideoElement | null, url: string | null) => void;
  backgroundVideo?: HTMLVideoElement | null;
  backgroundVideoUrl?: string | null;
  backgroundBlur: number;
  onBackgroundBlurChange: (blur: number) => void;
  backgroundDim: number;
  onBackgroundDimChange: (dim: number) => void;
  profileImage?: HTMLImageElement | null;
  profileImageUrl?: string | null;
  onProfileImageUpload?: (image: HTMLImageElement | null) => void;
  onProfileImageUrlChange?: (url: string | null) => void;
  onOpenProfileModal?: () => void;
  onOpenBackgroundModal?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  theme,
  onSettingsChange,
  onThemeSelect,
  onBackgroundImageUpload,
  backgroundImage,
  backgroundImageUrl,
  onBackgroundImageUrlChange,
  onBackgroundVideoUpload,
  backgroundVideo,
  backgroundVideoUrl,
  backgroundBlur,
  onBackgroundBlurChange,
  backgroundDim,
  onBackgroundDimChange,
  profileImage,
  profileImageUrl,
  onProfileImageUpload,
  onProfileImageUrlChange,
  onOpenProfileModal,
  onOpenBackgroundModal,
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'avatar' | 'colors' | 'geometry' | 'background' | 'overlays'>('style');

  const primaryColorValue = settings.primaryColor || '#06b6d4';
  const secondaryColorValue = settings.gradientColor || settings.primaryGradientEnd || '#38bdf8';

  const [primaryHex, setPrimaryHex] = useState(primaryColorValue);
  const [secondaryHex, setSecondaryHex] = useState(secondaryColorValue);

  useEffect(() => {
    setPrimaryHex(primaryColorValue);
  }, [primaryColorValue]);

  useEffect(() => {
    setSecondaryHex(secondaryColorValue);
  }, [secondaryColorValue]);

  const handleSwitchColors = () => {
    setPrimaryHex(secondaryColorValue);
    setSecondaryHex(primaryColorValue);
    onSettingsChange({
      primaryColor: secondaryColorValue,
      gradientColor: primaryColorValue,
      primaryGradientEnd: primaryColorValue,
      useCustomColors: true,
    });
  };

  const handlePrimaryHexChange = (val: string) => {
    setPrimaryHex(val);
    const cleaned = val.trim();
    const formatted = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(formatted)) {
      const fullHex = formatted.length === 4
        ? `#${formatted[1]}${formatted[1]}${formatted[2]}${formatted[2]}${formatted[3]}${formatted[3]}`
        : formatted;
      onSettingsChange({ primaryColor: fullHex, useCustomColors: true });
    }
  };

  const handlePrimaryHexBlur = () => {
    const cleaned = primaryHex.trim();
    const formatted = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(formatted)) {
      const fullHex = (formatted.length === 4
        ? `#${formatted[1]}${formatted[1]}${formatted[2]}${formatted[2]}${formatted[3]}${formatted[3]}`
        : formatted).toUpperCase();
      setPrimaryHex(fullHex);
      onSettingsChange({ primaryColor: fullHex, useCustomColors: true });
    } else {
      setPrimaryHex(primaryColorValue.toUpperCase());
    }
  };

  const handleSecondaryHexChange = (val: string) => {
    setSecondaryHex(val);
    const cleaned = val.trim();
    const formatted = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(formatted)) {
      const fullHex = formatted.length === 4
        ? `#${formatted[1]}${formatted[1]}${formatted[2]}${formatted[2]}${formatted[3]}${formatted[3]}`
        : formatted;
      onSettingsChange({ gradientColor: fullHex, primaryGradientEnd: fullHex, useCustomColors: true });
    }
  };

  const handleSecondaryHexBlur = () => {
    const cleaned = secondaryHex.trim();
    const formatted = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(formatted)) {
      const fullHex = (formatted.length === 4
        ? `#${formatted[1]}${formatted[1]}${formatted[2]}${formatted[2]}${formatted[3]}${formatted[3]}`
        : formatted).toUpperCase();
      setSecondaryHex(fullHex);
      onSettingsChange({ gradientColor: fullHex, primaryGradientEnd: fullHex, useCustomColors: true });
    } else {
      setSecondaryHex(secondaryColorValue.toUpperCase());
    }
  };

  const backgroundColorValue = settings.backgroundColor || '#09090b';
  const [bgHex, setBgHex] = useState(backgroundColorValue);

  useEffect(() => {
    setBgHex(backgroundColorValue);
  }, [backgroundColorValue]);

  const handleBgHexChange = (val: string) => {
    setBgHex(val);
    const cleaned = val.trim();
    const formatted = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(formatted)) {
      const fullHex = formatted.length === 4
        ? `#${formatted[1]}${formatted[1]}${formatted[2]}${formatted[2]}${formatted[3]}${formatted[3]}`
        : formatted;
      onSettingsChange({ backgroundColor: fullHex, backgroundType: 'custom-solid' });
    }
  };

  const handleBgHexBlur = () => {
    const cleaned = bgHex.trim();
    const formatted = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(formatted)) {
      const fullHex = (formatted.length === 4
        ? `#${formatted[1]}${formatted[1]}${formatted[2]}${formatted[2]}${formatted[3]}${formatted[3]}`
        : formatted).toUpperCase();
      setBgHex(fullHex);
      onSettingsChange({ backgroundColor: fullHex, backgroundType: 'custom-solid' });
    } else {
      setBgHex(backgroundColorValue.toUpperCase());
    }
  };

  const visualizerStyles: { id: WaveformStyle; name: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'mirrored-bars',
      name: 'Mirrored Bars',
      icon: <BarChart3 className="w-5 h-5 text-cyan-400" />,
      desc: 'Symmetric vertical frequency bars with gradient & glow',
    },
    {
      id: 'bars-up',
      name: 'Spectrum EQ',
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      desc: 'Upward audio frequency columns with floating peak caps',
    },
    {
      id: 'smooth-wave',
      name: 'Smooth Ribbon',
      icon: <Waves className="w-5 h-5 text-indigo-400" />,
      desc: 'Multi-layer glowing bezier curved area waveform',
    },
    {
      id: 'radial',
      name: 'Radial Halo',
      icon: <CircleDot className="w-5 h-5 text-rose-400" />,
      desc: 'Circular audio reactive ring with radiating spikes',
    },
    {
      id: 'digital-matrix',
      name: 'Cyber Matrix',
      icon: <Grid3X3 className="w-5 h-5 text-amber-400" />,
      desc: 'Futuristic segmented LED digital blocks and columns',
    },
    {
      id: 'spine',
      name: 'Neural Spine',
      icon: <Radio className="w-5 h-5 text-purple-400" />,
      desc: 'Organic pulsating sound nodes and energy arcs',
    },
    {
      id: 'spectrum-bands',
      name: '10-Band EQ',
      icon: <Sliders className="w-5 h-5 text-sky-400" />,
      desc: 'Equalizer frequency bands from 32Hz to 16kHz',
    },
  ];

  return (
    <div
      id="customization-control-panel"
      className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-4 backdrop-blur-md shadow-xl flex flex-col gap-4"
    >
      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800 overflow-x-auto">
        <button
          id="tab-style-btn"
          onClick={() => setActiveTab('style')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'style'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Style</span>
        </button>

        <button
          id="tab-avatar-btn"
          onClick={() => setActiveTab('avatar')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'avatar'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <User className="w-3.5 h-3.5 text-amber-400" />
          <span>Profile Image & Symmetry</span>
          {settings.showProfileImage && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>

        <button
          id="tab-colors-btn"
          onClick={() => setActiveTab('colors')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'colors'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-pink-400" />
          <span>Colors & Glow</span>
        </button>

        <button
          id="tab-geometry-btn"
          onClick={() => setActiveTab('geometry')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'geometry'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Fine-Tuning</span>
        </button>

        <button
          id="tab-background-btn"
          onClick={() => setActiveTab('background')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'background'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Background</span>
        </button>

        <button
          id="tab-overlays-btn"
          onClick={() => setActiveTab('overlays')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'overlays'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-indigo-400" />
          <span>Text & Ruler</span>
        </button>
      </div>

      {/* Tab 1: Visualizer Style Selection */}
      {activeTab === 'style' && (
        <div className="flex flex-col gap-3 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {visualizerStyles.map((style) => (
              <button
                key={style.id}
                id={`style-select-btn-${style.id}`}
                onClick={() => onSettingsChange({ style: style.id })}
                className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                  settings.style === style.id
                    ? 'bg-neutral-800/90 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    {style.icon}
                  </div>
                  {settings.style === style.id && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-xs text-neutral-100">{style.name}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">{style.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Profile Image & Side Symmetry */}
      {activeTab === 'avatar' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Main Toggle & Upload Section */}
          <div className="p-3.5 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-200">Profile Image / Avatar in Waveform</span>
                  <p className="text-[11px] text-neutral-400">Place profile photo, logo, or artwork in the waveform</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="toggle-profile-image"
                  onClick={() => onSettingsChange({ showProfileImage: !settings.showProfileImage })}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer focus:outline-none ${
                    settings.showProfileImage ? 'bg-amber-500' : 'bg-neutral-800'
                  }`}
                  role="switch"
                  aria-checked={settings.showProfileImage}
                >
                  <span
                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                      settings.showProfileImage ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs font-semibold ${settings.showProfileImage ? 'text-amber-400' : 'text-neutral-400'}`}>
                  {settings.showProfileImage ? 'Avatar ON' : 'Avatar OFF'}
                </span>
              </div>
            </div>

            {settings.showProfileImage && (
              <div className="flex flex-col gap-3 pt-2 border-t border-neutral-800/80">
                <div className="flex items-center justify-between gap-3 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail preview or default badge icon */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-850 border border-neutral-700 flex items-center justify-center shrink-0">
                      {profileImage ? (
                        <img
                          src={profileImage.src}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white block truncate">
                        {profileImage ? 'Custom Photo Active' : 'Default Waveform Badge'}
                      </span>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {profileImage
                          ? (profileImageUrl ? 'Loaded from URL' : 'Custom photo loaded')
                          : 'Standard audio reactive center badge'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenProfileModal && (
                      <button
                        type="button"
                        id="open-profile-modal-btn"
                        onClick={onOpenProfileModal}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        {profileImage ? 'Change Photo' : 'Choose Photo'}
                      </button>
                    )}
                    {profileImage && (
                      <button
                        type="button"
                        id="remove-profile-image-btn"
                        onClick={() => {
                          onProfileImageUpload?.(null);
                          onProfileImageUrlChange?.(null);
                        }}
                        className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium rounded-lg transition-all cursor-pointer border border-neutral-700"
                        title="Revert back to default studio badge"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {settings.showProfileImage && (
            <>
              {/* Horizontal Position (Move Left / Right) & Vertical Position */}
              <div className="p-3.5 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MoveHorizontal className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-neutral-300">Positioning & Alignment (Move Left / Right)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSettingsChange({ profileImageXOffset: -25 })}
                      className={`px-2 py-0.5 text-[11px] rounded transition-all cursor-pointer ${
                        settings.profileImageXOffset === -25 ? 'bg-amber-500 text-black font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Left
                    </button>
                    <button
                      onClick={() => onSettingsChange({ profileImageXOffset: 0, profileImageYOffset: 0 })}
                      className={`px-2 py-0.5 text-[11px] rounded transition-all cursor-pointer ${
                        settings.profileImageXOffset === 0 && settings.profileImageYOffset === 0 ? 'bg-amber-500 text-black font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Center
                    </button>
                    <button
                      onClick={() => onSettingsChange({ profileImageXOffset: 25 })}
                      className={`px-2 py-0.5 text-[11px] rounded transition-all cursor-pointer ${
                        settings.profileImageXOffset === 25 ? 'bg-amber-500 text-black font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Right
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Horizontal Position (X Offset)</span>
                      <span className="font-mono text-amber-400">
                        {settings.profileImageXOffset === 0
                          ? 'Center (0%)'
                          : settings.profileImageXOffset < 0
                          ? `${Math.abs(settings.profileImageXOffset)}% Left`
                          : `${settings.profileImageXOffset}% Right`}
                      </span>
                    </div>
                    <input
                      id="profile-x-offset-slider"
                      type="range"
                      min="-45"
                      max="45"
                      step="1"
                      value={settings.profileImageXOffset}
                      onChange={(e) => onSettingsChange({ profileImageXOffset: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Vertical Position (Y Offset)</span>
                      <span className="font-mono text-amber-400">
                        {settings.profileImageYOffset === 0
                          ? 'Center (0%)'
                          : settings.profileImageYOffset < 0
                          ? `${Math.abs(settings.profileImageYOffset)}% Up`
                          : `${settings.profileImageYOffset}% Down`}
                      </span>
                    </div>
                    <input
                      id="profile-y-offset-slider"
                      type="range"
                      min="-40"
                      max="40"
                      step="1"
                      value={settings.profileImageYOffset}
                      onChange={(e) => onSettingsChange({ profileImageYOffset: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Side Symmetry Modes */}
              <div className="p-3.5 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Split className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-neutral-300">Waveform Symmetry & Side Wings</span>
                  </div>
                  {settings.sideSymmetry !== 'none' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-400">Wing Gap:</span>
                      <span className="font-mono text-xs text-amber-400 font-semibold">{settings.profileWingGap ?? 16}px</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'mirrored-flank',
                      name: 'Flanking Dual Wings',
                      desc: 'Waveform symmetrically flanks left and right of image',
                    },
                    {
                      id: 'split-cutout',
                      name: 'Split Cutout Gap',
                      desc: 'Continuous wave with circular clear gap around avatar',
                    },
                    {
                      id: 'none',
                      name: 'Continuous / None',
                      desc: 'Standard continuous waveform without side split',
                    },
                  ].map((sym) => (
                    <button
                      key={sym.id}
                      id={`symmetry-mode-btn-${sym.id}`}
                      onClick={() => onSettingsChange({ sideSymmetry: sym.id as SideSymmetryType })}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        settings.sideSymmetry === sym.id
                          ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20 shadow-md'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      <div className="font-semibold text-xs text-white">{sym.name}</div>
                      <div className="text-[10px] text-neutral-400">{sym.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Wing Gap Slider */}
                {settings.sideSymmetry !== 'none' && (
                  <div className="mt-2 pt-2 border-t border-neutral-800/80 flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Wing Clearance Gap around Avatar</span>
                      <span className="font-mono text-amber-400">
                        {settings.profileWingGap === 0 ? '0px (Continuous / Flush)' : `${settings.profileWingGap ?? 16}px`}
                      </span>
                    </div>
                    <input
                      id="profile-wing-gap-slider"
                      type="range"
                      min="0"
                      max="80"
                      step="2"
                      value={settings.profileWingGap ?? 16}
                      onChange={(e) => onSettingsChange({ profileWingGap: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <p className="text-[10px] text-neutral-500">
                      Set to 0px for a continuous symmetrical wing touching the profile border, or expand to create a generous halo gap.
                    </p>
                  </div>
                )}

                {/* Joint at Profile quick control */}
                <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      id="avatar-profile-joint-toggle"
                      type="checkbox"
                      checked={settings.enableJoint && settings.jointAtProfile !== false}
                      onChange={(e) => {
                        const val = e.target.checked;
                        if (val) {
                          onSettingsChange({ enableJoint: true, jointAtProfile: true });
                        } else {
                          onSettingsChange({ jointAtProfile: false });
                        }
                      }}
                      className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-neutral-200">Joint Tapering Next to Avatar</span>
                      <span className="text-[10px] text-neutral-400">
                        Bars feather smoothly to zero where they meet the profile boundary
                      </span>
                    </div>
                  </div>
                  {settings.enableJoint && settings.jointAtProfile !== false && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {settings.jointWidth ?? 48}px zone
                    </span>
                  )}
                </div>
              </div>

              {/* Shape, Size, Border & Reactive Effects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Avatar Shape */}
                <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-neutral-300">Avatar Shape</span>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {[
                      { id: 'circle', label: 'Circle' },
                      { id: 'rounded', label: 'Rounded' },
                      { id: 'square', label: 'Square' },
                    ].map((shp) => (
                      <button
                        key={shp.id}
                        id={`shape-btn-${shp.id}`}
                        onClick={() => onSettingsChange({ profileImageShape: shp.id as ProfileImageShape })}
                        className={`py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                          settings.profileImageShape === shp.id
                            ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {shp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar Size */}
                <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-neutral-300">Image Size</span>
                    <span className="font-mono text-amber-400">{settings.profileImageSize}px</span>
                  </div>
                  <input
                    id="profile-size-slider"
                    type="range"
                    min="60"
                    max="260"
                    step="5"
                    value={settings.profileImageSize}
                    onChange={(e) => onSettingsChange({ profileImageSize: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Border Width & Color */}
                <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-neutral-300">Border Accent</span>
                    <span className="font-mono text-amber-400">{settings.profileBorderWidth}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="profile-border-slider"
                      type="range"
                      min="0"
                      max="14"
                      step="1"
                      value={settings.profileBorderWidth}
                      onChange={(e) => onSettingsChange({ profileBorderWidth: parseInt(e.target.value) })}
                      className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <input
                      type="color"
                      value={settings.profileBorderColor || '#ffffff'}
                      onChange={(e) => onSettingsChange({ profileBorderColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                      title="Border Color"
                    />
                  </div>
                </div>
              </div>

              {/* Reactive Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 cursor-pointer text-xs text-neutral-200">
                  <input
                    type="checkbox"
                    checked={settings.profileAudioReactiveScale}
                    onChange={(e) => onSettingsChange({ profileAudioReactiveScale: e.target.checked })}
                    className="rounded accent-amber-400"
                  />
                  <span>Audio-Reactive Bass Pulsing Scale</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 cursor-pointer text-xs text-neutral-200">
                  <input
                    type="checkbox"
                    checked={settings.profileGlow}
                    onChange={(e) => onSettingsChange({ profileGlow: e.target.checked })}
                    className="rounded accent-amber-400"
                  />
                  <span>Avatar Depth & Drop Shadow</span>
                </label>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Colors & Theme Presets */}
      {activeTab === 'colors' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Preset Palettes */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300">Preset Color Themes</label>
              <span className="text-[11px] text-neutral-500">Sets primary & secondary colors</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLOR_THEMES.map((th) => {
                const isSelected =
                  settings.themeId === th.id ||
                  (settings.primaryColor === th.primaryColor && settings.gradientColor === th.gradientColor);
                return (
                  <button
                    key={th.id}
                    id={`theme-preset-btn-${th.id}`}
                    type="button"
                    onClick={() => {
                      onThemeSelect(th.id);
                      onSettingsChange({
                        primaryColor: th.primaryColor,
                        gradientColor: th.gradientColor || th.accentColor || '#38bdf8',
                        themeId: th.id,
                        useCustomColors: false,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20'
                        : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: th.primaryColor }}
                        title={`Primary: ${th.primaryColor}`}
                      />
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: th.gradientColor || th.accentColor || th.primaryColor }}
                        title={`Secondary: ${th.gradientColor || th.accentColor || th.primaryColor}`}
                      />
                    </div>
                    <div className="text-[11px] font-medium text-neutral-200 truncate">{th.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gradient & Color Representation Modes */}
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-200">Enable Gradient / Accent Color</span>
                  {settings.enableGradient !== false && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
                      GRADIENT ON
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Toggle between a pure solid primary color or multi-hue gradient styling
                </p>
              </div>

              {/* Gradient Switch Button */}
              <button
                type="button"
                role="switch"
                aria-checked={settings.enableGradient !== false}
                id="gradient-enable-switch"
                onClick={() => onSettingsChange({ enableGradient: settings.enableGradient === false ? true : false })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.enableGradient !== false ? 'bg-cyan-500' : 'bg-neutral-800'
                }`}
                title={settings.enableGradient !== false ? 'Disable gradient' : 'Enable gradient'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.enableGradient !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.enableGradient !== false && (
              <div className="pt-2 border-t border-neutral-800/80 flex flex-col gap-2">
                <span className="text-xs font-medium text-neutral-300">Color Representation Mode</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'bottom-to-top', label: 'Bottom to Top', desc: 'Rises vertically from base to peaks' },
                    { id: 'left-to-right', label: 'Left to Right', desc: 'Horizontal flow across waveform' },
                    { id: 'inside-out-horizontal', label: 'Inside Out (H)', desc: 'Center outwards to left/right wings' },
                    { id: 'inside-out-vertical', label: 'Inside Out (V)', desc: 'Midline center outwards vertically' },
                    { id: 'inside-out-circular', label: 'Inside Out (Circular)', desc: 'Radial bloom from avatar/center' },
                    { id: 'alternate-bars', label: 'Alternate Each Bar', desc: 'Alternates primary & accent per bar' },
                  ].map((mode) => {
                    const isSelected =
                      (settings.colorMode === 'top-to-bottom'
                        ? 'bottom-to-top'
                        : settings.colorMode === 'right-to-left'
                        ? 'left-to-right'
                        : settings.colorMode || 'bottom-to-top') === mode.id;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        id={`color-mode-btn-${mode.id}`}
                        onClick={() => onSettingsChange({ colorMode: mode.id as ColorRepresentationMode })}
                        className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-neutral-800 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-500/20'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <span className="text-xs font-semibold text-white">{mode.label}</span>
                        <span className="text-[10px] text-neutral-400">{mode.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Glow Intensity Slider */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-neutral-300">Neon Glow & Bloom Intensity</span>
              <span className="font-mono text-cyan-400">{Math.round((settings.glowIntensity || 0.4) * 100)}%</span>
            </div>
            <input
              id="glow-intensity-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.glowIntensity || 0.4}
              onChange={(e) => onSettingsChange({ glowIntensity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Custom Color Pickers */}
          <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <div>
                <label className="text-xs font-semibold text-neutral-300">Custom Colors</label>
                <p className="text-[11px] text-neutral-400">Directly fine-tune the primary and secondary colors</p>
              </div>

              {settings.enableGradient !== false && (
                <button
                  type="button"
                  id="switch-colors-btn"
                  onClick={handleSwitchColors}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-400/60 text-cyan-400 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                  title="Switch primary and secondary colors"
                  aria-label="Switch primary and secondary colors"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className={`grid grid-cols-1 ${settings.enableGradient !== false ? 'sm:grid-cols-2' : ''} gap-3 pt-1`}>
              <div>
                <span className="text-[11px] text-neutral-400 block mb-1">Primary Color</span>
                <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800 focus-within:border-cyan-400/60 transition-colors">
                  <input
                    type="color"
                    value={primaryColorValue.startsWith('#') && primaryColorValue.length === 7 ? primaryColorValue : '#06b6d4'}
                    onChange={(e) => {
                      setPrimaryHex(e.target.value.toUpperCase());
                      onSettingsChange({ primaryColor: e.target.value, useCustomColors: true });
                    }}
                    className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent shrink-0"
                    title="Open color picker"
                  />
                  <input
                    type="text"
                    id="primary-color-hex-input"
                    value={primaryHex}
                    onChange={(e) => handlePrimaryHexChange(e.target.value)}
                    onBlur={handlePrimaryHexBlur}
                    placeholder="#06B6D4"
                    maxLength={7}
                    spellCheck={false}
                    className="w-full bg-transparent font-mono text-xs text-neutral-200 uppercase outline-none focus:text-white"
                  />
                </div>
              </div>

              {settings.enableGradient !== false && (
                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1">Secondary / Gradient Color</span>
                  <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800 focus-within:border-cyan-400/60 transition-colors">
                    <input
                      type="color"
                      value={secondaryColorValue.startsWith('#') && secondaryColorValue.length === 7 ? secondaryColorValue : '#38bdf8'}
                      onChange={(e) => {
                        setSecondaryHex(e.target.value.toUpperCase());
                        onSettingsChange({ gradientColor: e.target.value, primaryGradientEnd: e.target.value, useCustomColors: true });
                      }}
                      className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent shrink-0"
                      title="Open color picker"
                    />
                    <input
                      type="text"
                      id="secondary-color-hex-input"
                      value={secondaryHex}
                      onChange={(e) => handleSecondaryHexChange(e.target.value)}
                      onBlur={handleSecondaryHexBlur}
                      placeholder="#38BDF8"
                      maxLength={7}
                      spellCheck={false}
                      className="w-full bg-transparent font-mono text-xs text-neutral-200 uppercase outline-none focus:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Waveform Geometry & Sliders */}
      {activeTab === 'geometry' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-fadeIn">
          {/* Bar Count */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-neutral-300">Bar / Point Count</span>
              <span className="font-mono text-cyan-400">{settings.barCount}</span>
            </div>
            <input
              id="bar-count-slider"
              type="range"
              min="24"
              max="200"
              step="4"
              value={settings.barCount}
              onChange={(e) => onSettingsChange({ barCount: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Bar Width Ratio */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-neutral-300">Bar Width Fill</span>
              <span className="font-mono text-cyan-400">{Math.round(settings.barWidthRatio * 100)}%</span>
            </div>
            <input
              id="bar-width-slider"
              type="range"
              min="0.2"
              max="0.95"
              step="0.05"
              value={settings.barWidthRatio}
              onChange={(e) => onSettingsChange({ barWidthRatio: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Corner Radius */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-neutral-300">Corner Radius</span>
              <span className="font-mono text-cyan-400">{settings.barRadius}px</span>
            </div>
            <input
              id="bar-radius-slider"
              type="range"
              min="0"
              max="12"
              step="1"
              value={settings.barRadius}
              onChange={(e) => onSettingsChange({ barRadius: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Audio Sensitivity & Max Height */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-neutral-300">Audio Sensitivity & Max Height</span>
              <span className="font-mono text-cyan-400">{settings.heightScale}x</span>
            </div>
            <input
              id="height-scale-slider"
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={settings.heightScale}
              onChange={(e) => onSettingsChange({ heightScale: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] text-neutral-500">Dynamic amplitude responsiveness and height reach across audio frequencies</span>
          </div>

          {/* Symmetry */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-300">Vertical Symmetry</span>
            <div className="flex items-center gap-1 mt-1">
              {[
                { id: 'mirror', label: 'Mirrored' },
                { id: 'top-only', label: 'Top' },
                { id: 'bottom-only', label: 'Bottom' },
              ].map((sym) => (
                <button
                  key={sym.id}
                  onClick={() => onSettingsChange({ symmetry: sym.id as 'mirror' | 'top-only' | 'bottom-only' })}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    settings.symmetry === sym.id
                      ? 'bg-neutral-800 text-cyan-400 border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>

          {/* Temporal Easing & Smoothing */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-neutral-300">Waveform Easing & Fluidness</span>
              <span className="font-mono text-cyan-400">{Math.round((settings.smoothing ?? 0.65) * 100)}%</span>
            </div>
            <input
              id="smoothing-slider"
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={settings.smoothing ?? 0.65}
              onChange={(e) => onSettingsChange({ smoothing: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] text-neutral-500">Fast-attack buoyant decay filter for liquid easing</span>
          </div>

          {/* Soft-Knee Peak Saturation */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col justify-center gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
              <input
                id="soft-knee-compression-toggle"
                type="checkbox"
                checked={settings.softKneeCompression !== false}
                onChange={(e) => onSettingsChange({ softKneeCompression: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
              />
              <span className="font-medium text-neutral-300">Soft-Knee Dynamic Saturation</span>
            </label>
            <p className="text-[10px] text-neutral-500">
              Smooths high-energy spikes using tanh curves to prevent harsh visual clipping
            </p>
          </div>

          {/* Waveform Edge & Profile Joint (Taper to Zero) Card */}
          <div className="sm:col-span-2 md:col-span-3 p-3.5 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Split className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Waveform Edge & Profile Joints</span>
                    {settings.enableJoint && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/40">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Smoothly tapers bar heights down to zero at canvas boundaries and next to profile
                  </p>
                </div>
              </div>

              {/* Master Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={settings.enableJoint}
                id="joint-enable-master-switch"
                onClick={() => onSettingsChange({ enableJoint: !settings.enableJoint })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.enableJoint ? 'bg-cyan-500' : 'bg-neutral-800'
                }`}
                title={settings.enableJoint ? 'Disable bar joint effect' : 'Enable bar joint effect'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.enableJoint ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.enableJoint && (
              <div className="pt-2 border-t border-neutral-800/80 flex flex-col gap-3 animate-fadeIn">
                {/* Checkboxes for where joint applies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 cursor-pointer hover:border-neutral-700">
                    <input
                      id="joint-at-ends-checkbox"
                      type="checkbox"
                      checked={settings.jointAtEnds !== false}
                      onChange={(e) => onSettingsChange({ jointAtEnds: e.target.checked })}
                      className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">Joint at Canvas Ends</span>
                      <span className="text-[10px] text-neutral-400">Tapers bars to zero at left and right edges</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 cursor-pointer hover:border-neutral-700">
                    <input
                      id="joint-at-profile-checkbox"
                      type="checkbox"
                      checked={settings.jointAtProfile !== false}
                      onChange={(e) => onSettingsChange({ jointAtProfile: e.target.checked })}
                      className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">Joint Next to Profile</span>
                      <span className="text-[10px] text-neutral-400">Tapers bars smoothly into avatar border</span>
                    </div>
                  </label>
                </div>

                {/* Slider: Joint Width / Falloff Distance */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium">Joint Width (Falloff Zone)</span>
                    <span className="font-mono text-cyan-400 font-semibold">{settings.jointWidth ?? 48}px</span>
                  </div>
                  <input
                    id="joint-width-slider"
                    type="range"
                    min="12"
                    max="160"
                    step="4"
                    value={settings.jointWidth ?? 48}
                    onChange={(e) => onSettingsChange({ jointWidth: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>12px (Sharp)</span>
                    <span>48px (Balanced)</span>
                    <span>160px (Broad Fade)</span>
                  </div>
                </div>

                {/* Falloff Curve Type */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-neutral-300">Tapering Curve</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'smooth', label: 'Smooth (Hermite)', desc: 'Natural organic curve' },
                      { id: 'linear', label: 'Linear', desc: 'Constant rate slope' },
                      { id: 'cubic', label: 'Cubic Ease-In', desc: 'Steep bottom pinch' },
                    ].map((curve) => (
                      <button
                        key={curve.id}
                        id={`joint-curve-btn-${curve.id}`}
                        type="button"
                        onClick={() => onSettingsChange({ jointCurve: curve.id as 'smooth' | 'linear' | 'cubic' })}
                        className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 cursor-pointer transition-all ${
                          (settings.jointCurve || 'smooth') === curve.id
                            ? 'bg-neutral-800 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-500/20'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-xs font-semibold text-white">{curve.label}</span>
                        <span className="text-[10px] text-neutral-400">{curve.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Radial specific controls */}
          {settings.style === 'radial' && (
            <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-neutral-300">Radial Inner Core Size</span>
                <span className="font-mono text-rose-400">{Math.round(settings.radialInnerRadius * 100)}%</span>
              </div>
              <input
                id="radial-inner-radius-slider"
                type="range"
                min="0.15"
                max="0.6"
                step="0.05"
                value={settings.radialInnerRadius}
                onChange={(e) => onSettingsChange({ radialInnerRadius: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Background & Custom Artwork / Video */}
      {activeTab === 'background' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Background Solid Color & Stage Theme */}
          <div className="flex flex-col gap-3 p-3.5 bg-neutral-950/70 rounded-xl border border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-semibold text-neutral-200">Background Stage Theme & Solid Color</label>
                <p className="text-[11px] text-neutral-400">Choose a solid studio background color or select an ambient stage atmosphere</p>
              </div>

              {/* Solid Color Picker & Editable Hex Input */}
              <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800 focus-within:border-cyan-400/60 transition-colors self-start sm:self-auto min-w-[210px]">
                <span className="text-[11px] text-neutral-400 font-medium pl-1 shrink-0">Solid Color:</span>
                <input
                  id="background-color-picker"
                  type="color"
                  value={backgroundColorValue.startsWith('#') && backgroundColorValue.length === 7 ? backgroundColorValue : '#09090b'}
                  onChange={(e) => {
                    setBgHex(e.target.value.toUpperCase());
                    onSettingsChange({ backgroundColor: e.target.value, backgroundType: 'custom-solid' });
                  }}
                  className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent shrink-0"
                  title="Pick Custom Background Color"
                />
                <input
                  type="text"
                  id="background-color-hex-input"
                  value={bgHex}
                  onChange={(e) => handleBgHexChange(e.target.value)}
                  onBlur={handleBgHexBlur}
                  placeholder="#09090B"
                  maxLength={7}
                  spellCheck={false}
                  className="w-full bg-transparent font-mono text-xs text-neutral-200 uppercase outline-none focus:text-white"
                />
              </div>
            </div>

            {/* Quick Solid Color Preset Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-neutral-500 font-medium">Quick Colors:</span>
              {[
                { name: 'Pure OLED', color: '#000000' },
                { name: 'Studio Night', color: '#09090b' },
                { name: 'Midnight Navy', color: '#0b1120' },
                { name: 'Slate Steel', color: '#0f172a' },
                { name: 'Zinc Dark', color: '#18181b' },
                { name: 'Deep Indigo', color: '#1e1b4b' },
                { name: 'Forest Dark', color: '#022c22' },
                { name: 'Cyber Violet', color: '#3b0764' },
                { name: 'Clean Light', color: '#f8fafc' },
              ].map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => onSettingsChange({ backgroundColor: p.color, backgroundType: 'custom-solid' })}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                    settings.backgroundColor === p.color && settings.backgroundType === 'custom-solid'
                      ? 'bg-neutral-800 border-cyan-400 text-white shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-neutral-700" style={{ backgroundColor: p.color }} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            {/* Stage Themes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
              {[
                { id: 'custom-solid', name: 'Custom Solid' },
                { id: 'dark-studio', name: 'Dark Studio' },
                { id: 'oled-black', name: 'Pure OLED (#000)' },
                { id: 'radial-spotlight', name: 'Neon Spotlight' },
                { id: 'gradient-mesh', name: 'Ambient Mesh' },
                { id: 'light-canvas', name: 'Light Canvas' },
                { id: 'transparent', name: 'Transparent (Alpha)' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  id={`bg-type-btn-${bg.id}`}
                  onClick={() => onSettingsChange({ backgroundType: bg.id as BackgroundType })}
                  className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all cursor-pointer ${
                    settings.backgroundType === bg.id && !backgroundImage && !backgroundVideo
                      ? 'bg-neutral-800 border-cyan-400 text-cyan-400 shadow-sm'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {bg.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Media Backdrop */}
          <div className="p-3.5 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-neutral-200">Backdrop Media</span>
                <p className="text-[11px] text-neutral-400">Add an image or video backdrop behind the visualizer</p>
              </div>

              {onOpenBackgroundModal && (
                <button
                  type="button"
                  id="open-backdrop-modal-btn"
                  onClick={onOpenBackgroundModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg text-xs transition-all cursor-pointer shadow-sm active:scale-95 self-start sm:self-auto"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{(backgroundImage || backgroundVideo) ? 'Change Backdrop' : 'Choose Backdrop'}</span>
                </button>
              )}
            </div>

            {/* Active Backdrop Status Banner */}
            {(backgroundImage || backgroundVideo) ? (
              <div className="flex items-center justify-between p-2.5 bg-emerald-950/30 border border-emerald-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {backgroundVideo ? (
                    <Film className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-emerald-300">
                    {backgroundVideo ? 'Video backdrop active' : 'Image backdrop active'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onBackgroundImageUpload(null);
                    onBackgroundImageUrlChange?.(null);
                    onBackgroundVideoUpload?.(null, null);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Remove Backdrop
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-neutral-900/40 border border-neutral-800/60 rounded-lg flex items-center justify-between">
                <span className="text-xs text-neutral-400">No media backdrop active • Renders background preset</span>
              </div>
            )}

            {/* Backdrop Blur & Dimming Controls (shown when either image or video is active) */}
            {(backgroundImage || backgroundVideo) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Backdrop Blur</span>
                    <span className="font-mono text-cyan-400">{backgroundBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={backgroundBlur}
                    onChange={(e) => onBackgroundBlurChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Darkening / Dimming</span>
                    <span className="font-mono text-cyan-400">{Math.round(backgroundDim * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.9"
                    step="0.05"
                    value={backgroundDim}
                    onChange={(e) => onBackgroundDimChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Typography, Overlays & Time Ruler Options */}
      {activeTab === 'overlays' && (
        <div className="flex flex-col gap-3 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Track Title */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-300">Track Title</label>
              <input
                id="track-title-input"
                type="text"
                value={settings.trackTitle}
                onChange={(e) => onSettingsChange({ trackTitle: e.target.value })}
                placeholder="Song / Audio Name"
                className="px-3 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Artist Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-300">Artist / Channel Name</label>
              <input
                id="artist-name-input"
                type="text"
                value={settings.artistName}
                onChange={(e) => onSettingsChange({ artistName: e.target.value })}
                placeholder="Artist or Creator"
                className="px-3 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Overlay Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={settings.showTrackInfo}
                onChange={(e) => onSettingsChange({ showTrackInfo: e.target.checked })}
                className="rounded accent-cyan-400"
              />
              <span>Track Title & Artist Overlay</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={settings.showDbGrid}
                onChange={(e) => onSettingsChange({ showDbGrid: e.target.checked })}
                className="rounded accent-cyan-400"
              />
              <span>dB Frequency Grid Lines</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={settings.showCenterLine}
                onChange={(e) => onSettingsChange({ showCenterLine: e.target.checked })}
                className="rounded accent-cyan-400"
              />
              <span>Center Alignment Axis</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

