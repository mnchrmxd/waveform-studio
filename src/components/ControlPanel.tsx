import React, { useState } from 'react';
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
} from 'lucide-react';
import { ColorTheme, VisualizerSettings, WaveformStyle, BackgroundType, SideSymmetryType, ProfileImageShape } from '../types';
import { COLOR_THEMES } from '../data/presets';

interface ControlPanelProps {
  settings: VisualizerSettings;
  theme: ColorTheme;
  onSettingsChange: (newSettings: Partial<VisualizerSettings>) => void;
  onThemeSelect: (themeId: string) => void;
  onBackgroundImageUpload: (image: HTMLImageElement | null) => void;
  backgroundImage: HTMLImageElement | null;
  backgroundBlur: number;
  onBackgroundBlurChange: (blur: number) => void;
  backgroundDim: number;
  onBackgroundDimChange: (dim: number) => void;
  profileImage?: HTMLImageElement | null;
  onProfileImageUpload?: (image: HTMLImageElement | null) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  theme,
  onSettingsChange,
  onThemeSelect,
  onBackgroundImageUpload,
  backgroundImage,
  backgroundBlur,
  onBackgroundBlurChange,
  backgroundDim,
  onBackgroundDimChange,
  profileImage,
  onProfileImageUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'avatar' | 'colors' | 'geometry' | 'background' | 'overlays'>('style');

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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        onBackgroundImageUpload(img);
      };
    }
  };

  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        onProfileImageUpload?.(img);
        onSettingsChange({ showProfileImage: true });
      };
    }
  };

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

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-200">
                <input
                  id="toggle-profile-image"
                  type="checkbox"
                  checked={settings.showProfileImage}
                  onChange={(e) => onSettingsChange({ showProfileImage: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                />
                <span>Enable Avatar</span>
              </label>
            </div>

            {settings.showProfileImage && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-800/80">
                <label className="flex items-center gap-2 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium cursor-pointer border border-neutral-700">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>{profileImage ? 'Change Image...' : 'Upload Profile Picture...'}</span>
                  <input
                    id="profile-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileFileChange}
                    className="hidden"
                  />
                </label>

                {profileImage && (
                  <button
                    id="remove-profile-image-btn"
                    onClick={() => onProfileImageUpload?.(null)}
                    className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    Reset to Default Logo
                  </button>
                )}

                <span className="text-[11px] text-neutral-400 ml-auto">
                  {profileImage ? '✓ Custom picture loaded' : 'Using default studio badge'}
                </span>
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
                  <span>Outer Neon Ripple & Ambient Glow</span>
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
            <label className="text-xs font-semibold text-neutral-300">Preset Color Themes</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLOR_THEMES.map((th) => (
                <button
                  key={th.id}
                  id={`theme-preset-btn-${th.id}`}
                  onClick={() => {
                    onThemeSelect(th.id);
                    onSettingsChange({ useCustomColors: false, themeId: th.id });
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    settings.themeId === th.id && !settings.useCustomColors
                      ? 'bg-neutral-800 border-cyan-400 ring-2 ring-cyan-500/20'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: th.primaryColor }}
                    />
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: th.primaryGradientEnd || th.accentColor }}
                    />
                    <div
                      className="w-4 h-4 rounded-full shadow-sm ml-auto border border-white/20"
                      style={{ backgroundColor: th.backgroundColor }}
                    />
                  </div>
                  <div className="text-[11px] font-medium text-neutral-200 truncate">{th.name}</div>
                </button>
              ))}
            </div>
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300">Custom Colors Override</label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={settings.useCustomColors}
                  onChange={(e) => onSettingsChange({ useCustomColors: e.target.checked })}
                  className="rounded accent-cyan-400"
                />
                <span>Enable Custom Colors</span>
              </label>
            </div>

            {settings.useCustomColors && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1">Primary Color</span>
                  <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => onSettingsChange({ primaryColor: e.target.value })}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-xs text-neutral-300 uppercase">{settings.primaryColor}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1">Gradient End</span>
                  <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                    <input
                      type="color"
                      value={settings.primaryGradientEnd}
                      onChange={(e) => onSettingsChange({ primaryGradientEnd: e.target.value })}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-xs text-neutral-300 uppercase">{settings.primaryGradientEnd}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1">Progress Color</span>
                  <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                    <input
                      type="color"
                      value={settings.progressColor}
                      onChange={(e) => onSettingsChange({ progressColor: e.target.value })}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-xs text-neutral-300 uppercase">{settings.progressColor}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1">Background Solid</span>
                  <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                    <input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => onSettingsChange({ backgroundColor: e.target.value })}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-xs text-neutral-300 uppercase">{settings.backgroundColor}</span>
                  </div>
                </div>
              </div>
            )}
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

          {/* Height Scale */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-neutral-300">Amplitude Height Multiplier</span>
              <span className="font-mono text-cyan-400">{settings.heightScale}x</span>
            </div>
            <input
              id="height-scale-slider"
              type="range"
              min="0.4"
              max="2.0"
              step="0.1"
              value={settings.heightScale}
              onChange={(e) => onSettingsChange({ heightScale: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
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

          {/* Max Bar Height Ceiling */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-neutral-300">Max Bar Height Ceiling</span>
              <span className="font-mono text-cyan-400">{settings.maxBarHeight ?? 85}%</span>
            </div>
            <input
              id="max-bar-height-slider"
              type="range"
              min="20"
              max="100"
              step="5"
              value={settings.maxBarHeight ?? 85}
              onChange={(e) => onSettingsChange({ maxBarHeight: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] text-neutral-500">Limits maximum peak amplitude to prevent edge overflow</span>
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

          {/* Soft-Knee Peak Compression */}
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col justify-center gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
              <input
                id="soft-knee-compression-toggle"
                type="checkbox"
                checked={settings.softKneeCompression !== false}
                onChange={(e) => onSettingsChange({ softKneeCompression: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
              />
              <span className="font-medium text-neutral-300">Soft-Knee Dynamic Compression</span>
            </label>
            <p className="text-[10px] text-neutral-500">
              Smooths high-energy spikes using tanh curves to prevent harsh visual clipping
            </p>
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

      {/* Tab 5: Background & Custom Artwork */}
      {activeTab === 'background' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Built-in Background Styles */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-neutral-300">Background Stage Theme</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { id: 'dark-studio', name: 'Dark Studio' },
                { id: 'oled-black', name: 'Pure OLED (#000)' },
                { id: 'radial-spotlight', name: 'Neon Spotlight' },
                { id: 'gradient-mesh', name: 'Ambient Mesh' },
                { id: 'light-canvas', name: 'Light Canvas' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  id={`bg-type-btn-${bg.id}`}
                  onClick={() => onSettingsChange({ backgroundType: bg.id as BackgroundType })}
                  className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all cursor-pointer ${
                    settings.backgroundType === bg.id && !backgroundImage
                      ? 'bg-neutral-800 border-cyan-400 text-cyan-400'
                      : 'bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {bg.name}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Custom Cover / Background Artwork */}
          <div className="p-3.5 bg-neutral-950/70 rounded-xl border border-neutral-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-200">Custom Background Artwork / Album Cover</span>
                <p className="text-[11px] text-neutral-400">Upload any PNG/JPG image to render behind the visualizer</p>
              </div>
              {backgroundImage && (
                <button
                  onClick={() => onBackgroundImageUpload(null)}
                  className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Remove Image
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium cursor-pointer border border-neutral-700">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Choose Image...</span>
                <input
                  id="background-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
              {backgroundImage && (
                <span className="text-xs font-mono text-emerald-400">✓ Image loaded</span>
              )}
            </div>

            {backgroundImage && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Background Blur</span>
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
                    min="0.1"
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
                checked={settings.showTimeRuler}
                onChange={(e) => onSettingsChange({ showTimeRuler: e.target.checked })}
                className="rounded accent-cyan-400"
              />
              <span>Live Preview Time Ruler</span>
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

          {/* Export Specific Rule Section */}
          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between mt-1">
            <div>
              <span className="text-xs font-semibold text-neutral-200">Video Export Time Ruler</span>
              <p className="text-[11px] text-neutral-400">
                {settings.showTimeRulerInExport
                  ? 'Time ruler will be rendered in exported MP4 videos'
                  : 'Time ruler is removed in exports for clean motion graphics editing'}
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-300">
              <input
                id="toggle-export-time-ruler"
                type="checkbox"
                checked={settings.showTimeRulerInExport}
                onChange={(e) => onSettingsChange({ showTimeRulerInExport: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-400"
              />
              <span>Include in Export</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

