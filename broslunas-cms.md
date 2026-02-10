# 📖 Manual de Usuario — Broslunas CMS

> Guía completa para gestionar el contenido de tu sitio web a través de **Broslunas CMS**. Aprende qué es cada colección, qué campos tiene y cómo rellenarlos correctamente.

---

## 📑 Índice

1. [Tipos de datos](#-tipos-de-datos)
2. [Episodios](#-episodios)
3. [Blog](#-blog)
4. [Invitados (Guests)](#-invitados-guests)
5. [Galería (Gallery)](#-galería-gallery)

---

## 🔤 Tipos de datos

Antes de empezar, estos son los tipos de dato que encontrarás en los formularios:

| Icono | Tipo | Qué es | Ejemplo |
|-------|------|--------|---------|
| 🔤 | **Texto** | Un campo de texto libre | `Amor Sin Filtros` |
| 🔢 | **Número** | Un valor numérico entero | `5` |
| ✅ | **Sí/No** | Un interruptor (activado o desactivado) | Activado / Desactivado |
| 📅 | **Fecha** | Selector de fecha y hora | `11 de febrero de 2026, 17:00` |
| 🏷️ | **Lista de textos** | Varios valores de texto | `amor`, `relaciones`, `pareja` |
| 📋 | **Lista de elementos** | Varios elementos con sus propios campos | Ver secciones o transcripción |

---

## 🎙️ Episodios

Los episodios son el contenido principal del sitio. Cada episodio representa un programa del podcast.

### Campos del formulario

| Campo | Tipo | ¿Obligatorio? | Descripción |
|-------|------|---------------|-------------|
| **Título** (`title`) | 🔤 Texto | ✅ Sí | El nombre del episodio. Ej: *"Amor Sin Filtros ft. Saray & Antonieta"* |
| **Descripción** (`description`) | 🔤 Texto largo | ✅ Sí | Un resumen breve de qué trata el episodio |
| **Fecha de publicación** (`pubDate`) | 📅 Fecha | ✅ Sí | Cuándo se publica o se publicó el episodio |
| **Autor** (`author`) | 🔤 Texto | ❌ No | Quién creó el contenido. Si se deja vacío, aparecerá *"Veredillas FM"* |
| **Imagen** (`image`) | 🔤 URL | ❌ No | Enlace a la imagen de portada del episodio |
| **URL de Spotify** (`spotifyUrl`) | 🔤 URL | ❌ No | Enlace del episodio en Spotify |
| **URL de Audio** (`audioUrl`) | 🔤 URL | ❌ No | Enlace directo al archivo de audio (MP3, WAV, etc.) |
| **Duración** (`duration`) | 🔤 Texto | ❌ No | Duración del episodio. Ej: *"37 min"*, *"1h 20 min"* |
| **Temporada** (`season`) | 🔢 Número | ❌ No | Número de la temporada. Ej: `1` |
| **Nº de Episodio** (`episode`) | 🔢 Número | ❌ No | Número del episodio dentro de la temporada. Ej: `5` |
| **URL de Vídeo** (`videoUrl`) | 🔤 URL | ❌ No | Enlace al vídeo embebido (YouTube, Spotify Video, etc.) |
| **Etiquetas** (`tags`) | 🏷️ Lista de textos | ❌ No | Categorías del episodio. Si no se añade ninguna, se asigna *"General"* automáticamente |
| **Participantes** (`participants`) | 🏷️ Lista de textos | ❌ No | Nombres de los invitados o participantes del episodio |
| **Es Estreno** (`isPremiere`) | ✅ Sí/No | ❌ No | Actívalo si el episodio aún no se ha emitido y quieres marcarlo como "próximamente". Por defecto está desactivado |
| **Mensaje de advertencia** (`warningMessage`) | 🔤 Texto | ❌ No | Un aviso que se mostrará antes del contenido (ej: contenido sensible) |

### Campos avanzados

#### 📑 Secciones (`sections`)

Permiten dividir el episodio en **capítulos** para que el oyente pueda navegar fácilmente.

Cada sección tiene:

| Subcampo | Tipo | Descripción |
|----------|------|-------------|
| **Título** (`title`) | 🔤 Texto | Nombre de la sección. Ej: *"Intro / Bienvenida"* |
| **Tiempo** (`time`) | 🔤 Texto | Minuto en el que empieza. Ej: *"05:30"* |

> 💡 **Ejemplo:** Un episodio puede tener secciones como: *"Intro"* a las `00:01`, *"Tema principal"* a las `05:30`, *"Preguntas"* a las `15:00` y *"Despedida"* a las `25:00`.

#### 📝 Transcripción (`transcription`)

Es la transcripción completa de lo que se dice en el episodio, con marcas de tiempo.

Cada entrada de transcripción tiene:

| Subcampo | Tipo | ¿Obligatorio? | Descripción |
|----------|------|---------------|-------------|
| **Tiempo** (`time`) | 🔤 Texto | ✅ Sí | Momento de la intervención. Ej: *"00:01"* o *"01:30:00"* |
| **Texto** (`text`) | 🔤 Texto largo | ✅ Sí | Lo que se dice en ese momento |
| **Hablante** (`speaker`) | 🔤 Texto | ❌ No | Quién habla (si se quiere identificar) |

> 💡 **Ejemplo:** `00:01` — *"Bienvenidos a Veredillas FM"* / `00:15` — *"Hoy hablaremos sobre el mercadillo"*

---

## 📝 Blog

Los artículos del blog son publicaciones de noticias, anuncios y contenido editorial.

### Campos del formulario

| Campo | Tipo | ¿Obligatorio? | Descripción |
|-------|------|---------------|-------------|
| **Título** (`title`) | 🔤 Texto | ✅ Sí | El título del artículo. Ej: *"¡Bienvenidos a Veredillas FM!"* |
| **Descripción** (`description`) | 🔤 Texto largo | ✅ Sí | Resumen breve del artículo |
| **Fecha de publicación** (`pubDate`) | 📅 Fecha | ✅ Sí | Cuándo se publica el artículo |
| **Autor** (`author`) | 🔤 Texto | ❌ No | Quién escribe el artículo. Si se deja vacío, aparecerá *"Redacción Veredillas"* |
| **Imagen** (`image`) | 🔤 URL | ❌ No | Enlace a la imagen de cabecera del artículo |
| **Etiquetas** (`tags`) | 🏷️ Lista de textos | ❌ No | Categorías del artículo. Ej: *"Bienvenida"*, *"Radio"* |

> 💡 **Nota:** A diferencia de los episodios, si no añades etiquetas, el artículo simplemente no tendrá ninguna (no se asigna una por defecto).

---

## 👥 Invitados (Guests)

Los invitados son los perfiles de las personas que han participado en el podcast: alumnos, profesores, colaboradores, etc.

### Campos del formulario

| Campo | Tipo | ¿Obligatorio? | Descripción |
|-------|------|---------------|-------------|
| **Nombre** (`name`) | 🔤 Texto | ✅ Sí | Nombre completo del invitado. Ej: *"Prof. Alejandro"* |
| **Imagen** (`image`) | 🔤 URL | ❌ No | Enlace a la foto de perfil del invitado |
| **Rol** (`role`) | 🔤 Texto | ❌ No | Cargo o rol. Ej: *"Profesor de Informática"*, *"Alumno de 2º Bachillerato B"* |
| **Descripción** (`description`) | 🔤 Texto largo | ❌ No | Una breve descripción del invitado |

#### 🌐 Redes Sociales (`social`)

Dentro de cada invitado puedes añadir sus redes sociales. Todos son opcionales:

| Subcampo | Tipo | Descripción |
|----------|------|-------------|
| **Twitter** (`twitter`) | 🔤 URL | Enlace al perfil de Twitter/X |
| **Instagram** (`instagram`) | 🔤 URL | Enlace al perfil de Instagram |
| **Sitio web** (`website`) | 🔤 URL | Enlace a su página web personal |

> 💡 **Importante:** El nombre del invitado debe coincidir exactamente con el que se usa en el campo **Participantes** de los episodios. Si en el episodio pones *"Prof. Alejandro"*, el invitado debe llamarse *"Prof. Alejandro"*, no *"Alejandro"*.

---

## 🖼️ Galería (Gallery)

Las galerías organizan imágenes por categorías temáticas. Cada entrada de galería es una categoría con su colección de fotos.

### Campos del formulario

| Campo | Tipo | ¿Obligatorio? | Descripción |
|-------|------|---------------|-------------|
| **Categoría** (`category`) | 🔤 Texto | ✅ Sí | Nombre de la categoría. Ej: *"Episodios"*, *"Equipo"*, *"Estudio"*, *"Momentos"* |
| **Imágenes** (`images`) | 📋 Lista de elementos | ✅ Sí | Las fotos que pertenecen a esta categoría |

Cada imagen dentro de la lista tiene:

| Subcampo | Tipo | Descripción |
|----------|------|-------------|
| **Título** (`title`) | 🔤 Texto | Título o pie de foto. Ej: *"007 - Hablemos de Venezuela"* |
| **Imagen** (`src`) | 🔤 URL | Enlace a la imagen |

> 💡 **Nota:** Para añadir una imagen a una categoría existente, simplemente añade una nueva entrada a la lista de imágenes. Para crear una categoría nueva, crea una nueva entrada de galería con un nombre de categoría diferente.

---

## 📋 Resumen rápido

| Colección | Campos mínimos para crear contenido |
|-----------|-------------------------------------|
| 🎙️ **Episodios** | Título + Descripción + Fecha |
| 📝 **Blog** | Título + Descripción + Fecha |
| 👥 **Invitados** | Nombre |
| 🖼️ **Galería** | Categoría + al menos 1 imagen (título + URL) |

---

> 📌 **¿Dudas?** Consulta los contenidos ya publicados como referencia desde el panel de Broslunas CMS.