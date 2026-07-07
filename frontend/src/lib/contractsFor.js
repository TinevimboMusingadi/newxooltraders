import { TRADE_DURATIONS, durationKey } from './tradeDurations';

const UNIT_MAP = { s: 'm', t: 't', m: 'm', h: 'h', d: 'd' };

export function parseDurationToken(token) {
  if (token == null) return null;
  if (typeof token === 'number') return { value: token, unit: 't' };
  const str = String(token).trim().toLowerCase();
  const m = str.match(/^(\d+(?:\.\d+)?)([stmhd]?)$/);
  if (!m) return null;
  let value = Math.round(Number(m[1]));
  let unit = m[2] || 't';
  if (unit === 's') {
    if (value >= 86400 && value % 86400 === 0) return { value: value / 86400, unit: 'd' };
    if (value >= 3600 && value % 3600 === 0) return { value: value / 3600, unit: 'h' };
    if (value >= 60 && value % 60 === 0) return { value: value / 60, unit: 'm' };
    return { value: 1, unit: 'm' };
  }
  return { value, unit: UNIT_MAP[unit] || unit };
}

function durationToSeconds(d) {
  const mult = { t: 1, m: 60, h: 3600, d: 86400 };
  return d.value * (mult[d.unit] || 60);
}

export function parseContractsFor(data, contractTypes = []) {
  const available = data?.available || [];
  const typeSet = contractTypes.length ? new Set(contractTypes) : null;
  const relevant = available.filter((c) => !typeSet || typeSet.has(c.contract_type));

  const growthRates = new Set();
  let maxPayout = null;
  let maxTicks = null;
  const durationBounds = [];

  for (const c of relevant) {
    if (c.growth_rate != null) growthRates.add(Math.round(Number(c.growth_rate) * 100));
    if (c.max_payout != null) maxPayout = Math.max(maxPayout || 0, Number(c.max_payout));
    if (c.limit_order?.take_profit?.max_ticks != null) {
      maxTicks = Math.max(maxTicks || 0, Number(c.limit_order.take_profit.max_ticks));
    }

    const min = parseDurationToken(c.min_contract_duration);
    const max = parseDurationToken(c.max_contract_duration);
    if (min && max) durationBounds.push({ min, max });
  }

  const allowed = filterDurations(durationBounds);
  const allowedDurations = allowed.length ? allowed : TRADE_DURATIONS;
  const growthRateList = [...growthRates].sort((a, b) => a - b);

  return {
    available,
    allowedDurations,
    growthRates: growthRateList.length ? growthRateList : [1, 2, 3, 4, 5],
    maxPayout,
    maxTicks,
  };
}

function filterDurations(bounds) {
  if (!bounds.length) return TRADE_DURATIONS;

  return TRADE_DURATIONS.filter((d) =>
    bounds.some(({ min, max }) => {
      const sec = durationToSeconds(d);
      const minSec = durationToSeconds(min);
      const maxSec = durationToSeconds(max);
      return sec >= minSec && sec <= maxSec;
    }),
  );
}

export function pickDefaultDuration(allowed) {
  if (!allowed?.length) return TRADE_DURATIONS[1];
  const prefer = allowed.find((d) => durationKey(d) === '1m')
    || allowed.find((d) => durationKey(d) === '5m')
    || allowed[0];
  return prefer;
}
