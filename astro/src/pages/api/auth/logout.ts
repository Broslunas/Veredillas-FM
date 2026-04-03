import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  // Eliminar cookie de autenticación
  cookies.delete('auth-token', {
    path: '/'
  });

  // Redirigir a la página principal
  return redirect('/?auth=logout');
};
