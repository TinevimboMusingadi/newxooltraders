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
      log('Bot started');
    },
    stop() {
      running = false;
      log('Bot stopped');
    },
    async tick(signal) {
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
      try {
        const stake = config.useMartingale
          ? config.baseStake * Math.pow(config.multiplier, stats.losses)
          : config.baseStake;
        const contractType = config.contractType || 'CALL';
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
        log(`Trade #${stats.trades} stake ${stake}`);
      } catch (err) {
        log(`Error: ${err.message}`);
      }
    },
  };
}

export const BOT_PRESETS = [
  {
    id: 'speed-rise-fall',
    name: 'Speed Rise/Fall',
    config: { baseStake: 1, useMartingale: false, multiplier: 2, takeProfit: 10, stopLoss: 10, maxConsecutiveLosses: 3 },
  },
  {
    id: 'apex-martingale',
    name: 'Apex Martingale',
    config: { baseStake: 1, useMartingale: true, multiplier: 2, takeProfit: 50, stopLoss: 25, maxConsecutiveLosses: 5 },
  },
  {
    id: 'digit-even',
    name: 'Digit Even Hunter',
    config: { baseStake: 0.5, useMartingale: true, multiplier: 1.2, takeProfit: 20, stopLoss: 15, maxConsecutiveLosses: 4, contractType: 'DIGITEVEN', durationTicks: 1 },
  },
  {
    id: 'volatility-call',
    name: 'Volatility Rise',
    config: { baseStake: 1, useMartingale: false, multiplier: 2, takeProfit: 30, stopLoss: 20, maxConsecutiveLosses: 3, contractType: 'CALL', durationMin: 1 },
  },
];

export function evaluateAutomatedRule(type, rule, stream) {
  if (type === 'even_pct') {
    const pct = rule.side === 'DIGITEVEN' ? stream.evenPct : stream.oddPct;
    return pct >= rule.threshold;
  }
  if (type === 'over_under_digits') {
    const digits = (stream.evenOddHistory || []).slice(-rule.lookback);
    if (digits.length < rule.lookback) return false;
    return digits.every(() => stream.lastDigit != null && stream.lastDigit > rule.compareDigit);
  }
  return false;
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
      await buyContract(String(id), price);
      onTrade?.();
    },
  };
}
