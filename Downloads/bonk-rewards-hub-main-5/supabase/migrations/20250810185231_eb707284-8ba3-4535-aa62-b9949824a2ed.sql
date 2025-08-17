-- Ensure cashback release logic is applied automatically on insert
DROP TRIGGER IF EXISTS trg_cashback_transactions_apply_release ON public.cashback_transactions;
CREATE TRIGGER trg_cashback_transactions_apply_release
BEFORE INSERT ON public.cashback_transactions
FOR EACH ROW
EXECUTE FUNCTION public.apply_cashback_release_logic();