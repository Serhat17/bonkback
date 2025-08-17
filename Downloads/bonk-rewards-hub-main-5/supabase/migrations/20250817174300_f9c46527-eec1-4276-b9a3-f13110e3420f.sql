-- Insert demo mode system setting
INSERT INTO public.system_settings (key, value, description, updated_by)
VALUES (
  'demo_mode_enabled',
  'true'::jsonb,
  'Controls whether demo features and debug panels are visible in the application',
  (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1)
)
ON CONFLICT (key) DO NOTHING;