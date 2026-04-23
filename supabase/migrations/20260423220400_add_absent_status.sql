DO $DO_BLOCK$
BEGIN
  -- Drop existing status check if it exists
  ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
  
  -- Re-add with ABSENT status included
  ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check 
    CHECK (status IN ('WAITING', 'CALLED', 'COMPLETED', 'ABSENT'));
END $DO_BLOCK$;
