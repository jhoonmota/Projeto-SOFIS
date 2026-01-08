-- Migration: Add inactive_contract field to clients table
-- Date: 2026-01-08
-- Description: Adds JSONB field to store inactive contract information (date, notes, setAt)

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS inactive_contract JSONB DEFAULT NULL;

-- Add comment to document the field structure
COMMENT ON COLUMN clients.inactive_contract IS 'Stores inactive contract information as JSON: {date: "YYYY-MM-DD", notes: "text", setAt: "ISO timestamp"}';
