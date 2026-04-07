# Guía de Integración: Alexa y Google Home para Veredillas FM

Este documento detalla la implementación de los endpoints para integrar Veredillas FM con asistentes de voz (Alexa y Google Home), permitiendo a los usuarios pedir el último episodio o buscar contenido por voz.

## Endpoints Creados

1.  **Alexa Skill**: `/api/alexa`
2.  **Google Home (Dialogflow)**: `/api/google`

### Lógica Implementada

- **Launch Request**: Bienvenida personalizada.
- **Último Episodio**: Recupera el episodio más reciente de la colección `episodios`.
- **Reproducción**: Envía la directiva `AudioPlayer.Play` (Alexa) o `mediaResponse` (Google) con la `audioUrl` del episodio.

---

## Configuración en Alexa Developer Console

Para que la skill funcione, debes seguir estos pasos en la [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask):

1.  **Crear nueva Skill**: "Custom Model".
2.  **Interaction Model**:
    - **Intents**:
        - `UltimoEpisodioIntent`: Frases como "pon el último episodio", "cuál es el nuevo podcast".
        - `PlayEpisodeIntent`: Con un slot `{episodio}` (tipo `AMAZON.SearchQuery`). Frases como "reproduce {episodio}".
3.  **Endpoint**:
    - Seleccionar **HTTPS**.
    - URL: `https://tu-dominio.fm/api/alexa`.
    - Seleccionar la opción: "My development endpoint is a sub-domain of a domain that has a wildcard certificate from a trusted certificate authority".

---

## Configuración en Google Actions / Dialogflow

1.  **Crear proyecto en Actions on Google**.
2.  **Definir Acciones**: Usar Dialogflow ES (Essentials).
3.  **Intents**:
    - `UltimoEpisodioIntent`.
    - `PlayEpisodeIntent` con parámetro `episodio` (tipo `@sys.any`).
4.  **Fulfillment**:
    - Habilitar Webhook.
    - URL: `https://tu-dominio.fm/api/google`.

---

## Próximos Pasos Sugeridos

- **Verificación de Seguridad**: Alexa requiere que el servidor verifique las firmas de las peticiones para que la skill sea publicada oficialmente. Se puede implementar usando la librería `ask-sdk-core` si se desea una validación completa de seguridad en producción.
- **Audio Directo**: Asegúrate de que las `audioUrl` en tu contenido sean enlaces directos a archivos `.mp3` u otros formatos compatibles (HTTPS obligatorio).
