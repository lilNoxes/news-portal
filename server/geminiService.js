import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || '';

// Ordered list of Flash models with automatic fallback
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest'
].filter(Boolean);

let aiClient = null;

function getAiClient() {
  if (!API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiClient;
}

/**
 * Execute generateContent with automatic fallback across supported model candidates
 */
async function generateContentWithFallback(ai, prompt, config) {
  let lastError = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config
      });
      if (response && response.text) {
        return response;
      }
    } catch (err) {
      console.warn(`[Gemini AI] Model "${model}" failed: ${err.message}. Trying next candidate...`);
      lastError = err;
    }
  }
  throw lastError || new Error('Все модели-кандидаты Gemini недоступны');
}

/**
 * Check if Gemini AI features are configured and available
 */
export function isAiAvailable() {
  return Boolean(API_KEY && API_KEY.trim().length > 10);
}

/**
 * Generate 3 key bullet points (TL;DR) for an article
 */
export async function summarizeArticle(articleId) {
  if (!articleId) {
    throw new Error('ID статьи обязателен');
  }

  // 1. Fetch article from DB
  const article = db.prepare('SELECT id, title, description, content, source, ai_summary FROM articles WHERE id = ?').get(articleId);
  if (!article) {
    throw new Error('Статья не найдена');
  }

  // 2. Return cached summary if already generated
  if (article.ai_summary && article.ai_summary.trim().length > 0) {
    return {
      success: true,
      summary: article.ai_summary,
      cached: true
    };
  }

  // 3. Verify Gemini API Key
  if (!isAiAvailable()) {
    return {
      success: false,
      notConfigured: true,
      error: 'Для работы AI-функций укажите GEMINI_API_KEY в файле .env или настройках сервера.',
      summary: null
    };
  }

  try {
    const ai = getAiClient();
    const sourceText = (article.content || article.description || article.title).substring(0, 3000);

    const prompt = `Ты — ведущий аналитик новостного агентства. 
Выдели ровно 3 самых главных, емких и конкретных факта из приведенной новости.
Требования:
- Ровно 3 пункта, каждый начинается с символа "• "
- Без вводных слов вроде "В этой новости...", только голые факты
- Язык: русский
- Длина каждого пункта: 1-2 предложения

Заголовок: ${article.title}
Источник: ${article.source}
Текст новости:
${sourceText}`;

    const response = await generateContentWithFallback(ai, prompt, {
      temperature: 0.2,
      maxOutputTokens: 500
    });

    const summary = response.text ? response.text.trim() : '';

    if (summary) {
      // Save to database cache
      db.prepare('UPDATE articles SET ai_summary = ? WHERE id = ?').run(summary, article.id);
      return {
        success: true,
        summary,
        cached: false
      };
    } else {
      throw new Error('Пустой ответ от модели Gemini');
    }
  } catch (err) {
    console.error('Error generating AI summary:', err.message);
    let userMsg = err.message;
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.error?.message) userMsg = parsed.error.message;
    } catch {}
    return {
      success: false,
      error: 'Ошибка генерации выжимки: ' + userMsg,
      summary: null
    };
  }
}

/**
 * Generate or get cached daily news digest
 */
export async function getDailyDigest() {
  const currentPeriod = new Date().toISOString().substring(0, 13); // Cache key by hour: YYYY-MM-DDTHH

  // 1. Check cache in database (valid for current hour)
  const cached = db.prepare('SELECT * FROM ai_digests WHERE period = ? ORDER BY id DESC LIMIT 1').get(currentPeriod);
  if (cached) {
    return {
      success: true,
      digest: cached.summary,
      headline: cached.headline,
      cached: true,
      created_at: cached.created_at
    };
  }

  // Check if any digest was generated in the last 2 hours
  const recent = db.prepare(`
    SELECT * FROM ai_digests 
    WHERE created_at >= datetime('now', '-2 hours') 
    ORDER BY id DESC LIMIT 1
  `).get();

  if (recent) {
    return {
      success: true,
      digest: recent.summary,
      headline: recent.headline,
      cached: true,
      created_at: recent.created_at
    };
  }

  // 2. Check API Key
  if (!isAiAvailable()) {
    return {
      success: false,
      notConfigured: true,
      error: 'Для работы AI-дайджеста укажите GEMINI_API_KEY в файле .env сервера.',
      digest: null
    };
  }

  try {
    const ai = getAiClient();

    // 3. Select top 12 fresh news articles across different categories
    const topArticles = db.prepare(`
      SELECT title, description, source, category 
      FROM articles 
      WHERE pub_timestamp >= (strftime('%s', 'now') - 86400) * 1000
      ORDER BY pub_timestamp DESC 
      LIMIT 15
    `).all();

    if (!topArticles || topArticles.length === 0) {
      return {
        success: false,
        error: 'Недостаточно свежих новостей за последние 24 часа для формирования дайджеста.'
      };
    }

    const newsContext = topArticles
      .map((a, i) => `${i + 1}. [${a.category}] ${a.title} (${a.source}): ${a.description}`)
      .join('\n');

    const prompt = `Ты — главный редактор новостного портала «ИнфоЛента».
На основе списка свежих новостей за последние 24 часа подготовь краткий структурированный дайджест «Картина дня».

Формат ответа:
Сначала напиши одну строку:
HEADLINE: [Один яркий объединяющий заголовок дня]

Затем краткий обзор по 3-4 ключевым темам дня в формате:
📌 **[Тема 1: Название тренда/события]**
Краткая суть того, что произошло и почему это важно (2-3 предложения).

📌 **[Тема 2: Название тренда/события]**
Краткая суть (2-3 предложения).

📌 **[Тема 3: Название тренда/события]**
Краткая суть (2-3 предложения).

Список событий:
${newsContext}`;

    const response = await generateContentWithFallback(ai, prompt, {
      temperature: 0.3,
      maxOutputTokens: 1000
    });

    const rawText = response.text ? response.text.trim() : '';
    let headline = 'Главные события дня';
    let summary = rawText;

    if (rawText.includes('HEADLINE:')) {
      const parts = rawText.split('HEADLINE:');
      const headlineLine = parts[1].split('\n')[0].trim();
      if (headlineLine) {
        headline = headlineLine;
      }
      summary = parts[1].substring(headlineLine.length).trim();
    }

    // Save to database
    db.prepare(`
      INSERT OR REPLACE INTO ai_digests (period, summary, headline)
      VALUES (?, ?, ?)
    `).run(currentPeriod, summary, headline);

    return {
      success: true,
      digest: summary,
      headline,
      cached: false,
      created_at: new Date().toISOString()
    };
  } catch (err) {
    console.error('Error generating daily digest:', err.message);
    let userMsg = err.message;
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.error?.message) userMsg = parsed.error.message;
    } catch {}
    return {
      success: false,
      error: 'Ошибка генерации дайджеста: ' + userMsg
    };
  }
}
