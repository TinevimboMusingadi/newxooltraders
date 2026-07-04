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
