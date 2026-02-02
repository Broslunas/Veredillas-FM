# Configuración del CMS (Keystatic)

Se ha implementado **Keystatic** como sistema CMS para gestionar Blogs, Episodios e Invitados.
Keystatic funciona de dos formas:

1. **Local**: Al ejecutar `npm run dev`, puedes ir a `http://localhost:4321/keystatic` y editar el contenido. Los cambios se guardan directamente en tu disco duro (en la carpeta `src/content`).
2. **Producción (Vercel)**: Para que funcione en producción y pueda editar archivos en GitHub desde la web, necesitas configurar una GitHub App.

## Pasos para configurar Producción

1. Ve a los ajustes de tu cuenta de GitHub (o organización): **Settings** > **Developer settings** > **GitHub Apps**.
2. Haz clic en **New GitHub App**.
3. Rellena los datos:
   - **GitHub App name**: `Veredillas FM CMS` (o similar).
   - **Homepage URL**: `https://veredillasfm.es` (tu dominio de producción).
   - **Callback URL**: `https://veredillasfm.es/keystatic/oauth/callback` (asegúrate de que esta URL sea correcta).
   - Desactiva "Expire user authorization tokens".
4. **Permissions**:
   - `Content`: **Read & Write**
   - `Metadata`: **Read-only**
   - `Pull requests`: **Read & Write** (opcional, si quieres usar PRs).
5. Guarda la App.
6. Obtendrás un **Client ID** y un **Client Secret** (genera un nuevo secret).

## Variables de Entorno

Añade estas variables a tu proyecto en **Vercel**:

```bash
KEYSTATIC_GITHUB_CLIENT_ID=tu_client_id
KEYSTATIC_GITHUB_CLIENT_SECRET=tu_client_secret
KEYSTATIC_SECRET=una_cadena_aleatoria_larga
```

(Puedes generar un secret aleatorio con `openssl rand -base64 32`).

## Uso

Una vez configurado y desplegado, entra en `/dashboard/admin/content` y haz clic en **Gestionar CMS**.
