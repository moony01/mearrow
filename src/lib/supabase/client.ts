/**
 * Supabase Browser Client (싱글톤 패턴)
 *
 * 브라우저 환경에서 사용하는 Supabase 클라이언트입니다.
 * SSG/CSR 마이그레이션: API Routes 대신 브라우저에서 직접 Supabase를 호출합니다.
 *
 * 주의: MEARROW는 output: 'export' (정적 빌드)를 사용하므로
 * @supabase/ssr의 createBrowserClient 대신 @supabase/supabase-js의 createClient를 사용합니다.
 * - createBrowserClient: 쿠키 기반 세션 저장 → 서버 미들웨어 필요 (정적 빌드 비호환)
 * - createClient: localStorage 기반 세션 저장 → 정적 빌드 호환
 *
 * 특징:
 * - 싱글톤 패턴으로 인스턴스 재사용 (메모리 효율)
 * - NEXT_PUBLIC_* 환경변수만 사용 (클라이언트 안전)
 * - RLS(Row Level Security) 정책에 의존
 * - PKCE 플로우로 OAuth 인증 (detectSessionInUrl 활성화)
 *
 * @example
 * ```typescript
 * import { supabase } from '@/lib/supabase/client';
 *
 * const { data, error } = await supabase
 *   .from('companies')
 *   .select('*')
 *   .order('firepower', { ascending: false });
 * ```
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

/** Supabase 클라이언트 타입을 re-export */
export type { SupabaseClient };

/** 싱글톤 인스턴스 */
let supabaseInstance: SupabaseClient | null = null;

type NoopQueryResult = {
  data: unknown;
  error: Error | null;
  count: number;
};

interface NoopQueryOptions {
  /** RPC calls cannot be treated as successful when Supabase is unavailable. */
  rejectMutations?: boolean;
}

/**
 * Keep the static shell usable when local Supabase variables are absent.
 *
 * The old fallback returned a callable proxy for `from`, but the value
 * returned by `from()` did not implement the query-builder methods such as
 * `select()` or `eq()`. That made every public data hook throw during local
 * browser checks instead of rendering its empty/error state.
 */
function createNoopQuery({ rejectMutations = false }: NoopQueryOptions = {}) {
  let returnsSingleRow = false;
  let isMutation = rejectMutations;

  const target = {
    then(
      onFulfilled?: (result: NoopQueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      const result: NoopQueryResult = {
        data: returnsSingleRow ? null : [],
        error: isMutation ? new Error('Supabase is not configured.') : null,
        count: 0,
      };
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };

  const query = new Proxy(target as unknown as Record<string, unknown>, {
    get(_target, property) {
      if (property === 'then') return target.then;
      if (typeof property === 'symbol') return undefined;

      return () => {
        if (['delete', 'insert', 'update', 'upsert'].includes(String(property))) {
          isMutation = true;
        }
        if (property === 'single' || property === 'maybeSingle') {
          returnsSingleRow = true;
        }
        return query;
      };
    },
  });

  return query;
}

function createNoopSupabaseClient() {
  const configurationError = () => new Error('Supabase is not configured.');
  const noopAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
      error: null,
    }),
    signOut: async () => ({ error: null }),
    signInWithOAuth: async () => ({
      data: { provider: null, url: null },
      error: configurationError(),
    }),
    signInWithPassword: async () => ({
      data: { session: null, user: null },
      error: configurationError(),
    }),
    signUp: async () => ({
      data: { session: null, user: null },
      error: configurationError(),
    }),
    resetPasswordForEmail: async () => ({ error: configurationError() }),
    updateUser: async () => ({ data: { user: null }, error: configurationError() }),
    exchangeCodeForSession: async () => ({
      data: { session: null, user: null },
      error: configurationError(),
    }),
  };

  const noopStorage = {
    from: () => ({
      getPublicUrl: () => ({ data: { publicUrl: '' }, error: null }),
      upload: async () => ({ data: null, error: configurationError() }),
      remove: async () => ({ data: null, error: configurationError() }),
    }),
  };

  const noopFunctions = {
    invoke: async () => ({ data: null, error: configurationError() }),
  };

  return {
    auth: noopAuth,
    from: () => createNoopQuery(),
    rpc: () => createNoopQuery({ rejectMutations: true }),
    storage: noopStorage,
    functions: noopFunctions,
  } as unknown as SupabaseClient;
}

/**
 * Supabase 브라우저 클라이언트 생성/반환 (싱글톤)
 *
 * 최초 호출 시에만 인스턴스를 생성하고, 이후에는 기존 인스턴스를 반환합니다.
 * localStorage를 사용하여 세션을 저장하므로 정적 빌드에서도 동작합니다.
 *
 * @returns Supabase 클라이언트 인스턴스 (환경변수 누락 시 null as SupabaseClient)
 */
export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[Supabase Client] 환경변수가 설정되지 않았습니다. ' +
        'NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요.',
    );
    // SSG 빌드와 로컬 브라우저 확인에서 데이터 훅이 조용한 빈 상태를
    // 렌더링하도록 체인 가능한 no-op 클라이언트를 반환합니다.
    supabaseInstance = createNoopSupabaseClient();
    return supabaseInstance;
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      /** PKCE 플로우 사용 (정적 빌드 호환) */
      flowType: 'pkce',
      /** localStorage에 세션 저장 (서버 미들웨어 불필요) */
      persistSession: true,
      /**
       * URL 세션 자동 감지 비활성화
       * - 콜백 페이지(CallbackClient)에서 수동 교환으로 일원화
       * - 자동 교환과 수동 교환의 경쟁 상태(race condition) 방지
       */
      detectSessionInUrl: false,
      /**
       * AuthProvider가 초기 세션을 확인한 뒤 만료 시간을 기준으로 갱신합니다.
       * SDK 시작 복구는 거절된 refresh token을 console.error로 출력하므로
       * stale 세션을 앱이 분류·정리한 다음 갱신을 시작합니다.
       */
      autoRefreshToken: false,
    },
  });

  return supabaseInstance;
}

/**
 * Supabase 클라이언트 인스턴스 (편의용 export)
 *
 * 주의: 서버 사이드(SSR/SSG 빌드 시)에서는 환경변수가 없을 수 있으므로
 * 빌드 타임에서는 getSupabase() 함수를 사용하세요.
 *
 * @example
 * ```typescript
 * // 클라이언트 컴포넌트에서 직접 사용
 * import { supabase } from '@/lib/supabase/client';
 * const { data } = await supabase.from('companies').select('*');
 * ```
 */
export const supabase =
  typeof window !== 'undefined' ? getSupabase() : (null as unknown as SupabaseClient);

/**
 * 레거시 호환용: createClient 함수
 *
 * @deprecated getSupabase() 또는 supabase를 직접 사용하세요.
 */
export function createClient(): SupabaseClient {
  return getSupabase();
}
