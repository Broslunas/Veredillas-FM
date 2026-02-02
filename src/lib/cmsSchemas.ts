
export interface SchemaField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'number' | 'list';
    required?: boolean;
    default?: string;
}

export const COLLECTION_SCHEMAS: Record<string, SchemaField[]> = {
    'blog': [
        { name: 'title', label: 'Título', type: 'text', required: true },
        { name: 'description', label: 'Descripción', type: 'textarea', required: true },
        { name: 'pubDate', label: 'Fecha Publicación', type: 'date', required: true },
        { name: 'author', label: 'Autor', type: 'text', default: 'Redacción Veredillas' },
        { name: 'image', label: 'Imagen URL', type: 'text' },
        { name: 'tags', label: 'Tags (separados por coma)', type: 'list' }
    ],
    'guests': [
        { name: 'name', label: 'Nombre', type: 'text', required: true },
        { name: 'role', label: 'Rol / Profesión', type: 'text' },
        { name: 'image', label: 'Foto URL', type: 'text' },
        { name: 'description', label: 'Bio Corta', type: 'textarea' },
    ],
    'episodios': [
        { name: 'title', label: 'Título', type: 'text', required: true },
        { name: 'description', label: 'Descripción', type: 'textarea', required: true },
        { name: 'pubDate', label: 'Fecha Publicación', type: 'date', required: true },
        { name: 'season', label: 'Temporada', type: 'number' },
        { name: 'episode', label: 'Episodio', type: 'number' },
        { name: 'image', label: 'Imagen URL', type: 'text' },
        { name: 'audioUrl', label: 'Audio URL', type: 'text' },
        { name: 'spotifyUrl', label: 'Spotify URL', type: 'text' },
        { name: 'duration', label: 'Duración', type: 'text' },
        { name: 'participants', label: 'Participantes (sep. por coma)', type: 'list' }
    ]
};
