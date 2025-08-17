-- Fix RLS policy for error_logs table to allow system inserts
-- The handle_new_user function needs to insert into error_logs during exceptions

-- Update the error_logs RLS policy to allow system functions to insert
DROP POLICY IF EXISTS "Only admins can access error logs" ON public.error_logs;

CREATE POLICY "Admins can manage error logs"
ON public.error_logs
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin'::text);

CREATE POLICY "System can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Check if there are any remaining functions that reference derivation_path incorrectly
-- Look for any functions that might still reference the wrong column name

-- Check for any edge functions or other code that might be causing the derivation_path error
-- First, let's see if there are any remaining function definitions that reference derivation_path

SELECT 
  p.proname as function_name,
  p.prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.prosrc ILIKE '%derivation_path%'
  AND p.prosrc NOT ILIKE '%encrypted_derivation_path%';

-- Also check if there are any triggers still using the old function reference
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');