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
