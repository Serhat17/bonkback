import { supabase } from '@/integrations/supabase/client';

let cachedBaseDomain: string | null = null;

export async function getBaseDomain(sb?: any): Promise<string> {
  // Remove dependency on VITE_ environment variables as they're not supported
  // Use direct fallback approach instead

  // 2) Cached runtime
  if (cachedBaseDomain) return cachedBaseDomain;

  // 3) DB (works in client or server if RLS allows SELECT)
  const supabaseClient = sb || supabase;
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('value')
      .eq('key', 'base_domain')
      .single();
    
    if (!error && data?.value) {
      cachedBaseDomain = (typeof data.value === 'string') ? data.value : String(data.value);
      return cachedBaseDomain;
    }
  } catch (error) {
    console.warn('Failed to fetch base domain from DB:', error);
  }

  // 4) Browser fallback
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // 5) Last resort
  return 'https://bonkback.com';
}

export async function buildReferralUrl(code: string, sb?: any): Promise<string> {
  const base = await getBaseDomain(sb);
  return `${base}/r/${encodeURIComponent(code)}`;
}

export async function buildAuthRedirectUrl(path: string = '/auth/callback', sb?: any): Promise<string> {
  const base = await getBaseDomain(sb);
  return `${base}${path}`;
}

// Clear cached domain when needed (for testing or admin changes)
export function clearDomainCache(): void {
  cachedBaseDomain = null;
}