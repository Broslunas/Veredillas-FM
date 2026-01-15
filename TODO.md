- [x] Modo "Cine" / Visualizador Inmersivo:

Idea: El MiniPlayer es funcional, pero pequeño. Añade un botón de "Expandir" que abra un overlay a pantalla completa con la carátula en alta definición, las ondas de audio (spectrum-bars) reaccionando de verdad al sonido (Web Audio API), y letras o notas del episodio sincronizadas.
- [x] Tema Dinámico (Ambient Colors):

Idea: Usa una librería ligera (como colorthief) para extraer el color dominante de la carátula del episodio que se está reproduciendo y cambia sutilmente los colores de acento (sombras, bordes, o el blob de fondo) para que coincidan con el episodio.

- [ ] Búsqueda Global (Command Palette):

Idea: Implementa una interfaz tipo "Cmd+K" (como la de Vercel o MacOS). Que al presionar Ctrl+K se abra un buscador rápido para saltar instantáneamente a cualquier episodio, post del blog o miembro del equipo.

- [ ] Share-Cards Generativas:

Idea: Añade un botón en el reproductor: "Compartir en Historia". Esto debería generar al vuelo una imagen vertical (usando html-to-image) con la carátula, el título y una onda de audio estática, lista para que el usuario la suba a Instagram/TikTok.

- [ ] Sistema de "Reacciones" Timestamped:

Idea: Al estilo SoundCloud o las Lives de redes sociales. Permite a los usuarios pulsar un botón de "Fuego" o "Aplauso" en momentos específicos del audio. Esos datos se guardan y luego se muestran como "picos de interés" en la barra de reproducción para futuros oyentes.

- [ ] Integración SEO con "Podcast Player":

Idea: Asegúrate de usar el Schema.org de PodcastEpisode. Google ahora permite indexar episodios individuales para que aparezca el botón "Play" directamente en los resultados de búsqueda de Google.
- [ ] Gamificación "Top Fan":

Idea: Si un usuario escucha X cantidad de episodios completos (tracking local en localStorage), desbloquea un "Badge" especial en la cabecera o un tema de color "Gold" secreto para la web.