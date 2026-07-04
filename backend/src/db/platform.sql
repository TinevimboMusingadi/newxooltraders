-- Optional tables for bot configs and copy trading (Postgres)
CREATE TABLE IF NOT EXISTS bot_configs (
  id varchar PRIMARY KEY,
  user_key varchar NOT NULL,
  name varchar NOT NULL,
  config json NOT NULL,
  symbol varchar,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copy_providers (
  code varchar PRIMARY KEY,
  user_key varchar NOT NULL,
  account_id varchar NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copy_subscriptions (
  id varchar PRIMARY KEY,
  provider_code varchar NOT NULL,
  follower_key varchar NOT NULL,
  follower_account_id varchar NOT NULL,
  risk_pct integer DEFAULT 50,
  active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copy_jobs (
  id varchar PRIMARY KEY,
  follower_account_id varchar NOT NULL,
  follower_key varchar NOT NULL,
  provider_code varchar,
  risk_pct integer DEFAULT 50,
  trade json NOT NULL,
  status varchar DEFAULT 'queued',
  result json,
  created_at timestamp DEFAULT now(),
  completed_at timestamp
);

CREATE TABLE IF NOT EXISTS bot_runs (
  id varchar PRIMARY KEY,
  user_key varchar NOT NULL,
  bot_config_id varchar REFERENCES bot_configs(id),
  deriv_run_id varchar,
  strategy_id varchar NOT NULL,
  status varchar DEFAULT 'running',
  stats json,
  created_at timestamp DEFAULT now(),
  stopped_at timestamp
);
