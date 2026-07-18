import { evaluateSignalRule } from './tickAnalysisEngine';

export function createStrategyRunner({ onProposal, onBuy, onLog }) {
  let running = false;
  let stats = { wins: 0, losses: 0, pl: 0, trades: 0 };
  let config = null;

  const log = (msg) => onLog?.({ ts: Date.now(), msg });

  return {
    getStats: () => ({ ...stats }),
    isRunning: () => running,
    start(cfg) {
      config = cfg;
      running = true;
      log(config?.intervalMode ? 'Bot started (interval mode)' : 'Bot started (signal mode)');
    },
    stop() {
      running = false;
      log('Bot stopped');
    },
    async tick(signal = {}) {
      if (!running || !config) return;
      if (stats.pl >= config.takeProfit) {
        log('Take profit reached');
        running = false;
        return;
      }
      if (stats.pl <= -config.stopLoss) {
        log('Stop loss reached');
        running = false;
        return;
      }
      if (stats.losses >= config.maxConsecutiveLosses && config.maxConsecutiveLosses > 0) {
        log('Max consecutive losses — pausing');
        running = false;
        return;
      }

      if (!config.intervalMode) {
        if (config.signalRule && signal.snapshot) {
          if (!evaluateSignalRule(config.signalRule, signal.snapshot)) {
            return;
          }
        } else if (config.srMode && signal.snapshot) {
          const { swingHigh, swingLow, quote } = signal.snapshot;
          if (swingHigh == null || swingLow == null || quote == null) return;
          const range = swingHigh - swingLow || 1;
          const nearLow = (quote - swingLow) / range <= (config.srProximityPct || 0.15);
          const nearHigh = (swingHigh - quote) / range <= (config.srProximityPct || 0.15);
          if (!nearLow && !nearHigh) return;
          signal.contractType = nearLow ? 'CALL' : 'PUT';
        } else if (!signal?.force && !signal?.contractType) {
          return;
        }
      }

      try {
        const stake = config.useMartingale
          ? config.baseStake * Math.pow(config.multiplier, stats.losses)
          : config.baseStake;
        const contractType = signal.contractType || config.contractType || 'CALL';
        const proposal = await onProposal({
          ...signal,
          amount: stake,
          contractType,
          duration: config.durationTicks || config.durationMin || 5,
          durationUnit: config.durationTicks ? 't' : 'm',
        });
        const id = proposal.proposal?.id;
        const price = proposal.proposal?.ask_price;
        if (!id) throw new Error('No proposal');
        const buy = await onBuy(String(id), price);
        stats.trades += 1;
        const profit = buy.buy?.buy_price ? -buy.buy.buy_price : 0;
        stats.pl += profit;
        if (profit >= 0) stats.wins += 1;
        else stats.losses += 1;
        log(`Trade #${stats.trades} ${contractType} stake ${stake.toFixed(2)}`);
      } catch (err) {
        log(`Error: ${err.message}`);
      }
    },
  };
}

/** Exact Deriv Quick Strategy params (Volatility 25 / Matches-Differs) — boss-visible Free Bot */
export const DIGIT_MATCH_V25_PRESET = {
  id: 'digit-match-v25',
  name: 'V25 Matches / Differs',
  pack: 'Deriv Exact',
  description: 'Exact Quick Strategy params: R_25, Matches/Differs, prediction 9, TP/SL, Martingale.',
  config: {
    symbol: 'R_25',
    marketLabel: 'Synthetic Index › Random Index › Volatility 25 Index',
    tradeTypeLabel: 'Digits › Matches/Differs',
    contractTypeLabel: 'Both',
    contractSide: 'both',
    candleIntervalLabel: '1 minute',
    candleIntervalMin: 1,
    restartBuySellOnError: false,
    restartLastTradeOnError: true,
    winAmount: 1,
    stakeFromWinAmount: true,
    baseStake: 1,
    prediction: 9,
    takeProfit: 10000,
    stopLoss: 1000,
    martingale: 1,
    maxStakeFromWinAmount: true,
    maxStake: 1,
    useMartingale: true,
    multiplier: 1,
    durationTicks: 1,
    intervalMode: true,
    tradeKind: 'digit_match_differ',
  },
};

export const BOT_PRESETS = [
  DIGIT_MATCH_V25_PRESET,
  {
    id: 'speed-rise-fall',
    name: 'Speed Rise/Fall',
    pack: 'Core',
    config: { baseStake: 1, useMartingale: false, multiplier: 2, takeProfit: 10, stopLoss: 10, maxConsecutiveLosses: 3, intervalMode: true },
  },
  {
    id: 'apex-martingale',
    name: 'Apex Martingale',
    pack: 'Core',
    config: { baseStake: 1, useMartingale: true, multiplier: 2, takeProfit: 50, stopLoss: 25, maxConsecutiveLosses: 5, intervalMode: true },
  },
  {
    id: 'digit-even',
    name: 'Digit Even Hunter',
    pack: 'Core',
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
      signalRule: { type: 'even_pct', side: 'DIGITEVEN', threshold: 58, minTicks: 40 },
    },
  },
  {
    id: 'volatility-call',
    name: 'Volatility Rise',
    pack: 'Core',
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
];

/**
 * Continuous bot runner for digit match/differ (and generic interval) strategies.
 * Emits chat-friendly logs via onLog({ role, text }).
 */
export function createBotDeskRunner({ onProposal, onBuy, onLog, onContractOpened }) {
  let running = false;
  let config = null;
  let stake = 1;
  let sessionPl = 0;
  let consecutiveLosses = 0;
  let busy = false;
  let flip = false;
  const botContractIds = new Set();

  const log = (text, role = 'bot') => onLog?.({ ts: Date.now(), role, text });

  const currentMaxStake = () => {
    if (!config) return stake;
    if (config.maxStakeFromWinAmount) return config.winAmount || config.baseStake || 1;
    return config.maxStake ?? 1000;
  };

  const pickContractType = () => {
    if (config?.tradeKind === 'digit_match_differ') {
      if (config.contractSide === 'differ') return 'DIGITDIFF';
      if (config.contractSide === 'match') return 'DIGITMATCH';
      flip = !flip;
      return flip ? 'DIGITMATCH' : 'DIGITDIFF';
    }
    return config?.contractType || 'CALL';
  };

  return {
    getSession: () => ({
      running,
      stake,
      sessionPl,
      consecutiveLosses,
      contractIds: [...botContractIds],
    }),
    isRunning: () => running,
    start(cfg) {
      config = { ...cfg };
      const win = Number(config.winAmount ?? config.baseStake ?? 1);
      stake = win;
      sessionPl = 0;
      consecutiveLosses = 0;
      busy = false;
      botContractIds.clear();
      running = true;
      log('Bot started', 'system');
      log(
        `Params: ${config.symbol || '—'} · pred ${config.prediction ?? '—'} · stake ${stake} · TP ${config.takeProfit} · SL ${config.stopLoss}`,
        'system',
      );
    },
    stop(reason = 'Bot stopped') {
      running = false;
      busy = false;
      log(reason, 'system');
    },
    noteSettlement({ contractId, profit }) {
      if (contractId && !botContractIds.has(String(contractId))) return;
      const p = Number(profit) || 0;
      sessionPl += p;
      if (p >= 0) {
        consecutiveLosses = 0;
        stake = Number(config?.winAmount ?? config?.baseStake ?? 1);
        log(`Win ${p >= 0 ? '+' : ''}${p.toFixed(2)} · session P/L ${sessionPl.toFixed(2)}`, 'trade');
      } else {
        consecutiveLosses += 1;
        const mult = Number(config?.martingale ?? config?.multiplier ?? 1);
        if (config?.useMartingale !== false && mult > 1) {
          stake = Math.min(stake * mult, currentMaxStake());
          log(`Loss ${p.toFixed(2)} · martingale stake → ${stake.toFixed(2)}`, 'trade');
        } else {
          log(`Loss ${p.toFixed(2)} · session P/L ${sessionPl.toFixed(2)}`, 'trade');
        }
      }
      if (config && sessionPl >= Number(config.takeProfit)) {
        running = false;
        log('Take profit reached — bot stopped', 'system');
      } else if (config && sessionPl <= -Number(config.stopLoss)) {
        running = false;
        log('Stop loss reached — bot stopped', 'system');
      }
    },
    async tick() {
      if (!running || !config || busy) return;
      if (sessionPl >= Number(config.takeProfit)) {
        this.stop('Take profit reached — bot stopped');
        return;
      }
      if (sessionPl <= -Number(config.stopLoss)) {
        this.stop('Stop loss reached — bot stopped');
        return;
      }

      busy = true;
      try {
        const contractType = pickContractType();
        const amount = Math.min(stake, currentMaxStake());
        log(`Analyzing… ${contractType}${config.prediction != null ? ` pred ${config.prediction}` : ''} stake ${amount.toFixed(2)}`);

        const params = {
          contractType,
          amount,
          duration: config.durationTicks || config.durationMin || 1,
          durationUnit: (config.durationTicks || config.tradeKind === 'digit_match_differ') ? 't' : 'm',
          symbol: config.symbol,
        };
        if (config.prediction != null && (contractType === 'DIGITMATCH' || contractType === 'DIGITDIFF'
          || contractType === 'DIGITOVER' || contractType === 'DIGITUNDER')) {
          params.barrier = String(config.prediction);
        }

        const proposal = await onProposal(params);
        const id = proposal.proposal?.id;
        const price = proposal.proposal?.ask_price;
        if (!id || price == null) throw new Error('No proposal');

        log(`Buying ${contractType} @ ${Number(price).toFixed(2)}…`);
        const buy = await onBuy(String(id), price);
        const contractId = buy.buy?.contract_id;
        if (contractId) botContractIds.add(String(contractId));
        onContractOpened?.({ contractId, contractType, buyPrice: price, symbol: config.symbol, amount });
        log(`Bought #${contractId || '—'} ${contractType} stake ${Number(price).toFixed(2)}`, 'trade');
      } catch (err) {
        log(`Error: ${err.message}`, 'error');
        if (!config.restartBuySellOnError && !config.restartLastTradeOnError) {
          /* continue loop by default when restart last trade is on */
        }
        if (config.restartBuySellOnError === false && config.restartLastTradeOnError === false) {
          this.stop('Stopped after error');
        }
      } finally {
        busy = false;
      }
    },
  };
}

export function evaluateAutomatedRule(type, rule, stream) {
  if (type === 'even_pct') {
    const pct = rule.side === 'DIGITEVEN' ? stream.evenPct : stream.oddPct;
    return pct >= rule.threshold;
  }
  if (type === 'over_under_digits') {
    const digits = (stream.digitHistory || []).slice(-rule.lookback);
    if (digits.length < rule.lookback) return false;
    if (rule.side === 'DIGITUNDER') {
      return digits.every((d) => d < rule.compareDigit);
    }
    return digits.every((d) => d > rule.compareDigit);
  }
  return false;
}

export function computeSwingLevels(quotes, lookback = 50) {
  const slice = quotes.slice(-lookback);
  if (slice.length < 5) return { swingHigh: null, swingLow: null };
  return { swingHigh: Math.max(...slice), swingLow: Math.min(...slice) };
}

export function createAutomatedRunner({ getProposal, buyContract, onTrade }) {
  return {
    async execute({ symbol, contractType, stake, ticks, barrier, currency }) {
      const params = {
        contractType,
        amount: stake,
        duration: ticks,
        durationUnit: 't',
        symbol,
        currency,
      };
      if (barrier != null && !['DIGITEVEN', 'DIGITODD'].includes(contractType)) {
        params.barrier = barrier;
      }
      const proposal = await getProposal(params);
      const id = proposal.proposal?.id;
      const price = proposal.proposal?.ask_price;
      if (!id || price == null) throw new Error('No proposal');
      const buy = await buyContract(String(id), price);
      onTrade?.({
        contractId: buy.buy?.contract_id,
        contractType,
        buyPrice: price,
        symbol,
      });
    },
  };
}
