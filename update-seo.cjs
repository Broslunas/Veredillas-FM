const fs = require('fs');
const { globSync } = require('glob');

const pageSEOData = {
	'src/pages/entrevistas.astro': {
		title: 'Entrevistas Exclusivas',
		description: 'Descubre todas las entrevistas realizadas en Veredillas FM. Hablamos con profesores, alumnos y personalidades destacadas sobre sus experiencias y conocimientos.',
	},
	'src/pages/tierlist.astro': {
		title: 'Tierlist',
		description: 'Crea y comparte tierlists interactivas de tus temas favoritos del instituto. Participa en la comunidad de Veredillas FM y rankea los mejores momentos.',
	},
	'src/pages/playlist/[id].astro': {
		title: 'Playlist',
		description: 'Escucha esta playlist exclusiva de episodios y clips seleccionados por la comunidad de Veredillas FM. Disfruta de la mejor radio escolar.',
	},
	'src/pages/wrapped.astro': {
		title: 'Tu Veredillas Wrapped',
		description: 'Descubre tu resumen anual en Veredillas FM. Revisa tus estadísticas de escucha, episodios favoritos y logros desbloqueados este año.',
	},
	'src/pages/cookies.astro': {
		title: 'Política de Cookies',
		description: 'Información detallada sobre el uso de cookies en Veredillas FM. Conoce cómo gestionamos tus datos para ofrecerte la mejor experiencia en nuestra plataforma web.',
	},
	'src/pages/copyright.astro': {
		title: 'Derechos de Autor',
		description: 'Información sobre los derechos de autor y el contenido publicado en Veredillas FM. Todos los derechos reservados por el IES Las Veredillas y sus creadores.',
	},
	'src/pages/politica-de-privacidad.astro': {
		title: 'Política de Privacidad',
		description: 'Nuestra política de privacidad detalla cómo protegemos tus datos personales y tu información mientras navegas y participas en Veredillas FM.',
	},
	'src/pages/terminos-y-condiciones.astro': {
		title: 'Términos y Condiciones',
		description: 'Lee los términos y condiciones de uso de la plataforma web de Veredillas FM. Reglas de participación comunitaria y uso de nuestros servicios.',
	},
	'src/pages/aviso-legal.astro': {
		title: 'Aviso Legal',
		description: 'Aviso legal y condiciones de uso del portal web oficial de Veredillas FM, la radio del IES Las Veredillas.',
	},
	'src/pages/404.astro': {
		title: 'Página no encontrada',
		description: 'La página que buscas no existe en Veredillas FM. Vuelve al inicio para seguir disfrutando de nuestro podcast escolar.',
		robots: 'noindex, nofollow'
	},
	'src/pages/newsletter/confirm.astro': {
		title: 'Suscripción Confirmada',
		description: 'Has confirmado tu suscripción a la newsletter de Veredillas FM. Gracias por unirte a nuestra comunidad.',
		robots: 'noindex, nofollow'
	}
};

const adminPages = globSync('src/pages/dashboard/**/*.astro');
adminPages.forEach(file => {
	pageSEOData[file.replace(/\\\\/g, '/')] = {
		robots: 'noindex, nofollow'
	};
});

pageSEOData['src/pages/dashboard.astro'] = { robots: 'noindex, nofollow' };
pageSEOData['src/pages/login.astro'] = { robots: 'noindex, nofollow' };
pageSEOData['src/pages/verify-comment.astro'] = { robots: 'noindex, nofollow' };
pageSEOData['src/pages/verify-delete.astro'] = { robots: 'noindex, nofollow' };
pageSEOData['src/pages/favoritos.astro'] = { robots: 'noindex, nofollow' };
pageSEOData['src/pages/historial.astro'] = { robots: 'noindex, nofollow' };

Object.keys(pageSEOData).forEach(file => {
	const realPath = file;
	if (fs.existsSync(realPath)) {
		let content = fs.readFileSync(realPath, 'utf8');
		const data = pageSEOData[file];
		
		if (data.description && content.includes('<Layout') && !content.includes('description=')) {
			content = content.replace(/(<Layout[^>]*?title=[^>]*?)(>)/, '$1\n  description="' + data.description + '"\n$2');
		}
		
		if (data.robots && content.includes('<Layout') && !content.includes('robots=')) {
			content = content.replace(/(<Layout[^>]*?)(>)/, '$1\n  robots="' + data.robots + '"\n$2');
		}
		
		fs.writeFileSync(realPath, content);
	}
});
console.log("Done");
