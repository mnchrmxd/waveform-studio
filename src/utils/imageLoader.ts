/**
 * Loads and optimizes an image file or URL asynchronously.
 * - Decodes off the main thread using img.decode()
 * - Constrains maximum dimension (default 2560px for backdrop, 512px for profile) to avoid GPU VRAM thrashing and canvas blur freezing
 * - Yields to the event loop so the UI remains fluid
 */
export async function loadOptimizedImage(
  source: File | string,
  maxDim: number = 2560
): Promise<{ image: HTMLImageElement; url: string }> {
  // Yield to let UI update spinners immediately
  await new Promise((resolve) => setTimeout(resolve, 10));

  let initialUrl: string;

  if (typeof source === 'string') {
    initialUrl = source;
  } else {
    initialUrl = URL.createObjectURL(source);
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = initialUrl;

  // Load and decode asynchronously
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
  });

  if (typeof img.decode === 'function') {
    try {
      await img.decode();
    } catch {
      // Ignore decode error fallback
    }
  }

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  // If already within max dimension, return directly
  if (naturalWidth <= maxDim && naturalHeight <= maxDim) {
    return { image: img, url: initialUrl };
  }

  // Downscale to maxDim while preserving aspect ratio
  const scale = Math.min(maxDim / naturalWidth, maxDim / naturalHeight);
  const targetW = Math.round(naturalWidth * scale);
  const targetH = Math.round(naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { image: img, url: initialUrl };
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Convert to blob URL for fast memory-efficient reference
  const optimizedBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
  );

  if (!optimizedBlob) {
    return { image: img, url: initialUrl };
  }

  const optimizedUrl = URL.createObjectURL(optimizedBlob);
  const optimizedImg = new Image();
  optimizedImg.crossOrigin = 'anonymous';
  optimizedImg.src = optimizedUrl;

  if (typeof optimizedImg.decode === 'function') {
    try {
      await optimizedImg.decode();
    } catch {
      // Fallback
    }
  } else {
    await new Promise<void>((resolve) => {
      optimizedImg.onload = () => resolve();
    });
  }

  return { image: optimizedImg, url: optimizedUrl };
}

/**
 * Robust image loader that handles CORS and proxy fallback for browser canvas drawing
 */
export async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  if (!url || !url.trim()) {
    throw new Error('Image URL cannot be empty');
  }
  const cleanUrl = url.trim();

  // Try direct load with crossOrigin
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Direct load failed (CORS or network)'));
      img.src = cleanUrl;
    });
  } catch {
    // Fallback: fetch via server proxy
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      throw new Error(`Failed to load image: HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to decode image from proxy'));
      };
      img.src = objectUrl;
    });
  }
}
