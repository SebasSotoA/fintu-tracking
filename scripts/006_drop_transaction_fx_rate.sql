-- Migration: Remove unused transaction_fx_rate from trades
-- Run after 002_dual_track_fee_system.sql
-- FX for deposits lives on cash_flows.fx_rate; daily reference on fx_rates.

ALTER TABLE trades DROP COLUMN IF EXISTS transaction_fx_rate;
