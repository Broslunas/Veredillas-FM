import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no está definido en el archivo .env');
  process.exit(1);
}

const SCHOOL_YEAR = '2025/2026';

// Copia literal de src/data/team.ts (orden original conservado vía `order`)
const teamMembers = [
  {
    name: 'Miguel Salazar',
    role: 'Estrategia Digital',
    department: 'Dirección',
    image: 'https://iili.io/f8u8VQS.jpg',
    links: [{ label: 'Instagram', url: 'https://www.instagram.com/miguelslzzz/' }],
    bio: 'Encargado de la estrategia digital y la visión a largo plazo del proyecto. Miguel coordina los esfuerzos para asegurar que Veredillas FM llegue a cada rincón de nuestra comunidad.',
  },
  {
    name: 'Pablo Luna',
    role: 'Lead Dev, Sonido, Redactor & Estrategia',
    department: 'Tecnología',
    image: 'https://i.imgur.com/G4IX2d0.jpeg',
    links: [{ label: 'Instagram', url: 'https://www.instagram.com/_pablito_luna_/' }],
    bio: 'Responsable de la infraestructura técnica, calidad sonora y estrategia digital. Pablo lidera el desarrollo web, la redacción y asegura el crecimiento del proyecto.',
  },
  {
    name: 'Abel Fernández',
    role: 'Guionista y Co-Dirección',
    department: 'Dirección',
    image: 'https://iili.io/fzO4DGV.jpg',
    links: [],
    bio: 'La mente creativa detrás de nuestros guiones. Abel estructura las historias que contamos y co-dirige la producción de contenidos.',
  },
  {
    name: 'Dylan Jorge',
    role: 'Redactor Jefe',
    department: 'Dirección',
    image: 'https://iili.io/fzObDbI.jpg',
    links: [],
    bio: 'Supervisor de redacción y contenidos. Dylan asegura la coherencia editorial y la calidad de cada texto que publicamos.',
  },
  {
    name: 'Pablo Santamaría',
    role: 'Diseño Web & UX',
    department: 'Tecnología',
    image: 'https://iili.io/fzetcMu.jpg',
    links: [{ label: 'Instagram', url: 'https://www.instagram.com/pabl0.sp/' }],
    bio: 'Diseñador centrado en la experiencia de usuario. Pablo S. da forma visual a nuestra plataforma web para que sea intuitiva y atractiva.',
  },
  {
    name: 'Omar Reyes',
    role: 'Desarrollo Web',
    department: 'Tecnología',
    image: 'https://iili.io/fze34sV.jpg',
    links: [{ label: 'Instagram', url: 'https://www.instagram.com/ereyes_magos/' }],
    bio: 'Desarrollador web enfocado en la implementación de nuevas funcionalidades y el mantenimiento del sitio.',
  },
  {
    name: 'Pablo Pérez',
    role: 'Locutor y Colaborador',
    department: 'Voces',
    image: 'https://iili.io/fze0awJ.jpg',
    links: [{ label: 'Instagram', url: 'https://www.instagram.com/__pabloprz/' }],
    bio: 'Una de las voces principales de Veredillas FM. Pablo P. aporta carisma y dinamismo a nuestras grabaciones.',
  },
  {
    name: 'Gustavo',
    role: 'Relevo de Dirección (Próximo Curso)',
    department: 'Dirección',
    image: 'https://cdn.veredillasfm.es/guest/gustavo.png',
    links: [{ label: 'Instagram', url: 'https://www.instagram.com/gustavito_10_/' }],
    bio: 'Será el encargado de tomar el relevo de toda la radio del instituto de cara al próximo curso escolar, liderando la programación y la coordinación de contenidos.',
  },
];

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
}

const TeamSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: { type: String },
    department: { type: String },
    image: { type: String },
    schoolYear: { type: String, required: true, index: true },
    order: { type: Number, default: 0 },
    links: {
      type: [
        {
          label: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },
    bio: { type: String },
  },
  { timestamps: true, collection: 'teams' }
);

const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);

async function migrate() {
  console.log('🔌 Conectando a MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado con éxito');

  console.log(`👥 Migrando ${teamMembers.length} miembros del equipo (curso ${SCHOOL_YEAR})...`);
  for (const [index, member] of teamMembers.entries()) {
    const slug = slugify(member.name);
    await Team.findOneAndUpdate(
      { slug },
      {
        slug,
        name: member.name,
        role: member.role,
        department: member.department,
        image: member.image,
        schoolYear: SCHOOL_YEAR,
        order: index,
        links: member.links,
        bio: member.bio,
      },
      { upsert: true, new: true }
    );
  }
  console.log('✅ Equipo migrado');

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Error durante la migración:', err);
  process.exit(1);
});
