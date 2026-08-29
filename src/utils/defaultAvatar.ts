// Generates a default podcast/music avatar image as a data URI
export function getDefaultAvatarDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#06b6d4" />
        <stop offset="50%" stop-color="#3b82f6" />
        <stop offset="100%" stop-color="#8b5cf6" />
      </linearGradient>
      <linearGradient id="innerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.4" />
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#avatarGrad)" />
    <rect width="400" height="400" fill="url(#innerGlow)" />
    
    <!-- Outer Audio Waves Ring -->
    <circle cx="200" cy="200" r="140" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.25" stroke-dasharray="8 6" />
    <circle cx="200" cy="200" r="110" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.4" />

    <!-- Center Headphones & Mic Graphic -->
    <g transform="translate(200, 190) scale(1.15)">
      <!-- Headphone arc -->
      <path d="M-60,10 C-60,-50 60,-50 60,10" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />
      <!-- Left Ear cup -->
      <rect x="-74" y="0" width="22" height="42" rx="10" fill="#ffffff" />
      <!-- Right Ear cup -->
      <rect x="52" y="0" width="22" height="42" rx="10" fill="#ffffff" />
      
      <!-- Center Soundwave Bars -->
      <rect x="-24" y="2" width="6" height="24" rx="3" fill="#ffffff" opacity="0.9" />
      <rect x="-12" y="-12" width="6" height="44" rx="3" fill="#ffffff" />
      <rect x="0" y="-22" width="6" height="58" rx="3" fill="#ffffff" />
      <rect x="12" y="-12" width="6" height="44" rx="3" fill="#ffffff" />
      <rect x="24" y="2" width="6" height="24" rx="3" fill="#ffffff" opacity="0.9" />
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function loadDefaultAvatarImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = getDefaultAvatarDataUrl();
  });
}
