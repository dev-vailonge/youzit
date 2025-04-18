-- Add unique constraint to user_id column
ALTER TABLE public.user_access
ADD CONSTRAINT user_access_user_id_key UNIQUE (user_id);

-- Add unique constraint to stripe_subscription_id column
ALTER TABLE public.user_access
ADD CONSTRAINT user_access_stripe_subscription_id_key UNIQUE (stripe_subscription_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_access_user_id ON public.user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_stripe_subscription_id ON public.user_access(stripe_subscription_id); 