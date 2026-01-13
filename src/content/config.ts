import { defineCollection, z } from 'astro:content';

const episodios = defineCollection({
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		author: z.string().default('Equipo Veredillas FM'),
		image: z.string().optional(),
		spotifyUrl: z.string().optional(), // Expected format: https://open.spotify.com/episode/...
		duration: z.string().optional(),
		season: z.number().optional(),
		episode: z.number().optional(),
	}),
});

const blog = defineCollection({
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		author: z.string().default('Redacción Veredillas'),
		image: z.string().optional(),
        tags: z.array(z.string()).optional(),
	}),
});

export const collections = { episodios, blog };
