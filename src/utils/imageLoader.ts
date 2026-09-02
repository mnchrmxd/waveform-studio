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
