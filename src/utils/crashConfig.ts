export type CrashSensitivity = 'low' | 'medium' | 'high';

export const CRASH_THRESHOLDS: Record<CrashSensitivity, number> = {
  low: 6.0,
  medium: 8.0,
  high: 10.0,
};