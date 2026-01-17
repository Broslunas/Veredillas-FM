import { defineCollection, z } from 'astro:content';

const episodios = defineCollection({
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		author: z.string().default('Veredillas FM'),
		image: z.string().optional(),
		spotifyUrl: z.string().optional(), // Expected format: https://open.spotify.com/episode/...
		audioUrl: z.string().optional(), // Direct audio file URL
		duration: z.string().optional(),
		season: z.number().optional(),
		episode: z.number().optional(),
		tags: z.array(z.string()).default(['General']),
		participants: z.array(z.string()).optional(),
        transcription: z.array(z.object({
            time: z.string(), // "MM:SS" or "HH:MM:SS"
            text: z.string(),
            speaker: z.string().optional()
        })).optional(),
        sections: z.array(z.object({
            title: z.string(),
            time: z.string(), // "MM:SS"
        })).optional(),
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

const guests = defineCollection({
	schema: z.object({
		name: z.string(),
		image: z.string().optional(),
		role: z.string().optional(),
		description: z.string().optional(),
        social: z.object({
            twitter: z.string().optional(),
            instagram: z.string().optional(),
            website: z.string().optional(),
        }).optional(),
	}),
});

export const collections = { episodios, blog, guests };
