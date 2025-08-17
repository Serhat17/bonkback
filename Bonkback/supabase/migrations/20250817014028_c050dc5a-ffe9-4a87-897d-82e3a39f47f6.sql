-- Fix the initialize_user_key_vault function that's causing the derivation_path error
-- This function is triggered on user creation and is still referencing the wrong column

-- First, let's see what the function looks like
SELECT p.proname, p.prosrc 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' AND p.proname = 'initialize_user_key_vault';

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS initialize_key_vault_on_user_creation ON auth.users;
DROP FUNCTION IF EXISTS public.initialize_user_key_vault() CASCADE;

-- Create a fixed version that uses the correct column name
CREATE OR REPLACE FUNCTION public.initialize_user_key_vault()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  new_derivation_path text;
BEGIN
  -- Generate derivation path for the new user
  new_derivation_path := 'm/44''/501''/' || NEW.id::text || '''/0''';
  
  -- Insert into solana_key_vault with the correct column name
  INSERT INTO public.solana_key_vault (
    user_id, 
    version, 
    is_active, 
    encrypted_derivation_path, 
    last_rotation
  ) VALUES (
    NEW.id,
    1,
    true,
    -- Use the encryption function
    public.encrypt_derivation_path(new_derivation_path, NEW.id),
    now()
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  INSERT INTO public.error_logs (
    id, user_id, error_message, severity, component, stack_trace
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    'initialize_user_key_vault failed: ' || SQLERRM,
    'error',
    'initialize_user_key_vault',
    SQLSTATE
  );
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER initialize_key_vault_on_user_creation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.initialize_user_key_vault();