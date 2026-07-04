/** Deriv duration_unit: t=ticks, m=minutes, h=hours, d=days */
export const TRADE_DURATIONS = [
  { label: '1 tick', value: 1, unit: 't' },
  { label: '1 min', value: 1, unit: 'm' },
  { label: '5 min', value: 5, unit: 'm' },
  { label: '15 min', value: 15, unit: 'm' },
  { label: '30 min', value: 30, unit: 'm' },
  { label: '1 hour', value: 1, unit: 'h' },
  { label: '1 day', value: 1, unit: 'd' },
];

export const DEFAULT_DURATION = TRADE_DURATIONS[1];

export function durationKey(d) {
  return `${d.value}${d.unit}`;
}

export function findDuration(key) {
  return TRADE_DURATIONS.find((d) => durationKey(d) === key) || DEFAULT_DURATION;
}
