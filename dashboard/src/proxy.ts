import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function unauthorized(): NextResponse {
  return new NextResponse('Autenticación requerida', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Dashboard Blue Drop"' },
  });
}

export function proxy(request: NextRequest) {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASS;

  // Sin credenciales configuradas no forzamos login (útil en desarrollo local).
  if (!user || !pass) return NextResponse.next();

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) return unauthorized();

  const decoded = Buffer.from(authHeader.slice('Basic '.length), 'base64').toString('utf-8');
  const separatorIndex = decoded.indexOf(':');
  const reqUser = decoded.slice(0, separatorIndex);
  const reqPass = decoded.slice(separatorIndex + 1);

  if (reqUser !== user || reqPass !== pass) return unauthorized();

  return NextResponse.next();
}

export const config = {
  // Los archivos estáticos públicos (logo, favicon, etc.) no llevan datos sensibles;
  // se excluyen para que el propio optimizador de imágenes de Next.js pueda leerlos
  // sin toparse con el login.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
