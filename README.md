# Veredillas FM Website

Este es el sitio web oficial para el podcast escolar Veredillas FM.

## 🚀 Cómo empezar

1.  Instala dependencias:
    ```bash
    npm install
    ```
2.  Inicia el servidor de desarrollo:
    ```bash
    npm run dev
    ```

## 🎙️ Cómo publicar un nuevo episodio

1.  Ve a la carpeta `src/content/ep/`.
2.  Crea un nuevo archivo `.md` (ejemplo: `entrevista-director.md`).
3.  Copia el siguiente formato:

```markdown
---
title: "Título del Episodio"
description: "Breve descripción de qué trata este episodio."
pubDate: 2025-11-20
author: "Equipo de Radio"
spotifyUrl: "https://open.spotify.com/episode/TU_ENLACE_DE_SPOTIFY"
duration: "25 min"
season: 1
episode: 3
---

Aquí escribe las notas del programa. Puedes usar:
- Listas
- **Negritas**
- Enlaces
```

4.  Guarda el archivo. ¡El episodio aparecerá automáticamente en la web!

## 🎨 Personalización

-   **Estilos Globales**: `src/styles/global.css`
-   **Componentes**: `src/components/`
-   **Páginas**: `src/pages/`
