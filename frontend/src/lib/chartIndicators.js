/** Pure indicator helpers for lightweight-charts overlays. */

export function sma(values, period) {
  const out = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out.push(sum / period);
    else out.push(null);
  }
  return out;
}

export function ema(values, period) {
  const out = [];
  const k = 2 / (period + 1);
  let prev = null;
  for (let i = 0; i < values.length; i += 1) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j += 1) sum += values[j];
      prev = sum / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

export function bollinger(values, period = 20, mult = 2) {
  const mid = sma(values, period);
  const upper = [];
  const lower = [];
  for (let i = 0; i < values.length; i += 1) {
    if (mid[i] == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      const d = values[j] - mid[i];
      sumSq += d * d;
    }
    const std = Math.sqrt(sumSq / period);
    upper.push(mid[i] + mult * std);
    lower.push(mid[i] - mult * std);
  }
  return { mid, upper, lower };
}

export function rsi(values, period = 14) {
  const out = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (i === 0) {
      out.push(null);
      continue;
    }
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      out.push(null);
      continue;
    }
    if (i === period) {
      avgGain = (avgGain + gain) / period;
      avgLoss = (avgLoss + loss) / period;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) out.push(100);
    else {
      const rs = avgGain / avgLoss;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

export const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export function fibLevels(high, low) {
  const hi = Math.max(high, low);
  const lo = Math.min(high, low);
  const range = hi - lo;
  return FIB_RATIOS.map((r) => ({
    ratio: r,
    price: hi - range * r,
    label: `${(r * 100).toFixed(1)}%`,
  }));
}

export function closesFromPoints(points) {
  return points.map((p) => (p.value != null ? p.value : p.close));
}

export function toLineData(times, values) {
  const data = [];
  for (let i = 0; i < times.length; i += 1) {
    if (values[i] == null || !Number.isFinite(values[i])) continue;
    data.push({ time: times[i], value: values[i] });
  }
  return data;
}
