CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable('metric_samples', 'effective_at', if_not_exists => TRUE);
