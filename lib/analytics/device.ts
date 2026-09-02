/**
 * Device fingerprint, shared by the session-start metadata in useAnalytics and
 * the per-run metadata on tour_runs.
 *
 * Extracted rather than duplicated so the two never disagree — an admin
 * comparing "mobile completion rate" against "mobile session count" is comparing
 * numbers that must come from the same UA sniffing.
 *
 * Browser-only: every caller runs inside an effect.
 */

export interface DeviceInfo {
  device_type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  viewport_width: number;
  viewport_height: number;
}

export function deviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  return {
    device_type: /Mobi|Android/i.test(ua) ? 'mobile'
               : /Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop',
    browser: ua.includes('Chrome') ? 'Chrome'
           : ua.includes('Firefox') ? 'Firefox'
           : ua.includes('Safari') ? 'Safari'
           : ua.includes('Edge') ? 'Edge' : 'Other',
    os: ua.includes('Mac') ? 'macOS'
      : ua.includes('Windows') ? 'Windows'
      : ua.includes('Android') ? 'Android'
      : ua.includes('iPhone') ? 'iOS' : 'Other',
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  };
}
