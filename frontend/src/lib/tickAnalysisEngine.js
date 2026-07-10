import { extractLastDigit, computeDigitDistribution } from './digitsEngine';

export function createTickBuffer(maxSize = 120) {
  const quotes = [];
  const digits = [];
  const evenOdd = [];
  const riseFall = [];
  const overUnder = [];

  function push(quote, pip = 2) {
    const digit = extractLastDigit(quote, pip);
    const prevQuote = quotes.length ? quotes[quotes.length - 1] : null;

    quotes.push(quote);
    digits.push(digit);
    evenOdd.push(digit % 2 === 0 ? 'E' : 'O');

    if (prevQuote != null) {
      riseFall.push(quote >= prevQuote ? 'R' : 'F');
    }
    overUnder.push(digit > 4 ? 'O' : 'U');

    if (quotes.length > maxSize) {
      quotes.shift();
      digits.shift();
      evenOdd.shift();
      if (riseFall.length > maxSize - 1) riseFall.shift();
      overUnder.shift();
    }

    return buildSnapshot(quotes, digits, evenOdd, riseFall, overUnder, pip);
  }

  function reset() {
    quotes.length = 0;
    digits.length = 0;
    evenOdd.length = 0;
    riseFall.length = 0;
    overUnder.length = 0;
  }

  function snapshot(pip = 2) {
    return buildSnapshot(quotes, digits, evenOdd, riseFall, overUnder, pip);
  }

  return { push, reset, snapshot, get size() { return quotes.length; } };
}

function pct(count, total) {
  return total ? (count / total) * 100 : 0;
}

function buildSnapshot(quotes, digits, evenOdd, riseFall, overUnder, pip) {
  const distribution = quotes.length >= 5 ? computeDigitDistribution(quotes, pip) : null;
  const evenCount = evenOdd.filter((x) => x === 'E').length;
  const oddCount = evenOdd.length - evenCount;
  const riseCount = riseFall.filter((x) => x === 'R').length;
  const fallCount = riseFall.length - riseCount;
  const overCount = overUnder.filter((x) => x === 'O').length;
  const underCount = overUnder.length - overCount;

  return {
    quote: quotes.length ? quotes[quotes.length - 1] : null,
    quoteHistory: [...quotes],
    lastDigit: digits.length ? digits[digits.length - 1] : null,
    digitHistory: [...digits],
    evenOddHistory: [...evenOdd],
    riseFallHistory: [...riseFall],
    overUnderHistory: [...overUnder],
    distribution,
    evenPct: pct(evenCount, evenOdd.length),
    oddPct: pct(oddCount, evenOdd.length),
    risePct: pct(riseCount, riseFall.length),
    fallPct: pct(fallCount, riseFall.length),
    over4Pct: pct(overCount, overUnder.length),
    under5Pct: pct(underCount, overUnder.length),
    tickCount: quotes.length,
  };
}

export function evaluateSignalRule(rule, snapshot) {
  if (!snapshot || snapshot.tickCount < (rule.minTicks || 20)) return false;

  if (rule.type === 'even_pct') {
    const pctVal = rule.side === 'DIGITEVEN' ? snapshot.evenPct : snapshot.oddPct;
    return pctVal >= (rule.threshold || 55);
  }
  if (rule.type === 'rise_pct') {
    const pctVal = rule.side === 'CALL' ? snapshot.risePct : snapshot.fallPct;
    return pctVal >= (rule.threshold || 55);
  }
  if (rule.type === 'over_pct') {
    const pctVal = rule.side === 'DIGITOVER' ? snapshot.over4Pct : snapshot.under5Pct;
    return pctVal >= (rule.threshold || 55);
  }
  if (rule.type === 'digit_streak') {
    const hist = snapshot.digitHistory.slice(-(rule.lookback || 3));
    if (hist.length < (rule.lookback || 3)) return false;
    return hist.every((d) => d > (rule.compareDigit ?? 4));
  }
  return false;
}

export const STRATEGY_PACKS = [
  {
    id: 'volatility-even-hunter',
    name: 'Even Hunter',
    pack: 'Volatility',
    description: 'DIGITEVEN when even% ≥ 60 over last 120 ticks.',
    config: {
      baseStake: 0.5,
      useMartingale: true,
      multiplier: 1.2,
      takeProfit: 20,
      stopLoss: 15,
      maxConsecutiveLosses: 4,
      contractType: 'DIGITEVEN',
      durationTicks: 1,
      intervalMode: false,
      signalRule: { type: 'even_pct', side: 'DIGITEVEN', threshold: 60, minTicks: 40 },
    },
  },
  {
    id: 'volatility-odd-hunter',
    name: 'Odd Hunter',
    pack: 'Volatility',
    description: 'DIGITODD when odd% ≥ 60 over last 120 ticks.',
    config: {
      baseStake: 0.5,
      useMartingale: true,
      multiplier: 1.2,
      takeProfit: 20,
      stopLoss: 15,
      maxConsecutiveLosses: 4,
      contractType: 'DIGITODD',
      durationTicks: 1,
      intervalMode: false,
      signalRule: { type: 'even_pct', side: 'DIGITODD', threshold: 60, minTicks: 40 },
    },
  },
  {
    id: 'volatility-rise',
    name: 'Volatility Rise',
    pack: 'Volatility',
    description: 'CALL when rise% ≥ 55 on live tick buffer.',
    config: {
      baseStake: 1,
      useMartingale: false,
      multiplier: 2,
      takeProfit: 30,
      stopLoss: 20,
      maxConsecutiveLosses: 3,
      contractType: 'CALL',
      durationMin: 1,
      intervalMode: false,
      signalRule: { type: 'rise_pct', side: 'CALL', threshold: 55, minTicks: 30 },
    },
  },
  {
    id: 'sr-bounce',
    name: 'S/R Bounce',
    pack: 'Levels',
    description: 'Rise/Fall when price nears recent swing high/low (statistical levels).',
    config: {
      baseStake: 1,
      useMartingale: false,
      multiplier: 2,
      takeProfit: 25,
      stopLoss: 15,
      maxConsecutiveLosses: 3,
      contractType: 'CALL',
      durationMin: 1,
      intervalMode: false,
      srMode: true,
      srLookback: 50,
      srProximityPct: 0.15,
    },
  },
];
