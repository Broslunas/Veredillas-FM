# Security Policy

## 🔒 Seguridad en Veredillas FM

La seguridad es una prioridad para Veredillas FM. Agradecemos a la comunidad de seguridad por ayudarnos a mantener el proyecto seguro.

## 🛡️ Versiones Soportadas

Actualmente damos soporte de seguridad a las siguientes versiones:

| Versión | Soportada          |
| ------- | ------------------ |
| 2.0.x   | ✅ Sí              |
| 1.2.x   | ✅ Sí              |
| 1.1.x   | ⚠️ Soporte limitado |
| < 1.0   | ❌ No              |

## 🐛 Reportar una Vulnerabilidad

Si descubres una vulnerabilidad de seguridad, por favor **NO** abras un issue público.

### Proceso de Reporte

1. **Envía un email** a: security@veredillasfm.es
2. **Incluye** la siguiente información:
   - Tipo de vulnerabilidad
   - Ubicación del código afectado (tag/branch/commit o URL directa)
   - Configuración especial requerida para reproducir
   - Instrucciones paso a paso para reproducir
   - Proof-of-concept o código de exploit (si es posible)
   - Impacto potencial de la vulnerabilidad

### Qué Esperar

- **Confirmación**: Confirmaremos la recepción en 48 horas
- **Evaluación**: Evaluaremos la vulnerabilidad en 7 días
- **Plan de acción**: Te informaremos del plan en 14 días
- **Actualización**: Publicaremos un fix lo antes posible
- **Crédito**: Te acreditaremos en las release notes (si lo deseas)

## 🎯 Alcance

### En Scope

Las siguientes áreas están en el alcance del programa de seguridad:

✅ **Aplicación Web**
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Inyección SQL
- Inyección de código
- Exposición de datos sensibles

✅ **Autenticación & Autorización**
- Bypass de autenticación
- Escalación de privilegios
- Gestión de sesiones

✅ **Manejo de Datos**
- Validación de entrada
- Sanitización de salida
- Almacenamiento seguro

### Fuera de Scope

Las siguientes áreas NO están en el alcance:

❌ Ataques de ingeniería social  
❌ Ataques físicos  
❌ Denial of Service (DoS/DDoS)  
❌ Spam  
❌ Vulnerabilidades en servicios de terceros  
❌ Informes sin PoC o pasos claros de reproducción  

## 🏆 Reconocimiento

Agradecemos a los siguientes investigadores de seguridad por sus contribuciones:

<!-- Una vez que haya reportes, serán listados aquí -->
- Ninguno todavía - ¡Sé el primero!

## 📋 Mejores Prácticas para Contribuyentes

Si estás contribuyendo código, por favor:

### Validación de Entrada
```typescript
// ✅ Bien
const sanitizedInput = DOMPurify.sanitize(userInput);

// ❌ Mal
const output = userInput; // Sin validación
```

### Gestión de Secrets
```typescript
// ✅ Bien - Usa variables de entorno
const apiKey = import.meta.env.API_KEY;

// ❌ Mal - Hardcode de secrets
const apiKey = "abc123xyz"; // NUNCA
```

### Headers de Seguridad
```astro
---
// Añade headers de seguridad apropiados
Astro.response.headers.set('X-Frame-Options', 'DENY');
Astro.response.headers.set('X-Content-Type-Options', 'nosniff');
---
```

## 🔐 Políticas de Seguridad

### Cookies
- Todas las cookies deben usar la flag `Secure` en producción
- Cookies sensibles deben usar `HttpOnly`
- Implementar `SameSite` apropiadamente

### HTTPS
- Todo el tráfico debe ser sobre HTTPS en producción
- Implementar HSTS (HTTP Strict Transport Security)

### Content Security Policy
- Implementar CSP headers apropiados
- Evitar `unsafe-inline` y `unsafe-eval`

### Dependencias
- Mantener dependencias actualizadas
- Usar `npm audit` regularmente
- Revisar advisories de seguridad

## 📞 Contacto

Para asuntos de seguridad:
- 📧 Email: security@veredillasfm.es
- 🔒 PGP Key: [Por definir]

Para otros asuntos:
- 📧 Email general: contacto@veredillasfm.es
- 🐦 Twitter: [@VeredillasFM](https://twitter.com/VeredillasFM)

## 📚 Recursos Adicionales

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)

---

**Última actualización**: 13 de enero de 2026  
**Versión de la política**: 1.0

*Esta política de seguridad puede ser actualizada ocasionalmente. Los cambios significativos serán comunicados a través de nuestros canales oficiales.*
