-- Add payment_method column to transactions for expense payment types
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;

-- Add payment_method enum constraint (optional but helpful)
-- Using text with app-level validation for flexibility