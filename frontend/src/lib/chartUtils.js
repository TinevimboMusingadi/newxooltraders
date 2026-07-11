export const GRANULARITIES = [
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
  { label: '4h', value: 14400 },
  { label: '1D', value: 86400 },
];

export const DEFAULT_GRANULARITY = GRANULARITIES[0];

export function formatOHLC(candle) {
  return {
    time: candle.epoch || candle.open_time,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Crosshair / tooltip: always show date + time so past history is clear. */
export function formatChartCrosshairTime(time) {
  const d = new Date(typeof time === 'number' ? time * 1000 : time);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Axis tick labels: show date when not today / when looking at older history.
 * TickMarkType: 0 Year, 1 Month, 2 DayOfMonth, 3 Time, 4 TimeWithSeconds
 */
export function formatChartTickMark(time, tickMarkType, locale) {
  const d = new Date(typeof time === 'number' ? time * 1000 : time);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const sameYear = d.getFullYear() === now.getFullYear();

  if (tickMarkType === 0) return String(d.getFullYear());
  if (tickMarkType === 1) {
    return d.toLocaleString(locale || undefined, { month: 'short' });
  }
  if (tickMarkType === 2) {
    return sameYear
      ? `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  // Time / TimeWithSeconds — include date when not today so scroll-back is readable
  const clock = tickMarkType === 4
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay) return clock;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${clock}`;
}

export const CHART_LAYOUTS = [
  { id: '1', label: '1', cols: 1, rows: 1, max: 1 },
  { id: '2h', label: '2', cols: 2, rows: 1, max: 2 },
  { id: '2v', label: '2↕', cols: 1, rows: 2, max: 2 },
  { id: '4', label: '4', cols: 2, rows: 2, max: 4 },
];

