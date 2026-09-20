import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ROTAS_PROTEGIDAS = ['/novo', '/empresa', '/painel'];
const ROTAS_SOMENTE_VISITANTE = ['/login', '/cadastro'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const rotaProtegida = ROTAS_PROTEGIDAS.some((rota) => pathname.startsWith(rota));
  const rotaSomenteVisitante = ROTAS_SOMENTE_VISITANTE.some((rota) => pathname.startsWith(rota));

  if (!user && rotaProtegida) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return comCookiesDe(response, NextResponse.redirect(url));
  }

  if (user && rotaSomenteVisitante) {
    const url = request.nextUrl.clone();
    url.pathname = '/novo';
    return comCookiesDe(response, NextResponse.redirect(url));
  }

  return response;
}

// `getUser()` pode renovar a sessão e gravar os novos cookies em `response`
// (via `setAll`, acima). Um redirect cria uma resposta nova — sem copiar os
// cookies, a renovação se perde e o cliente reenvia o refresh token já
// trocado, até o Supabase invalidar a sessão.
function comCookiesDe(origem: NextResponse, destino: NextResponse): NextResponse {
  origem.cookies
    .getAll()
    .forEach(({ name, value, ...options }) => destino.cookies.set(name, value, options));
  return destino;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
