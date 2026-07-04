export const PATTERN_MODES = {
  O1U8: { label: 'O1 / U8', over: 1, under: 8 },
  O2U7: { label: 'O2 / U7', over: 2, under: 7 },
  O3U6: { label: 'O3 / U6', over: 3, under: 6 },
};

export function extractLastDigit(quote, pip = 2) {
  const str = Number(quote).toFixed(pip);
  const digit = str.replace(/\D/g, '').slice(-1);
  return digit ? Number(digit) : 0;
}

export function computeDigitDistribution(quotes, pip = 2) {
  const counts = Array(10).fill(0);
  for (const q of quotes) {
    counts[extractLastDigit(q, pip)] += 1;
  }
  const total = quotes.length || 1;
  return counts.map((c, digit) => ({
    digit,
    count: c,
    pct: (c / total) * 100,
  }));
}

export function analyzePattern(dist, modeKey) {
  const mode = PATTERN_MODES[modeKey];
  if (!mode) return null;
  const overPct = dist.filter((d) => d.digit > mode.over).reduce((s, d) => s + d.pct, 0);
  const underPct = dist.filter((d) => d.digit < mode.under).reduce((s, d) => s + d.pct, 0);
  const confidence = Math.max(overPct, underPct);
  const direction = overPct >= underPct ? 'DIGITOVER' : 'DIGITUNDER';
  const barrier = direction === 'DIGITOVER' ? mode.over : mode.under;
  return { direction, barrier, confidence, overPct, underPct, mode: mode.label };
}

export function rankSignals(results, minConfidence = 55) {
  return results
    .filter((r) => r.analysis && r.analysis.confidence >= minConfidence)
    .sort((a, b) => b.analysis.confidence - a.analysis.confidence);
}

export async function fetchTickHistory(symbol, count = 1000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');
    const quotes = [];
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Tick history timeout'));
    }, 20000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        ticks_history: symbol,
        adjust_start_time: 1,
        count,
        end: 'latest',
        style: 'ticks',
        req_id: 1,
      }));
    };

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.error) {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(data.error.message));
        return;
      }
      if (data.msg_type === 'history' && data.history?.prices) {
        clearTimeout(timeout);
        ws.close();
        resolve(data.history.prices.map(Number));
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('WebSocket error'));
    };
  });
}

export async function scanMarkets(symbols, { depth = 1000, pattern = 'O1U8', pip = 2 } = {}) {
  const results = [];
  for (const symbol of symbols) {
    try {
      const quotes = await fetchTickHistory(symbol, depth);
      const dist = computeDigitDistribution(quotes, pip);
      const analysis = analyzePattern(dist, pattern);
      results.push({ symbol, dist, analysis, tickCount: quotes.length });
    } catch (err) {
      results.push({ symbol, error: err.message, dist: null, analysis: null });
    }
  }
  return results;
}
