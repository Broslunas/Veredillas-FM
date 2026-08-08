import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no está definido en el archivo .env');
  process.exit(1);
}

// Model Schemas
const EpisodeSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    pubDate: { type: Date, required: true },
    author: { type: String, default: 'Veredillas FM' },
    image: { type: String },
    spotifyUrl: { type: String },
    audioUrl: { type: String },
    duration: { type: String },
    season: { type: Number },
    episode: { type: Number },
    videoUrl: { type: String },
    tags: { type: [String], default: ['General'] },
    participants: { type: [String] },
    isPremiere: { type: Boolean, default: false },
    transcription: [
      {
        time: { type: String, required: true },
        text: { type: String, required: true },
        speaker: { type: String },
      },
    ],
    sections: [
      {
        title: { type: String, required: true },
        time: { type: String, required: true },
      },
    ],
    warningMessage: { type: String },
    clips: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    quiz: [
      {
        question: { type: String, required: true },
        options: { type: [String], required: true },
        correctAnswer: { type: Number, required: true },
      },
    ],
    body: { type: String, default: '' },
  },
  { timestamps: true, collection: 'episodecontents' }
);

const BlogSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    pubDate: { type: Date, required: true },
    author: { type: String, default: 'Redacción Veredillas' },
    image: { type: String },
    tags: { type: [String] },
    body: { type: String, default: '' },
  },
  { timestamps: true, collection: 'blogposts' }
);

const GuestSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    image: { type: String },
    role: { type: String },
    description: { type: String },
    social: {
      twitter: { type: String },
      instagram: { type: String },
      website: { type: String },
    },
    body: { type: String, default: '' },
  },
  { timestamps: true, collection: 'guests' }
);

const GallerySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    images: [
      {
        title: { type: String, required: true },
        src: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], default: 'image' },
        thumbnail: { type: String },
        featured: { type: Boolean, default: false },
      },
    ],
    body: { type: String, default: '' },
  },
  { timestamps: true, collection: 'gallerycategories' }
);

const EpisodeContent = mongoose.models.EpisodeContent || mongoose.model('EpisodeContent', EpisodeSchema);
const BlogPost = mongoose.models.BlogPost || mongoose.model('BlogPost', BlogSchema);
const Guest = mongoose.models.Guest || mongoose.model('Guest', GuestSchema);
const GalleryCategory = mongoose.models.GalleryCategory || mongoose.model('GalleryCategory', GallerySchema);

async function migrate() {
  console.log('🔌 Conectando a MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado con éxito');

  // 1. Migrar Episodios
  const episodiosDir = path.join(process.cwd(), 'src/content/episodios');
  if (fs.existsSync(episodiosDir)) {
    const files = fs.readdirSync(episodiosDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    console.log(`🎙️ Migrando ${files.length} episodios...`);
    for (const file of files) {
      const slug = path.basename(file, path.extname(file));
      const content = fs.readFileSync(path.join(episodiosDir, file), 'utf-8');
      const { data, content: body } = matter(content);

      await EpisodeContent.findOneAndUpdate(
        { slug },
        {
          slug,
          title: data.title,
          description: data.description,
          pubDate: data.pubDate ? new Date(data.pubDate) : new Date(),
          author: data.author || 'Veredillas FM',
          image: data.image,
          spotifyUrl: data.spotifyUrl,
          audioUrl: data.audioUrl,
          duration: data.duration,
          season: data.season,
          episode: data.episode,
          videoUrl: data.videoUrl,
          tags: data.tags || ['General'],
          participants: data.participants,
          isPremiere: Boolean(data.isPremiere),
          transcription: data.transcription,
          sections: data.sections,
          warningMessage: data.warningMessage,
          clips: data.clips,
          quiz: data.quiz,
          body,
        },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Episodios migrados');
  }

  // 2. Migrar Blog
  const blogDir = path.join(process.cwd(), 'src/content/blog');
  if (fs.existsSync(blogDir)) {
    const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    console.log(`📝 Migrando ${files.length} entradas de blog...`);
    for (const file of files) {
      const slug = path.basename(file, path.extname(file));
      const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
      const { data, content: body } = matter(content);

      await BlogPost.findOneAndUpdate(
        { slug },
        {
          slug,
          title: data.title,
          description: data.description,
          pubDate: data.pubDate ? new Date(data.pubDate) : new Date(),
          author: data.author || 'Redacción Veredillas',
          image: data.image,
          tags: data.tags,
          body,
        },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Entradas de blog migradas');
  }

  // 3. Migrar Invitados
  const guestsDir = path.join(process.cwd(), 'src/content/guests');
  if (fs.existsSync(guestsDir)) {
    const files = fs.readdirSync(guestsDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    console.log(`👥 Migrando ${files.length} invitados...`);
    for (const file of files) {
      const slug = path.basename(file, path.extname(file));
      const content = fs.readFileSync(path.join(guestsDir, file), 'utf-8');
      const { data, content: body } = matter(content);

      await Guest.findOneAndUpdate(
        { slug },
        {
          slug,
          name: data.name,
          image: data.image,
          role: data.role,
          description: data.description,
          social: data.social,
          body,
        },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Invitados migrados');
  }

  // 4. Migrar Galería
  const galleryDir = path.join(process.cwd(), 'src/content/gallery');
  if (fs.existsSync(galleryDir)) {
    const files = fs.readdirSync(galleryDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    console.log(`🖼️ Migrando ${files.length} categorías de galería...`);
    for (const file of files) {
      const slug = path.basename(file, path.extname(file));
      const content = fs.readFileSync(path.join(galleryDir, file), 'utf-8');
      const { data, content: body } = matter(content);

      await GalleryCategory.findOneAndUpdate(
        { slug },
        {
          slug,
          category: data.category,
          images: data.images,
          body,
        },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Galería migrada');
  }

  console.log('🎉 Migración completada con éxito');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Error durante la migración:', err);
  process.exit(1);
});
