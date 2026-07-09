import { derivWsRequest } from '../lib/derivWs.js';

function extractLastDigit(quote) {
  const str = String(quote);
  const digit = str.replace(/\D/g, '').slice(-1);
  return digit ? Number(digit) : 0;
}

function analyzeDigits(quotes) {
  const counts = Array(10).fill(0);
  for (const q of quotes) counts[extractLastDigit(q)] += 1;
  const total = quotes.length || 1;
  const dist = counts.map((c, digit) => ({ digit, pct: (c / total) * 100 }));

  const evenPct = dist.filter((d) => d.digit % 2 === 0).reduce((s, d) => s + d.pct, 0);
  const oddPct = 100 - evenPct;
  const over4Pct = dist.filter((d) => d.digit > 4).reduce((s, d) => s + d.pct, 0);
  const under5Pct = dist.filter((d) => d.digit < 5).reduce((s, d) => s + d.pct, 0);

  const picks = [
    { type: 'DIGITEVEN', label: 'Even', confidence: evenPct, barrier: null },
    { type: 'DIGITODD', label: 'Odd', confidence: oddPct, barrier: null },
    { type: 'DIGITOVER', label: 'Over 4', confidence: over4Pct, barrier: 4 },
    { type: 'DIGITUNDER', label: 'Under 5', confidence: under5Pct, barrier: 5 },
  ].sort((a, b) => b.confidence - a.confidence);

  return {
    evenPct,
    oddPct,
    over4Pct,
    under5Pct,
    best: picks[0],
    stats: { over4: over4Pct.toFixed(1), under5: under5Pct.toFixed(1), even: evenPct.toFixed(1), odd: oddPct.toFixed(1) },
  };
}

async function fetchTicks(symbol, count = 500) {
  const data = await derivWsRequest(
    {
      ticks_history: symbol,
      adjust_start_time: 1,
      count,
      end: 'latest',
      style: 'ticks',
    },
    {
      timeoutMs: 20000,
      match: (d) => d.msg_type === 'history',
    },
  );
  return (data.history?.prices || []).map(Number);
}

export async function computeSignalsFromHistory(symbols) {
  const results = [];
  for (const symbol of symbols) {
    try {
      const quotes = await fetchTicks(symbol, 500);
      if (quotes.length < 50) continue;
      const analysis = analyzeDigits(quotes);
      results.push({
        symbol,
        confidence: analysis.best.confidence,
        contractType: analysis.best.type,
        label: analysis.best.label,
        barrier: analysis.best.barrier,
        stats: analysis.stats,
        live: true,
      });
    } catch {
      /* skip symbol */
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}
