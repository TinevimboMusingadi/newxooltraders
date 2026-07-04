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
        const proposal = await onProposal({ ...signal, amount: stake });
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
];
