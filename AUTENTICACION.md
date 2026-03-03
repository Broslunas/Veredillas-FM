# 🔐 Sistema de Autenticación con Google OAuth

Este documento explica cómo configurar y usar el sistema de autenticación de usuarios en Veredillas FM.

## 📋 Características

- ✅ **Autenticación Multi-método**: Google OAuth 2.0 y Magic Link (Email)
- ✅ Gestión de sesiones seguras con JWT
- ✅ Perfiles de usuario expansibles y analíticas de escucha
- ✅ Almacenamiento ágil en MongoDB
- ✅ Diseño responsive y premium acorde a la marca

## 🚀 Configuración

### 1. Crear credenciales de Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Navega a **APIs & Services** > **Credentials**
4. Haz clic en **Create Credentials** > **OAuth client ID**
5. Selecciona **Web application**
6. Configura los **Authorized redirect URIs**:
   - Desarrollo: `http://localhost:4321/api/auth/google/callback`
   - Producción: `https://www.veredillasfm.es/api/auth/google/callback`
7. Copia el **Client ID** y **Client Secret**

### 2. Configurar variables de entorno

Actualiza tu archivo `.env` con las credenciales:

```bash
# Google OAuth
GOOGLE_CLIENT_ID="tu-client-id-aqui.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret-aqui"

# JWT Secret (genera una clave segura)
JWT_SECRET="tu-clave-secreta-muy-segura-y-aleatoria"
```

> 💡 **Tip**: Puedes generar un JWT_SECRET seguro ejecutando:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 3. Configurar Email (Magic Link)

Asegúrate de configurar las credenciales de correo electrónico, habitualmente Mailjet (YA CREADO) o SMTP:

```bash
# Envío de correos para Magic Link
MAILJET_PUBLIC_KEY="tu-public-key"
MAILJET_PRIVATE_KEY="tu-private-key"
```

### 4. Verificar MongoDB

Asegúrate de que tu variable `MONGODB_URI` esté configurada correctamente en el `.env`.

## 📁 Estructura del Sistema

```
src/
├── models/
│   └── User.ts              # Modelo de usuario en MongoDB
├── lib/
│   ├── auth.ts              # Utilidades de autenticación (JWT, OAuth)
│   └── mongodb.ts           # Conexión a MongoDB
├── pages/
│   ├── api/
│   │   └── auth/
│   │       ├── google/
│   │       │   ├── login.ts      # Inicia OAuth flow
│   │       │   └── callback.ts   # Maneja callback de Google
│   │       ├── email/
│   │       │   ├── send-magic-link.ts # Envía email con token
│   │       │   └── verify.ts          # Verifica el token de email
│   │       ├── logout.ts         # Cierra sesión
│   │       ├── me.ts             # Obtiene usuario actual
│   │       └── update-profile.ts # Actualiza perfil
│   └── perfil.astro         # Página de perfil y estadísticas de escucha
└── components/
    └── AuthButton.astro     # Botón interactivo de login/perfil en header
```

## 🔄 Flujo de Autenticación

### Método 1: Google OAuth
1. Usuario hace clic en "Entrar con Google"
2. Se redirige a Google OAuth
3. Usuario autoriza la aplicación
4. Google redirige a `/api/auth/google/callback`
5. Se crea o actualiza el usuario en MongoDB
6. Se establece la sesión con JWT vía cookie y redirige a `/perfil`

### Método 2: Magic Link (Email)
1. Usuario introduce su dirección de Email y hace clic en "Entrar con Email"
2. Se genera un Magic Link transitorio y se envía a su bandeja de entrada
3. El usuario hace clic en el enlace adjunto en su correo
4. Es redirigido a `/api/auth/email/verify?token=...`
5. Al validarse, se crea/actualiza en MongoDB, se establece el JWT y redirige a `/perfil`

2. **Sesión persistente**:
   - El JWT token se almacena en una cookie HTTP-only
   - Válido por 30 días
   - Se verifica en cada petición a endpoints protegidos

3. **Logout**:
   - Se elimina la cookie de autenticación
   - Se redirige a la página principal

## 🎨 Componentes del UI

### AuthButton
Componente dinámico que muestra:
- **No autenticado**: Botón "Iniciar Sesión"
- **Autenticado**: Avatar del usuario + nombre (enlaza a `/perfil`)

### Página de Perfil
Permite al usuario:
- Ver su información básica (nombre, email, foto vinculada a Google o autogenerada)
- Editar su nombre y nombre de usuario único
- Manejar su biografía personal
- **Ver panel de estadísticas de escucha minuciosas** de episodios
- Ver fecha de registro
- Cerrar sesión

## 🔒 Seguridad

- ✅ Cookies HTTP-only (no accesibles desde JavaScript)
- ✅ Cookies con `SameSite=lax` (protección CSRF)
- ✅ HTTPS en producción
- ✅ JWT con expiración de 30 días
- ✅ Validación de datos en backend

## 🛠️ API Endpoints

### `GET /api/auth/google/login`
Inicia el flujo de OAuth con Google.

### `GET /api/auth/google/callback`
Callback de Google OAuth. Crea/actualiza usuario y establece sesión.

**Query params**:
- `code`: Authorization code de Google
- `error`: Error si el usuario rechazó

### `GET /api/auth/email/verify`
Valida un Magic Link proporcionado a través de correo electrónico y autoriza la sesión del usuario.

**Query params**:
- `token`: JWT seguro que fue enviado al E-Mail

### `GET /api/auth/me`
Obtiene el usuario actual autenticado.

**Response**:
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://...",
    "bio": "...",
    "createdAt": "2026-01-17T...",
    "lastLogin": "2026-01-17T..."
  }
}
```

### `POST /api/auth/update-profile`
Actualiza el perfil del usuario autenticado.

**Body**:
```json
{
  "name": "Nuevo Nombre",
  "bio": "Nueva biografía"
}
```

**Response**:
```json
{
  "success": true,
  "user": { /* usuario actualizado */ }
}
```

### `GET /api/auth/logout`
Cierra la sesión del usuario.

## 🧪 Testing

### Desarrollo Local

1. Inicia el servidor de desarrollo:
```bash
npm run dev
```

2. Visita `http://localhost:4321`
3. Haz clic en "Iniciar Sesión"
4. Completa el flujo de OAuth
5. Verifica que llegues a `/perfil`

### Producción

1. Despliega a Vercel:
```bash
npm run build
```

2. Configura las variables de entorno en Vercel:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `JWT_SECRET`
   - `MONGODB_URI`

3. Verifica que la URL de callback esté configurada en Google Console

## 🐛 Troubleshooting

### "redirect_uri_mismatch"
- Asegúrate de que la URL de callback coincida exactamente en Google Console
- Verifica que uses HTTP vs HTTPS correctamente

### "Invalid token"
- Verifica que `JWT_SECRET` sea el mismo en todos los entornos
- Limpia las cookies y vuelve a iniciar sesión

### Usuario no se guarda en MongoDB
- Verifica la conexión a MongoDB
- Revisa los logs del servidor para errores

## 📚 Referencias

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [JWT Introduction](https://jwt.io/introduction)
- [Mongoose Documentation](https://mongoosejs.com/)

## 🎉 ¡Listo!

El sistema de autenticación está completamente configurado. Los usuarios ahora pueden:
- Iniciar sesión con Google
- Ver y editar su perfil
- Mantener su sesión activa por 30 días
- Cerrar sesión cuando quieran

---

Desarrollado con ❤️ para Veredillas FM
