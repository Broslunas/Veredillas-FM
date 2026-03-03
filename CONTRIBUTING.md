# Guía de Contribución

¡Gracias por tu interés en contribuir a Veredillas FM! 🎉

Esta guía te ayudará a entender cómo puedes contribuir al proyecto de manera efectiva.

---

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo puedo contribuir?](#cómo-puedo-contribuir)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
- [Guía de Estilo](#guía-de-estilo)
- [Mensajes de Commit](#mensajes-de-commit)
- [Pull Requests](#pull-requests)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Features](#sugerir-features)

---

## 📜 Código de Conducta

Este proyecto se adhiere a un Código de Conducta que todos los contribuyentes deben seguir. Al participar, se espera que mantengas este código. Por favor, reporta comportamientos inaceptables a [contacto@veredillasfm.es](mailto:contacto@veredillasfm.es).

### Nuestros Estándares

**Comportamientos que contribuyen a crear un ambiente positivo:**

- ✅ Usar lenguaje acogedor e inclusivo
- ✅ Ser respetuoso con diferentes puntos de vista y experiencias
- ✅ Aceptar críticas constructivas con gracia
- ✅ Enfocarse en lo que es mejor para la comunidad
- ✅ Mostrar empatía hacia otros miembros de la comunidad

**Comportamientos inaceptables:**

- ❌ Uso de lenguaje o imágenes sexualizadas
- ❌ Trolling, comentarios insultantes o despectivos
- ❌ Acoso público o privado
- ❌ Publicar información privada de otros sin permiso
- ❌ Otras conductas que puedan considerarse inapropiadas

---

## 🤝 ¿Cómo puedo contribuir?

Hay muchas formas de contribuir a Veredillas FM:

### 1. 🐛 Reportar Bugs

Los bugs se rastrean como [GitHub Issues](https://github.com/Broslunas/veredillas-fm/issues). Antes de crear un issue:

- **Verifica** que el bug no haya sido reportado ya
- **Incluye** detalles sobre tu configuración (SO, navegador, versión)
- **Describe** los pasos para reproducir el bug
- **Proporciona** capturas de pantalla si es posible

### 2. 💡 Sugerir Features

Las sugerencias de features también se rastrean como issues. Para sugerir una:

- **Explica** claramente qué problema resolvería
- **Describe** la solución que te gustaría ver
- **Menciona** alternativas que hayas considerado
- **Añade** contexto adicional (mockups, ejemplos, etc.)

### 3. 📝 Mejorar Documentación

La documentación siempre puede mejorar:

- Corregir errores tipográficos
- Mejorar explicaciones
- Añadir ejemplos
- Traducir documentación

### 4. 💻 Contribuir con Código

- Arreglar bugs reportados
- Implementar features solicitadas
- Optimizar rendimiento
- Mejorar accesibilidad
- Refactorizar código

---

## 🔧 Proceso de Desarrollo

### Setup Inicial

1. **Fork** el repositorio en GitHub
2. **Clone** tu fork localmente:
   ```bash
   git clone https://github.com/TU_USUARIO/veredillas-fm.git
   cd veredillas-fm
   ```

3. **Añade** el repositorio original como remote:
   ```bash
   git remote add upstream https://github.com/Broslunas/veredillas-fm.git
   ```

4. **Instala** las dependencias:
   ```bash
   npm install
   ```

5. **Crea** una rama para tu feature:
   ```bash
   git checkout -b feature/nombre-descriptivo
   ```

### Desarrollo

1. **Inicia** el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. **Realiza** tus cambios

3. **Prueba** que todo funciona correctamente

4. **Commit** tus cambios (ver [Mensajes de Commit](#mensajes-de-commit))

### Testing

Antes de hacer push:

- ✅ Verifica que el build funcione: `npm run build`
- ✅ Previsualiza el build: `npm run preview`
- ✅ Verifica que no hay errores de TypeScript
- ✅ Prueba en diferentes navegadores si es posible
- ✅ Verifica la responsividad en móvil

---

## 🎨 Guía de Estilo

### TypeScript/JavaScript

- Usa **TypeScript** siempre que sea posible
- Sigue las convenciones de **ESLint** (si está configurado)
- Usa **const** por defecto, **let** solo cuando sea necesario
- Evita **any**, especifica tipos explícitos

```typescript
// ✅ Bien
interface Props {
  title: string;
  count: number;
}

// ❌ Evitar
const props: any = { title: "Hola", count: 5 };
```

### Astro Components

- Un componente por archivo
- Nombres de archivo en PascalCase para componentes (`Header.astro`)
- Nombres de archivo en kebab-case para páginas (`about-us.astro`)
- Props con tipos explícitos

```astro
---
interface Props {
  title: string;
  description?: string;
}

const { title, description = "Default" } = Astro.props;
---

<div>
  <h1>{title}</h1>
  <p>{description}</p>
</div>
```

### CSS

- Usa **CSS Variables** para valores reutilizables
- Sigue la metodología **BEM** para nombres de clases cuando sea apropiado
- Mantén los estilos **scoped** en componentes Astro
- Mobile-first para media queries

```css
/* ✅ Bien */
.card {
  background: var(--color-surface);
  padding: var(--spacing-md);
}

.card__title {
  color: var(--color-text-main);
}

/* ❌ Evitar */
.card {
  background: #1a1a1a; /* Usa variables */
  padding: 16px; /* Usa spacing tokens */
}
```

### Markdown

- Usa **frontmatter** para metadatos
- Incluye todos los campos requeridos
- Sigue la estructura existente

```markdown
---
title: "Título del Artículo"
description: "Descripción breve y concisa"
pubDate: 2026-03-03
author: "Nombre del Autor"
image: "/path/to/image.jpg"
tags: ["tag1", "tag2"]
---

Contenido aquí...
```

---

## 📝 Mensajes de Commit

Seguimos el estándar de **[Conventional Commits](https://www.conventionalcommits.org/)**.

### Formato

```
<tipo>: <descripción breve>

[cuerpo opcional]

[footer opcional]
```

### Tipos

- **feat**: Nueva funcionalidad
- **fix**: Corrección de bug
- **docs**: Cambios en documentación
- **style**: Cambios de formato (espacios, punto y coma, etc.)
- **refactor**: Refactorización de código
- **perf**: Mejoras de rendimiento
- **test**: Añadir o corregir tests
- **chore**: Tareas de mantenimiento

### Ejemplos

```bash
# Nueva funcionalidad
git commit -m "feat: añadir reproductor de audio persistente"

# Corrección de bug
git commit -m "fix: corregir error en navegación móvil"

# Documentación
git commit -m "docs: actualizar README con nuevas instrucciones"

# Refactorización
git commit -m "refactor: optimizar componente Header"
```

### Consejos

- Usa el imperativo ("añadir" no "añadido")
- Primera línea máximo 50 caracteres
- Segunda línea en blanco
- Cuerpo con detalles (máx 72 caracteres por línea)
- Referencia issues con `#123`

---

## 🔀 Pull Requests

### Antes de Crear un PR

1. ✅ Actualiza tu rama con los últimos cambios:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. ✅ Verifica que el build funcione:
   ```bash
   npm run build
   ```

3. ✅ Haz commit de todos los cambios

4. ✅ Push a tu fork:
   ```bash
   git push origin feature/nombre-descriptivo
   ```

### Creando el PR

1. Ve a tu fork en GitHub
2. Haz click en "New Pull Request"
3. Selecciona tu rama
4. Completa el template:

```markdown
## Descripción
Breve descripción de los cambios

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Cambio que rompe compatibilidad
- [ ] Documentación

## ¿Cómo se ha probado?
Describe las pruebas realizadas

## Checklist
- [ ] Mi código sigue las guías de estilo
- [ ] He realizado una auto-revisión
- [ ] He comentado código complejo
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan warnings
- [ ] El build funciona correctamente
```

### Durante la Revisión

- Responde a los comentarios
- Realiza cambios solicitados
- Mantén la discusión profesional y constructiva
- Sé paciente - las revisiones pueden tomar tiempo

---

## 🐛 Reportar Bugs

### Template de Bug Report

```markdown
**Describe el bug**
Descripción clara y concisa del bug

**Para Reproducir**
Pasos para reproducir:
1. Ve a '...'
2. Click en '...'
3. Scroll hasta '...'
4. Ver error

**Comportamiento Esperado**
Qué esperabas que sucediera

**Capturas de Pantalla**
Si es aplicable, añade capturas

**Información del Sistema:**
 - OS: [e.g. Windows 11]
 - Navegador: [e.g. Chrome 121]
 - Versión: [e.g. 1.0.0]

**Contexto Adicional**
Cualquier otro contexto relevante
```

---

## 💡 Sugerir Features

### Template de Feature Request

```markdown
**¿Tu solicitud está relacionada con un problema?**
Descripción clara del problema

**Describe la solución que te gustaría**
Descripción clara de qué quieres que suceda

**Describe alternativas que hayas considerado**
Otras soluciones o features que consideraste

**Contexto Adicional**
Mockups, ejemplos, enlaces, etc.
```

---

## 🏗️ Áreas que Necesitan Ayuda

Siempre estamos buscando ayuda con:

- 🎨 **Diseño**: Mejorar UX/UI
- ♿ **Accesibilidad**: Hacer el sitio más accesible
- 🌐 **i18n**: Traducir a otros idiomas
- 📊 **Rendimiento**: Optimizar carga y animaciones
- 🧪 **Testing**: Añadir tests automatizados
- 📝 **Contenido**: Crear episodios y artículos

---

## 📞 ¿Necesitas Ayuda?

Si tienes preguntas sobre cómo contribuir:

- 💬 Abre un [Discussion](https://github.com/Broslunas/veredillas-fm/discussions)
- 📧 Envía un email a [contacto@veredillasfm.es](mailto:contacto@veredillasfm.es)
- 🐦 Escríbenos en Twitter [@VeredillasFM](https://twitter.com/VeredillasFM)

---

## 🎉 Reconocimiento

Todos los contribuyentes serán añadidos a nuestro [humans.txt](public/humans.txt) y mencionados en los releases notes.

---

**¡Gracias por contribuir a Veredillas FM!** 🎙️❤️

Con tu ayuda, podemos hacer de este proyecto algo increíble para toda la comunidad estudiantil.
