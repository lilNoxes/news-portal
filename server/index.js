import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import db, { cleanupOldArticles } from './db.js';
import { fetchAllNews } from './newsFetcher.js';
import { isAiAvailable, summarizeArticle, getDailyDigest } from './geminiService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../client/dist');

// Admin credentials
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const AUTH_SECRET = process.env.AUTH_SECRET || 'news-portal-auth-secret-key-2026';

function generateToken() {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${expiresAt}.${nonce}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expiresAtStr, nonce, sig] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;
  const payload = `${expiresAtStr}.${nonce}`;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  if (sig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Требуется авторизация администратора' });
  }
  const token = authHeader.split(' ')[1];
  try {
    if (!verifyToken(token)) {
      return res.status(401).json({ success: false, error: 'Сессия истекла или недействительна' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Ошибка проверки авторизации' });
  }
}

/**
 * Sanitize and format query for SQLite FTS5 prefix matching
 */
function formatFtsQuery(query) {
  if (!query) return null;
  // Match words with Unicode support (Cyrillic + Latin + numbers)
  const words = query.match(/[\p{L}\p{N}]+/gu);
  if (!words || words.length === 0) return null;
  // Use prefix matching for each word: "слово"* AND "след"*
  return words.map(w => `"${w}"*`).join(' AND ');
}

/**
 * Validate RSS URL against SSRF (Server-Side Request Forgery)
 */
function validateRssUrl(inputUrl) {
  try {
    const parsed = new URL(inputUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Разрешены только протоколы http:// и https://' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return { valid: false, error: 'Доступ к локальным адресам запрещен' };
    }

    // Block private/internal IPv4 and IPv6
    if (
      hostname === '0.0.0.0' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return { valid: false, error: 'Доступ к приватным и внутренним адресам сети запрещен' };
    }

    return { valid: true, sanitizedUrl: parsed.href };
  } catch {
    return { valid: false, error: 'Некорректный формат URL' };
  }
}

const app = express();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // не более 5 попыток на IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Слишком много попыток входа. Пожалуйста, подождите 15 минут.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 120, // не более 120 запросов в минуту
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Слишком много запросов. Пожалуйста, повторите позже.' }
});

app.disable('x-powered-by');

// Security Headers Middleware (HSTS, nosniff, frame-options, referrer-policy)
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(compression());
app.use(cors());
app.use(express.json());
app.use('/api/', apiLimiter);
app.use(express.static(clientDistPath));

// Health check endpoint for cloud platforms
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Admin Auth Endpoints
app.post('/api/admin/login', loginLimiter, (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Пароль обязателен' });
    }
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, error: 'Неверный пароль администратора' });
    }
    const token = generateToken();
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ success: true, isAdmin: true });
});

// 1. GET /api/news - List articles with pagination, category filter, and search
app.get('/api/news', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 24));
    const offset = (page - 1) * limit;

    const category = req.query.category || '';
    const source = req.query.source || '';
    const q = req.query.q ? req.query.q.trim() : '';

    let whereClauses = [];
    let params = {};

    if (category && category !== 'Все' && category !== 'all') {
      whereClauses.push('category = @category');
      params.category = category;
    }

    if (source) {
      whereClauses.push('source = @source');
      params.source = source;
    }

    if (q) {
      const ftsQuery = formatFtsQuery(q);
      if (ftsQuery) {
        whereClauses.push('articles.id IN (SELECT rowid FROM articles_fts WHERE articles_fts MATCH @ftsQuery)');
        params.ftsQuery = ftsQuery;
      } else {
        whereClauses.push('(title LIKE @search OR description LIKE @search)');
        params.search = `%${q}%`;
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count query
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM articles ${whereSql}`).get(params);
    const total = countRow ? countRow.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Articles query
    const articles = db.prepare(`
      SELECT id, guid, title, link, description, content, ai_summary, pub_date, pub_timestamp, source, category, image_url, created_at
      FROM articles
      ${whereSql}
      ORDER BY pub_timestamp DESC
      LIMIT @limit OFFSET @offset
    `).all({ ...params, limit, offset });

    // Distinct categories for quick filtering
    const categoriesRows = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM articles 
      GROUP BY category 
      ORDER BY count DESC
    `).all();

    res.json({
      success: true,
      articles,
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      categories: categoriesRows
    });
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /api/news/:id - Get single article detail
app.get('/api/news/:id', (req, res) => {
  try {
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, error: 'Новость не найдена' });
    }
    res.json({ success: true, article });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Feature Endpoints
// Check AI status
app.get('/api/ai/status', (req, res) => {
  res.json({ success: true, available: isAiAvailable() });
});

// Generate or get cached AI TL;DR summary for an article
app.post('/api/ai/summarize/:id', async (req, res) => {
  try {
    const result = await summarizeArticle(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get or generate daily AI news digest
app.get('/api/ai/digest', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const result = await getDailyDigest(force);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/news/refresh - Trigger manual update (Admin only)
app.post('/api/news/refresh', requireAdmin, async (req, res) => {
  try {
    const result = await fetchAllNews();
    res.json({ success: true, totalAdded: result.totalAdded, alreadyRunning: result.alreadyRunning });
  } catch (err) {
    console.error('Error in manual refresh:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET /api/sources - Get all sources (Public read)
app.get('/api/sources', (req, res) => {
  try {
    const sources = db.prepare(`
      SELECT s.*, (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id) as article_count
      FROM sources s
      ORDER BY s.id ASC
    `).all();
    res.json({ success: true, sources });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/sources - Add a new RSS source (Admin only)
app.post('/api/sources', requireAdmin, (req, res) => {
  try {
    const { name, url, category } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, error: 'Имя и URL обязательны' });
    }

    const validation = validateRssUrl(url.trim());
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const info = db.prepare(`
      INSERT INTO sources (name, url, category, enabled)
      VALUES (?, ?, ?, 1)
    `).run(name.trim(), validation.sanitizedUrl, (category || 'Главное').trim());

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. PUT /api/sources/:id/toggle - Toggle source enabled/disabled (Admin only)
app.put('/api/sources/:id/toggle', requireAdmin, (req, res) => {
  try {
    const source = db.prepare('SELECT enabled FROM sources WHERE id = ?').get(req.params.id);
    if (!source) {
      return res.status(404).json({ success: false, error: 'Источник не найден' });
    }

    const newStatus = source.enabled ? 0 : 1;
    db.prepare('UPDATE sources SET enabled = ? WHERE id = ?').run(newStatus, req.params.id);
    res.json({ success: true, enabled: newStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. DELETE /api/sources/:id - Delete a source (Admin only)
app.delete('/api/sources/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM sources WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET /api/stats - Statistics
app.get('/api/stats', (req, res) => {
  try {
    const totalArticles = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
    const latestArticle = db.prepare('SELECT pub_date FROM articles ORDER BY pub_timestamp DESC LIMIT 1').get();
    const activeSources = db.prepare('SELECT COUNT(*) as count FROM sources WHERE enabled = 1').get().count;
    
    res.json({
      success: true,
      totalArticles,
      latestPubDate: latestArticle ? latestArticle.pub_date : null,
      activeSources
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. SEO & Bot Endpoints: robots.txt
app.get('/robots.txt', (req, res) => {
  const robotsDistPath = path.join(clientDistPath, 'robots.txt');
  const robotsPublicPath = path.join(__dirname, '../client/public/robots.txt');
  if (fs.existsSync(robotsDistPath)) {
    return res.type('text/plain').sendFile(robotsDistPath);
  } else if (fs.existsSync(robotsPublicPath)) {
    return res.type('text/plain').sendFile(robotsPublicPath);
  }
  res.type('text/plain').send("User-agent: *\nAllow: /\nDisallow: /api/admin/\nSitemap: https://newsjqke.infrlo.com/sitemap.xml\n");
});

// 10. SEO & Bot Endpoints: llms.txt (Perplexity, ChatGPT Search, Claude)
app.get('/llms.txt', (req, res) => {
  const llmsDistPath = path.join(clientDistPath, 'llms.txt');
  const llmsPublicPath = path.join(__dirname, '../client/public/llms.txt');
  if (fs.existsSync(llmsDistPath)) {
    return res.type('text/plain').sendFile(llmsDistPath);
  } else if (fs.existsSync(llmsPublicPath)) {
    return res.type('text/plain').sendFile(llmsPublicPath);
  }
  res.type('text/plain').send("# ИнфоЛента (InfoLenta) — AI News Aggregator\nhttps://newsjqke.infrlo.com/\n");
});

// 11. Dynamic XML Sitemap with Google News extension
app.get('/sitemap.xml', (req, res) => {
  try {
    const baseUrl = 'https://newsjqke.infrlo.com';
    const categories = ['Главное', 'В мире', 'Технологии', 'Бизнес', 'Наука'];
    
    // Fetch latest 300 articles from SQLite
    const articles = db.prepare(`
      SELECT id, title, link, pub_timestamp, category
      FROM articles
      ORDER BY pub_timestamp DESC
      LIMIT 300
    `).all();

    const nowIso = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`;

    // Homepage
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${nowIso}</lastmod>\n`;
    xml += `    <changefreq>always</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // Category pages
    for (const cat of categories) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/?category=${encodeURIComponent(cat)}</loc>\n`;
      xml += `    <lastmod>${nowIso}</lastmod>\n`;
      xml += `    <changefreq>hourly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Article entries
    for (const art of articles) {
      const artDate = art.pub_timestamp ? new Date(art.pub_timestamp).toISOString().split('T')[0] : nowIso;
      const escapedTitle = (art.title || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/?article=${art.id}</loc>\n`;
      xml += `    <lastmod>${artDate}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `    <news:news>\n`;
      xml += `      <news:publication>\n`;
      xml += `        <news:name>ИнфоЛента</news:name>\n`;
      xml += `        <news:language>ru</news:language>\n`;
      xml += `      </news:publication>\n`;
      xml += `      <news:publication_date>${artDate}</news:publication_date>\n`;
      xml += `      <news:title>${escapedTitle}</news:title>\n`;
      xml += `    </news:news>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=1800'); // Cache for 30 min
    res.send(xml);
  } catch (err) {
    console.error('Error generating sitemap.xml:', err);
    res.status(500).type('text/plain').send('Error generating sitemap');
  }
});

// 12. RSS 2.0 Feed for external readers and aggregators
app.get('/rss.xml', (req, res) => {
  try {
    const baseUrl = 'https://newsjqke.infrlo.com';
    const articles = db.prepare(`
      SELECT id, title, description, link, pub_date, pub_timestamp, category, source
      FROM articles
      ORDER BY pub_timestamp DESC
      LIMIT 100
    `).all();

    const nowRss = new Date().toUTCString();

    let rss = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
    rss += `  <channel>\n`;
    rss += `    <title>ИнфоЛента — Актуальные новости</title>\n`;
    rss += `    <link>${baseUrl}/</link>\n`;
    rss += `    <description>Оперативный новостной агрегатор с ИИ-выжимками и дайджестами событий</description>\n`;
    rss += `    <language>ru</language>\n`;
    rss += `    <lastBuildDate>${nowRss}</lastBuildDate>\n`;
    rss += `    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />\n`;

    for (const art of articles) {
      const artDate = art.pub_date || (art.pub_timestamp ? new Date(art.pub_timestamp).toUTCString() : nowRss);
      const cleanTitle = (art.title || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const cleanDesc = (art.description || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      rss += `    <item>\n`;
      rss += `      <title>${cleanTitle}</title>\n`;
      rss += `      <link>${art.link || `${baseUrl}/?article=${art.id}`}</link>\n`;
      rss += `      <guid isPermaLink="false">infolenta-art-${art.id}</guid>\n`;
      rss += `      <pubDate>${artDate}</pubDate>\n`;
      rss += `      <category>${art.category || 'Главное'}</category>\n`;
      rss += `      <source url="${baseUrl}/">${art.source || 'ИнфоЛента'}</source>\n`;
      rss += `      <description>${cleanDesc}</description>\n`;
      rss += `    </item>\n`;
    }

    rss += `  </channel>\n`;
    rss += `</rss>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=600'); // Cache for 10 min
    res.send(rss);
  } catch (err) {
    console.error('Error generating rss.xml:', err);
    res.status(500).type('text/plain').send('Error generating RSS feed');
  }
});

// Fallback route for SPA frontend with strict Soft 404 prevention
app.get('*', (req, res) => {
  // If the request points to a missing file with an extension, return true 404
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).type('text/plain').send('404 Not Found');
  }

  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!doctype html>
      <html>
        <head><title>ИнфоЛента API</title><meta charset="utf-8"></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2>🚀 Сервер новостей запущен!</h2>
          <p>Фронтенд еще не скомпилирован в client/dist.</p>
          <p>Проверьте API: <a href="/api/news">/api/news</a> | <a href="/health">/health</a></p>
        </body>
      </html>
    `);
  }
});

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// Start HTTP servers on all common cloud & dev ports (dual-stack IPv4)
const candidatePorts = [
  process.env.PORT,
  3000,
  3001,
  8080,
  5000
].filter(Boolean).map(p => parseInt(p, 10));

const portsToListen = [...new Set(candidatePorts)];
const activeServers = [];

for (const port of portsToListen) {
  try {
    const s = http.createServer(app);
    s.on('error', (err) => {
      // If port is already bound or unavailable, safely ignore
      console.log(`Port ${port} notice: ${err.message}`);
    });
    s.listen(port, '0.0.0.0', () => {
      console.log(`🚀 News Server listening on http://0.0.0.0:${port} (env.PORT: ${process.env.PORT || 'undefined'})`);
    });
    activeServers.push(s);
  } catch (err) {
    console.log(`Port ${port} error: ${err.message}`);
  }
}

// Schedule auto-fetch every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('⏰ Scheduled cron: starting auto-refresh of news...');
  try {
    await fetchAllNews();
  } catch (err) {
    console.error('Scheduled fetch error:', err);
  }
});

// Schedule daily cleanup of old news (older than 14 days) every night at 03:00
cron.schedule('0 3 * * *', () => {
  console.log('⏰ Scheduled cron: running daily retention cleanup...');
  try {
    cleanupOldArticles(14);
  } catch (err) {
    console.error('Scheduled cleanup error:', err);
  }
});

// Defer initial fetch and initial cleanup so server answers health checks immediately
setTimeout(() => {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
    if (count < 20) {
      console.log(`Database has only ${count} articles. Launching background initial fetch...`);
      fetchAllNews().catch(err => console.error('Initial fetch error:', err));
    }
  } catch (err) {
    console.error('Error starting initial fetch:', err);
  }

  // Also run retention cleanup in the background
  try {
    cleanupOldArticles(14);
  } catch (err) {
    console.error('Error during initial cleanup:', err);
  }
}, 2000);

// Graceful Shutdown for cloud containers and process signals
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  let closed = 0;
  const finish = () => {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      console.log('✓ SQLite database checkpointed and closed cleanly.');
    } catch (err) {
      console.error('Error closing database during shutdown:', err);
    }
    process.exit(0);
  };

  if (activeServers.length === 0) {
    finish();
  } else {
    for (const s of activeServers) {
      s.close(() => {
        closed++;
        if (closed >= activeServers.length) {
          console.log('✓ All HTTP servers closed.');
          finish();
        }
      });
    }
  }

  // Force kill if graceful close hangs
  setTimeout(() => {
    console.error('⚠️ Forcing process exit after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
