import { useState, useEffect } from 'react';

/**
 * Cloud / Node.js Backend Detection Service
 * Detects whether the full-stack Node.js server (with FFmpeg headless rendering) is active and reachable.
 */

let cachedCloudStatus: boolean | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 20_000; // Cache status for 20 seconds to prevent unnecessary health check spam

/**
 * Checks whether the Node.js backend server is online and responding to /api/health.
 * Returns false if running in a static web environment or if the Node server is unreachable.
 */
export async function checkCloudAvailability(forceFresh = false): Promise<boolean> {
  const now = Date.now();
  if (!forceFresh && cachedCloudStatus !== null && now - lastCheckTime < CACHE_TTL_MS) {
    return cachedCloudStatus;
  }

  // If in non-browser environment without fetch, default to false
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      cachedCloudStatus = false;
      lastCheckTime = now;
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // In static SPA hosting without Node, requests to /api/health often return index.html (text/html)
      cachedCloudStatus = false;
      lastCheckTime = now;
      return false;
    }

    const data = await response.json();
    const isAvailable = Boolean(data && data.status === 'ok');
    cachedCloudStatus = isAvailable;
    lastCheckTime = now;
    return isAvailable;
  } catch {
    cachedCloudStatus = false;
    lastCheckTime = now;
    return false;
  }
}

/**
 * Synchronous getter for current cached cloud status (null if not checked yet).
 */
export function getCachedCloudAvailability(): boolean | null {
  return cachedCloudStatus;
}

/**
 * React Hook for components needing real-time awareness of Node.js backend availability.
 */
export function useCloudStatus() {
  const [isCloudAvailable, setIsCloudAvailable] = useState<boolean>(() => {
    return cachedCloudStatus !== null ? cachedCloudStatus : true;
  });
  const [isChecking, setIsChecking] = useState<boolean>(cachedCloudStatus === null);

  useEffect(() => {
    let mounted = true;
    checkCloudAvailability().then((available) => {
      if (mounted) {
        setIsCloudAvailable(available);
        setIsChecking(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    isCloudAvailable,
    isChecking,
    recheck: () => checkCloudAvailability(true),
  };
}
