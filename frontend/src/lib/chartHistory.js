/**
 * Helpers for loading older chart history when the user pans left.
 */

export const HISTORY_PAGE = 300;
export const MAX_CANDLES = 5000;
export const MAX_TICK_POINTS = 3000;

/** True when the visible range is near the oldest loaded bar. */
export function shouldLoadOlderHistory(logicalRange, barCount, threshold = 10) {
  if (!logicalRange || barCount < 2) return false;
  return logicalRange.from < threshold;
}

/**
 * Request older candles/ticks ending just before the earliest loaded point.
 * @returns {object|null} ticks_history payload or null if nothing to load
 */
export function buildOlderHistoryRequest({
  symbol,
  earliestTime,
  style = 'candles',
  granularity,
  count = HISTORY_PAGE,
  reqId,
}) {
  if (!symbol || earliestTime == null) return null;
  const payload = {
    ticks_history: symbol,
    adjust_start_time: 1,
    count,
    end: Math.max(1, Number(earliestTime) - 1),
    style,
    req_id: reqId,
  };
  if (style === 'candles' && granularity != null) {
    payload.granularity = granularity;
  }
  return payload;
}

/** Merge older bars in front of existing series data (dedupe by time). */
export function prependHistory(existing, older) {
  if (!older?.length) return existing || [];
  if (!existing?.length) return older;
  const firstTime = existing[0].time;
  const filtered = older.filter((p) => p.time < firstTime);
  if (!filtered.length) return existing;
  return [...filtered, ...existing];
}

/** Cap series length from the left so memory stays bounded. */
export function capHistory(points, max) {
  if (!points || points.length <= max) return points || [];
  return points.slice(points.length - max);
}
