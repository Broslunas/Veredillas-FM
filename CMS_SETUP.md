# Configuración del CMS (Keystatic)

## 🚨 Solución al error "Authorization Failed"

Si después de corregir la URL sigues viendo "Authorization failed" después de hacer login en GitHub, el problema es casi seguro el **Client Secret** en Vercel.

### Pasos Definitivos:

1. **Igualar Dominios**:
   - He actualizado tu configuración de Astro para usar `https://www.veredillasfm.es` (con www).
   - Asegúrate de que en Vercel > Settings > Domains, el dominio principal sea `www.veredillasfm.es`.

2. **Regenerar Secret**:
   - Ve a tu GitHub App (Settings > Developer settings > GitHub Apps).
   - En **Client secrets**, dale a **Generate a new client secret**.
   - Copia el nuevo valor.

3. **Actualizar Vercel**:
   - Ve a tu proyecto en Vercel > Settings > Environment Variables.
   - Busca `KEYSTATIC_GITHUB_CLIENT_SECRET`.
   - **Edítala** y pega el nuevo valor. Asegúrate de **no copiar espacios en blanco** al principio o al final.
   - Dale a **Save**.
   - **IMPORTANTE**: Ve a la pestaña **Deployments** en Vercel y haz **Redeploy** en el último commit para que coja la nueva variable.

### Resumen de Configuración Correcta

- **GitHub App Callback**: `https://www.veredillasfm.es/api/keystatic/github/oauth/callback`
- **Vercel Env Vars**:
  - `KEYSTATIC_GITHUB_CLIENT_ID`: (Tu ID de GitHub)
  - `KEYSTATIC_GITHUB_CLIENT_SECRET`: (Tu Secret NUEVO)
  - `KEYSTATIC_SECRET`: (Un texto largo al azar)
