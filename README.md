# 🎙️ Veredillas FM

<div align="center">

![Veredillas FM Logo](public/logo.webp)

**La plataforma digital oficial del IES Veredillas**

Una ecosistema de medios estudiantil moderno, interactivo y social. Hecho por alumnos, para el mundo.

[![Astro](https://img.shields.io/badge/Astro-5.18-BC52EE?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploys-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Ver Demo](https://veredillasfm.es) · [Reportar Bug](https://github.com/Broslunas/veredillas-fm/issues) · [Solicitar Feature](https://github.com/Broslunas/veredillas-fm/issues)

</div>

---

## 📖 Tabla de Contenidos

- [🎯 Sobre el Proyecto](#-sobre-el-proyecto)
- [🎙️ Últimos Episodios](#️-últimos-episodios)
- [✨ Características Principales](#-características-principales)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [🚀 Comenzando](#-comenzando)
- [📂 Estructura del Proyecto](#-estructura-del-proyecto)
- [🎨 Guía de Desarrollo](#-guía-de-desarrollo)
- [📱 PWA & Mobile](#-pwa--mobile)
- [🔍 SEO & Open Graph](#-seo--open-graph)
- [🤝 Contribuir](#-contribuir)
- [👥 Equipo](#-equipo)
- [📄 Licencia](#-licencia)

---

## 🎯 Sobre el Proyecto

**Veredillas FM** ha evolucionado de ser un simple podcast escolar a una plataforma digital completa de medios estudiantiles. Desarrollada por estudiantes de 2º de Bachillerato del IES Veredillas, integra audio, video, interactividad social y gamificación en una experiencia web premium de alto rendimiento.

### ¿Qué nos hace diferentes?

- 🎓 **Identidad propia**: No usamos soluciones de terceros para el contenido; construimos nuestra propia plataforma.
- 🚀 **Enfoque en Rendimiento**: Gracias a Astro y SSR, la carga es instantánea en cualquier dispositivo.
- 🤝 **Comunidad Activa**: Los usuarios pueden interactuar, comentar, participar en quizzes y seguir su progreso.
- 🎨 **Estética de Vanguardia**: Diseño oscuro moderno con animaciones fluidas, efectos de glassmorphism y transiciones profesionales.

---

## 🎙️ Últimos Episodios

<!-- EPISODES_START -->
<!-- EPISODES_END -->

---

## ✨ Características Principales

### 🎧 Ecosistema de Contenido
- 📻 **Podcast & Vídeo**: Reproductor avanzado con soporte para Spotify (audio/video), HLS y archivos directos.
- 📝 **Blog Dinámico**: Artículos de opinión, noticias del instituto y reportajes especiales.
- 👥 **Directorio de Invitados**: Fichas detalladas de cada persona que pasa por nuestros micrófonos.
- 📸 **Galería Multimedia**: Colecciones visuales de los mejores momentos y eventos.
- 🗓️ **Calendario de Emisiones**: Agenda integrada para no perderse ningún estreno.

### 👤 Experiencia de Usuario (Social & Gamificación)
- 🔐 **Auth Premium**: Login con Google OAuth o Magic Link (Email) sin contraseñas.
- 📊 **Perfil Personal**: Estadísticas de escucha detalladas, historial y gestión de favoritos.
- 🏆 **Logros & Medallas**: Sistema de gamificación que premia la fidelidad de los oyentes.
- 🃏 **Cromos Digitales**: Coleccionables únicos basados en los hitos del proyecto.
- 💬 **Interacción en Vivo**: Chat integrado en tiempo real para emisiones en directo y comentarios verificables en posts.

### 🛠️ Herramientas Pro
- 🔍 **Búsqueda Inteligente**: Motor de búsqueda ultrarrápido con Fuse.js.
- 📧 **Newsletter Semanal**: Envío automatizado de novedades vía Mailjet.
- 🔔 **Web Push Notifications**: Alertas instantáneas en el navegador sobre nuevos episodios.
- 🤖 **IA & Accesibilidad**: Text-to-Speech (TTS) integrado para mayor accesibilidad del contenido.
- 🎬 **Studio Mode**: Espacio dedicado para la gestión y creación de contenido.

---

## 🛠️ Stack Tecnológico

### Frontend & UI
- **[Astro 5+](https://astro.build)** - Framework principal con arquitectura de islas.
- **[React](https://reactjs.org/)** - Para componentes interactivos y estados complejos.
- **[Tailwind CSS](https://tailwindcss.com/)** - Estilizado moderno y utilitario.
- **[GSAP](https://greensock.com/gsap/)** & **[Three.js](https://threejs.org/)** - Animaciones 2D/3D y efectos visuales.
- **[Lucide Astro](https://lucide.dev/)** - Iconografía SVG coherente.

### Backend & Datos
- **[Vercel SSR](https://vercel.com/docs/frameworks/astro)** - Adaptador para renderizado en servidor.
- **[MongoDB & Mongoose](https://www.mongodb.com/)** - Base de datos NoSQL para usuarios, comentarios y analíticas.
- **[JWT](https://jwt.io/)** - Gestión de sesiones seguras mediante cookies HTTP-only.
- **[Zod](https://zod.dev/)** - Validación rigurosa de esquemas de contenido y APIs.

### Servicios & APIs
- **[Mailjet](https://www.mailjet.com/)** - Gestión de newsletter y correos transaccionales.
- **[Google OAuth](https://developers.google.com/identity/protocols/oauth2)** - Autenticación de terceros.
- **[Satori](https://github.com/vercel/satori)** - Generación dinámica de imágenes Open Graph (OG).
- **[Web Push API](https://developer.mozilla.org/es/docs/Web/API/Push_API)** - Notificaciones nativas del navegador.

---

## 🚀 Comenzando

### Prerrequisitos

- **Node.js** v18+ 
- **MongoDB** (Instancia local o Atlas)
- **Cuentas de Servicio**: Google Cloud (Auth), Mailjet (Emails), Vercel (Hosting).

### Instalación Rápida

1. **Clonar y Entrar**
   ```bash
   git clone https://github.com/Broslunas/veredillas-fm.git
   cd veredillas-fm
   ```

2. **Instalar Dependencias**
   ```bash
   npm install
   ```

3. **Variables de Entorno**
   Crea un archivo `.env` basado en `.env.example`:
   ```bash
   MONGODB_URI="tu_url_de_mongo"
   GOOGLE_CLIENT_ID="tu_id"
   GOOGLE_CLIENT_SECRET="tu_secret"
   JWT_SECRET="una_clave_larga_y_segura"
   MJ_APIKEY_PUBLIC="tu_mailjet_key"
   MJ_API_SECRET="tu_mailjet_secret"
   # ... ver .env.example para la lista completa
   ```

4. **Ejecutar Desarrollo**
   ```bash
   npm run dev
   ```

### Scripts Disponibles

| Script | Descripción |
| :--- | :--- |
| `npm run dev` | Servidor de desarrollo con HMR (`localhost:4321`) |
| `npm run build` | Limpia, valida y construye para producción |
| `npm run preview` | Previsualiza localmente el build de producción |
| `npm run send:newsletter` | Trigger manual para el envío de la newsletter |
| `npm run update:readme` | Actualiza los últimos episodios en el README |

---

## 📂 Estructura del Proyecto

```
veredillas-fm/
├── src/
│   ├── components/       # Componentes Astro/React (UI, Player, Auth)
│   ├── content/          # Colecciones: blog, episodios, guests, gallery
│   ├── layouts/          # Plantillas base (SEO, HTML tags)
│   ├── lib/              # Utilidades: auth, mongodb, utils
│   ├── models/           # Esquemas Mongoose (User, Achievement, Card)
│   ├── pages/            # Enrutado SSR y endpoints de la API
│   │   ├── api/          # Backend: auth, clips, comments, push, etc.
│   │   ├── auth/         # Vistas de login/registro
│   │   ├── dashboard/    # Panel de administración/usuario
│   │   └── ...           # Vistas públicas (index, ep, blog, clips)
│   └── styles/           # Configuración global de CSS y temas
├── public/               # Assets estáticos, PWA manifest, service worker
├── scripts/              # Herramientas de automatización (newsletter, etc.)
├── astro.config.mjs      # Configuración central (integraciones, SSR)
└── package.json          # El corazón del proyecto
```

---

## 🎨 Guía de Desarrollo

### Añadir Contenido (Content Collections)

Para añadir nuevos episodios, posts o invitados, crea un archivo `.md` en la carpeta correspondiente de `src/content/`. 

#### Ejemplo: Nuevo Episodio
```markdown
---
title: "Nuestra Gran Entrevista"
description: "Un repaso a..."
pubDate: 2026-04-10
audioUrl: "https://..."
spotifyUrl: "https://..."
season: 2
episode: 5
tags: ["Entrevista", "Especial"]
quiz: [
  { question: "¿Quién fue el invitado?", options: ["A", "B", "C"], correctAnswer: 1 }
]
---
Cuerpo del episodio...
```

### Sistema de Temas
Utilizamos variables CSS centralizadas en `src/styles/global.css` para mantener la consistencia visual ("Theming System"), permitiendo cambios de color en caliente y soporte para modo oscuro avanzado.

---

## 📱 PWA & Mobile

Veredillas FM es una **Progressive Web App** diseñada con un enfoque *mobile-first*:

- 🔋 **Offline Ready**: Almacenamiento en caché de recursos críticos.
- 📲 **App Experience**: Instalable en Android e iOS sin pasar por la App Store.
- 🎨 **Tema Nativo**: Color de barra de estado y splash screen personalizadas.
- 🔊 **Background Playback**: Optimizado para seguir escuchando mientras usas otras apps.

---

## 🔍 SEO & Open Graph

Nuestra plataforma está optimizada para ser encontrada y compartida:

- 📊 **Metadatos Automáticos**: Cada página genera sus propios tags SEO (títulos, descripciones).
- 🖼️ **OG Image Gen**: Usamos **Satori** para crear previsualizaciones dinámicas en redes sociales (Twitter, WhatsApp, etc.) que incluyen el título y la imagen del post en tiempo real.
- 🗺️ **Sitemap & RSS**: Sitemap manual para contenido dinámico SSR y feed RSS actualizado para podcatchers.

---

## 🤝 Contribuir

¿Quieres mejorar Veredillas FM? ¡Eres bienvenido!

1. **Fork** el repo.
2. Crea una **rama** para tu mejora (`git checkout -b feature/MejoraIncreible`).
3. Haz **commit** de tus cambios (`git commit -m 'Añade: Tal funcionalidad'`).
4. Haz **push** a la rama (`git push origin feature/MejoraIncreible`).
5. Abre un **Pull Request**.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

---

## 👥 Equipo

- **Abel Fernández** - Guionista
- **Pablo Luna** - Web, Sonido y Programación
- **Pablo Santamaría** - Diseño Web y Sonido
- **Omar Reyes** - Diseñador Web
- **Dylan Jorge** - Redactor Jefe
- **Pablo Pérez** - Integrante del Podcast
- **Miguel Salazar** - Estrategia Digital

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

### 🌟 Si te gusta este proyecto, ¡dale una estrella! ⭐

**Hecho con ❤️ por el equipo de Veredillas FM**

[🎧 Escúchanos](https://veredillasfm.es) · [📧 Contacto](https://veredillasfm.es/contacto) · [📱 Instagram](https://www.instagram.com/veredillasfm.es)

</div>
