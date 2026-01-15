- [ ] Modo "Cine" / Visualizador Inmersivo:

Idea: El MiniPlayer es funcional, pero pequeño. Añade un botón de "Expandir" que abra un overlay a pantalla completa con la carátula en alta definición, las ondas de audio (spectrum-bars) reaccionando de verdad al sonido (Web Audio API), y letras o notas del episodio sincronizadas.
- [ ] Tema Dinámico (Ambient Colors):

Idea: Usa una librería ligera (como colorthief) para extraer el color dominante de la carátula del episodio que se está reproduciendo y cambia sutilmente los colores de acento (sombras, bordes, o el blob de fondo) para que coincidan con el episodio.
- [ ] Micro-interacciones Táctiles:

Idea: Añade feedback sonoro muy sutil (UI Sounds) al interactuar con elementos clave como el botón de Play, Like, o al cambiar de página. Además, mejora los botones con un efecto "magnético" (el botón se mueve ligeramente hacia el cursor antes de hacer clic).

- [ ] Búsqueda Global (Command Palette):

Idea: Implementa una interfaz tipo "Cmd+K" (como la de Vercel o MacOS). Que al presionar Ctrl+K se abra un buscador rápido para saltar instantáneamente a cualquier episodio, post del blog o miembro del equipo.
- [ ] PWA (Progressive Web App) + Offline Mode:

Idea: Configura un Service Worker real mediante @vite-pwa/astro. Esto permitiría a los estudiantes "instalar" la web como una App en sus móviles y, lo más importante, cachear el shell de la aplicación para que cargue instantáneamente incluso con mala conexión en el instituto.
- [ ] 🚀 Funcionalidades y Comunidad   
- [ ] Share-Cards Generativas:

Idea: Añade un botón en el reproductor: "Compartir en Historia". Esto debería generar al vuelo una imagen vertical (usando html-to-image) con la carátula, el título y una onda de audio estática, lista para que el usuario la suba a Instagram/TikTok.
- [ ] Sistema de "Reacciones" Timestamped:

Idea: Al estilo SoundCloud o las Lives de redes sociales. Permite a los usuarios pulsar un botón de "Fuego" o "Aplauso" en momentos específicos del audio. Esos datos se guardan y luego se muestran como "picos de interés" en la barra de reproducción para futuros oyentes.
- [ ] Buzón de Voz (Voice Notes):

Idea: En la página de contacto, en lugar de solo texto, permite grabar una nota de audio corta ("Manda tu saludo"). Esto genera contenido real que podéis poner en los siguientes episodios del podcast ("Mensajes de los oyentes").
- [ ] Integración SEO con "Podcast Player":

Idea: Asegúrate de usar el Schema.org de PodcastEpisode. Google ahora permite indexar episodios individuales para que aparezca el botón "Play" directamente en los resultados de búsqueda de Google.
- [ ] Gamificación "Top Fan":

Idea: Si un usuario escucha X cantidad de episodios completos (tracking local en localStorage), desbloquea un "Badge" especial en la cabecera o un tema de color "Gold" secreto para la web.