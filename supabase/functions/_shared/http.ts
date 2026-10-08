import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ALLOWED_ORIGIN = Deno.env.get('VISUAL_MATCH_ALLOWED_ORIGIN') ?? '*';

export const SERVICE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'access-control-allow-origin': ALLOWED_ORIGIN,
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
      'access-control-allow-methods': 'POST, OPTIONS',
      'content-type': 'application/json; charset=utf-8',
      vary: 'origin',
    },
  });
}

export function fail(code: string, status: number) {
  return json({ error: code }, status);
}

export function optionsResponse() {
  return new Response('ok', {
    headers: {
      'access-control-allow-origin': ALLOWED_ORIGIN,
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
      'access-control-allow-methods': 'POST, OPTIONS',
      vary: 'origin',
    },
  });
}

export function getRequiredSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  };
}

export async function authenticateRequest(request: Request) {
  const env = getRequiredSupabaseEnv();
  if (!env) return null;

  const authorization = request.headers.get('authorization');
  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) return null;

  const userClient = createClient(env.url, env.anonKey, {
    // Supabase's auth client installs its own `Authorization` header for the
    // anon key. Use the canonical casing here so the request token replaces
    // that default header instead of being merged as a second, lowercase key.
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;

  return { env, authorization, user: data.user };
}

export function createServiceClient() {
  const env = getRequiredSupabaseEnv();
  if (!env) return null;
  return createClient(env.url, env.serviceRoleKey);
}
