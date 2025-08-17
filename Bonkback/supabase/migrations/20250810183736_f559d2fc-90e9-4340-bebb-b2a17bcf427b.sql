-- Prevent privilege escalation on profiles via triggers
-- Idempotent: drop existing triggers if present, then create

-- 1) Primary guard: prevents users from changing their own role; allows admin RPC via application_name='admin_role_change'
DROP TRIGGER IF EXISTS trg_profiles_prevent_role_self_modification ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_role_self_modification
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_self_modification();

-- 2) Companion guard: redundant check that only admins can change roles
DROP TRIGGER IF EXISTS trg_profiles_enforce_role_guard ON public.profiles;
CREATE TRIGGER trg_profiles_enforce_role_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_guard();