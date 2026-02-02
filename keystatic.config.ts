import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: import.meta.env.PROD
    ? {
        kind: 'github',
        repo: 'Broslunas/veredillas-fm',
      }
    : {
        kind: 'local',
      },
  collections: {
    posts: collection({
      label: 'Blogs',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        pubDate: fields.date({ label: 'Published Date' }),
        author: fields.text({ label: 'Author', defaultValue: 'Redacción Veredillas' }),
        image: fields.text({ label: 'Image URL' }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags' }),
        content: fields.document({
          label: 'Content',
          formatting: true,
          dividers: true,
          links: true,
          images: true,
        }),
      },
    }),
    episodes: collection({
      label: 'Episodios',
      slugField: 'title',
      path: 'src/content/episodios/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        pubDate: fields.date({ label: 'Published Date' }),
        author: fields.text({ label: 'Author', defaultValue: 'Veredillas FM' }),
        image: fields.text({ label: 'Image URL' }),
        spotifyUrl: fields.text({ label: 'Spotify URL' }),
        audioUrl: fields.text({ label: 'Audio URL' }),
        duration: fields.text({ label: 'Duration' }),
        season: fields.integer({ label: 'Season' }),
        episode: fields.integer({ label: 'Episode' }),
        videoUrl: fields.text({ label: 'Video URL' }),
        participants: fields.array(fields.text({ label: 'Participant' }), { label: 'Participants' }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags' }),
        isPremiere: fields.checkbox({ label: 'Is Premiere' }),
        warningMessage: fields.text({ label: 'Warning Message' }),
        sections: fields.array(
          fields.object({
            time: fields.text({ label: 'Time' }),
            title: fields.text({ label: 'Title' }),
          }),
          { label: 'Sections' }
        ),
        transcription: fields.array(
          fields.object({
            time: fields.text({ label: 'Time' }),
            speaker: fields.text({ label: 'Speaker' }),
            text: fields.text({ label: 'Text', multiline: true }),
          }),
          { label: 'Transcription' }
        ),
        content: fields.document({
          label: 'Content',
          formatting: true,
          dividers: true,
          links: true,
          images: true,
        }),
      },
    }),
    guests: collection({
      label: 'Invitados',
      slugField: 'name',
      path: 'src/content/guests/*',
      format: { contentField: 'content' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        image: fields.text({ label: 'Image URL' }),
        role: fields.text({ label: 'Role' }),
        description: fields.text({ label: 'Description', multiline: true }),
        social: fields.object({
            twitter: fields.text({ label: 'Twitter' }),
            instagram: fields.text({ label: 'Instagram' }),
            website: fields.text({ label: 'Website' }),
        }),
        content: fields.document({
          label: 'Bio / Content',
          formatting: true,
          dividers: true,
          links: true,
          images: true,
        }),
      },
    }),
  },
});
