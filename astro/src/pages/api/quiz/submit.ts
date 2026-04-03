import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';
import QuizResult from '../../../models/QuizResult';
import UserAchievement from '../../../models/UserAchievement';
import { ACHIEVEMENTS } from '../../../lib/achievements';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Debes iniciar sesión para guardar tus resultados.' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { episodeSlug, score, totalQuestions, timeSpent } = await request.json();

    if (!episodeSlug || score === undefined || !totalQuestions || timeSpent === undefined) {
      return new Response(JSON.stringify({ error: 'Datos incompletos.' }), { status: 400 });
    }

    // Clean and normalize slug
    const cleanSlug = episodeSlug.toLowerCase().split('?')[0].replace(/\/$/, '');

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (MONGODB_URI) await mongoose.connect(MONGODB_URI);
    }

    // 1. Save the new result
    const newResult = await QuizResult.create({
      userId: userPayload.userId,
      episodeSlug: cleanSlug,
      score,
      totalQuestions,
      timeSpent,
      createdAt: new Date()
    });

    // 2. Calculate achievements
    // Count distinct episodes completed by the user
    const distinctEpisodesRaw = await QuizResult.distinct('episodeSlug', { userId: userPayload.userId });
    const totalQuizzesCount = distinctEpisodesRaw.length;

    const unlockedNow = [];

    // Quiz Milestones
    const milestones = [
      { id: 'primer_quiz', target: 1 },
      { id: 'estudiante_aplicado', target: 5 },
      { id: 'maestro_examen', target: 10 },
      { id: 'enciclopedia_viviente', target: 25 },
      { id: 'leyenda_veredillas', target: 50 },
    ];

    for (const milestone of milestones) {
      if (totalQuizzesCount >= milestone.target) {
        const existing = await UserAchievement.findOne({ 
          userId: userPayload.userId, 
          achievementId: milestone.id 
        });
        
        if (!existing) {
          const achievementDef = ACHIEVEMENTS.find(a => a.id === milestone.id);
          if (achievementDef) {
            await UserAchievement.create({
              userId: userPayload.userId,
              achievementId: milestone.id,
              unlockedAt: new Date()
            });
            unlockedNow.push(achievementDef);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      unlockedNow,
      totalQuizzesCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Quiz Submit API Entry Point]', error);
    return new Response(JSON.stringify({ error: 'Error al guardar el resultado.' }), { status: 500 });
  }
};
