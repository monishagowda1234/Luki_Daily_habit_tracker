-- The phone number is the sign-in identity and the only number Luki may call/text,
-- so users can change their name but never their phone.
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (name, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
DROP POLICY IF EXISTS "Own profile insert" ON public.profiles;
GRANT ALL ON public.phone_calls TO service_role;
GRANT SELECT ON public.phone_calls TO authenticated;