import { query, getOne, getMany } from '../pool.js';

export async function ensureTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS bot_configs (
      id varchar PRIMARY KEY, user_key varchar NOT NULL, name varchar NOT NULL,
      config json NOT NULL, symbol varchar, updated_at timestamp DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS copy_providers (
      code varchar PRIMARY KEY, user_key varchar NOT NULL, account_id varchar NOT NULL,
      created_at timestamp DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS copy_subscriptions (
      id varchar PRIMARY KEY, provider_code varchar NOT NULL,
      follower_key varchar NOT NULL, follower_account_id varchar NOT NULL,
      risk_pct integer DEFAULT 50, active boolean DEFAULT true, created_at timestamp DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS copy_jobs (
      id varchar PRIMARY KEY, follower_account_id varchar NOT NULL,
      follower_key varchar NOT NULL, provider_code varchar, risk_pct integer DEFAULT 50,
      trade json NOT NULL, status varchar DEFAULT 'queued', result json,
      created_at timestamp DEFAULT now(), completed_at timestamp
    );
    CREATE TABLE IF NOT EXISTS bot_runs (
      id varchar PRIMARY KEY, user_key varchar NOT NULL, bot_config_id varchar,
      deriv_run_id varchar, strategy_id varchar NOT NULL, status varchar DEFAULT 'running',
      stats json, created_at timestamp DEFAULT now(), stopped_at timestamp
    );
    CREATE TABLE IF NOT EXISTS trade_history (
      id varchar PRIMARY KEY,
      user_key varchar NOT NULL,
      account_id varchar,
      contract_id varchar,
      symbol varchar,
      contract_type varchar,
      buy_price numeric,
      sell_price numeric,
      profit numeric,
      source varchar DEFAULT 'app',
      status varchar DEFAULT 'open',
      meta json,
      created_at timestamp DEFAULT now(),
      closed_at timestamp
    );
    CREATE INDEX IF NOT EXISTS trade_history_user_idx ON trade_history (user_key, created_at DESC);
  `;
  await query(sql);
}

export const botConfigsDb = {
  async list(userKey) {
    return getMany('SELECT * FROM bot_configs WHERE user_key = $1 ORDER BY updated_at DESC', [userKey]);
  },
  async upsert(id, userKey, name, config, symbol) {
    await query(
      `INSERT INTO bot_configs (id, user_key, name, config, symbol, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (id) DO UPDATE SET name=$3, config=$4, symbol=$5, updated_at=now()`,
      [id, userKey, name, JSON.stringify(config), symbol],
    );
  },
  async remove(id) {
    await query('DELETE FROM bot_configs WHERE id = $1', [id]);
  },
};

export const copyDb = {
  async getProvider(userKey) {
    return getOne('SELECT * FROM copy_providers WHERE user_key = $1', [userKey]);
  },
  async createProvider(code, userKey, accountId) {
    await query(
      'INSERT INTO copy_providers (code, user_key, account_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [code, userKey, accountId],
    );
  },
  async getSubscriptions(followerKey) {
    return getMany('SELECT * FROM copy_subscriptions WHERE follower_key = $1 AND active = true', [followerKey]);
  },
  async subscribe(id, providerCode, followerKey, followerAccountId, riskPct) {
    await query(
      `INSERT INTO copy_subscriptions (id, provider_code, follower_key, follower_account_id, risk_pct)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, providerCode, followerKey, followerAccountId, riskPct],
    );
  },
  async unsubscribe(id) {
    await query('UPDATE copy_subscriptions SET active = false WHERE id = $1', [id]);
  },
  async getFollowers(providerCode) {
    return getMany(
      'SELECT * FROM copy_subscriptions WHERE provider_code = $1 AND active = true',
      [providerCode],
    );
  },
  async createJob(id, followerAccountId, followerKey, providerCode, riskPct, trade) {
    await query(
      `INSERT INTO copy_jobs (id, follower_account_id, follower_key, provider_code, risk_pct, trade)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, followerAccountId, followerKey, providerCode, riskPct, JSON.stringify(trade)],
    );
  },
  async getPendingJobs(followerAccountId, followerKey) {
    return getMany(
      'SELECT * FROM copy_jobs WHERE status = $1 AND follower_account_id = $2 AND follower_key = $3',
      ['queued', followerAccountId, followerKey],
    );
  },
  async completeJob(id, followerKey, result, failed) {
    await query(
      `UPDATE copy_jobs SET status = $1, result = $2, completed_at = now() WHERE id = $3 AND follower_key = $4`,
      [failed ? 'failed' : 'done', JSON.stringify(result), id, followerKey],
    );
  },
  async recentJobs(limit = 20) {
    return getMany('SELECT * FROM copy_jobs ORDER BY created_at DESC LIMIT $1', [limit]);
  },
};

export const tradeHistoryDb = {
  async list(userKey, accountId, limit = 100) {
    if (accountId) {
      return getMany(
        `SELECT * FROM trade_history
         WHERE user_key = $1 AND (account_id = $2 OR account_id IS NULL)
         ORDER BY created_at DESC LIMIT $3`,
        [userKey, accountId, limit],
      );
    }
    return getMany(
      'SELECT * FROM trade_history WHERE user_key = $1 ORDER BY created_at DESC LIMIT $2',
      [userKey, limit],
    );
  },
  async insert(entry) {
    await query(
      `INSERT INTO trade_history
        (id, user_key, account_id, contract_id, symbol, contract_type, buy_price, sell_price, profit, source, status, meta, created_at, closed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),$13)`,
      [
        entry.id,
        entry.userKey,
        entry.accountId,
        entry.contractId,
        entry.symbol,
        entry.contractType,
        entry.buyPrice,
        entry.sellPrice,
        entry.profit,
        entry.source,
        entry.status,
        entry.meta ? JSON.stringify(entry.meta) : null,
        entry.closedAt || null,
      ],
    );
  },
  async close(id, userKey, { sellPrice, profit, status, meta }) {
    const row = await getOne(
      `UPDATE trade_history
       SET sell_price = COALESCE($1, sell_price),
           profit = COALESCE($2, profit),
           status = $3,
           meta = COALESCE($4, meta),
           closed_at = now()
       WHERE id = $5 AND user_key = $6
       RETURNING *`,
      [
        sellPrice != null ? Number(sellPrice) : null,
        profit != null ? Number(profit) : null,
        status || 'closed',
        meta ? JSON.stringify(meta) : null,
        id,
        userKey,
      ],
    );
    return row;
  },
};
