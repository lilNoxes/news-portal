import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import dotenv from 'dotenv';
import db from './db.js';
import { fetchAllNews } from './newsFetcher.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
      whereClauses.push('(title LIKE @search OR description LIKE @search)');
      params.search = `%${q}%`;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count query
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM articles ${whereSql}`).get(params);
    const total = countRow ? countRow.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Articles query
    const articles = db.prepare(`
      SELECT id, guid, title, link, description, pub_date, pub_timestamp, source, category, image_url, created_at
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

// 3. POST /api/news/refresh - Trigger manual update
let isFetching = false;
app.post('/api/news/refresh', async (req, res) => {
  if (isFetching) {
    return res.json({ success: true, message: 'Обновление уже выполняется...', alreadyRunning: true });
  }

  try {
    isFetching = true;
    const result = await fetchAllNews();
    res.json({ success: true, totalAdded: result.totalAdded });
  } catch (err) {
    console.error('Error in manual refresh:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    isFetching = false;
  }
});

// 4. GET /api/sources - Get all sources
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

// 5. POST /api/sources - Add a new RSS source
app.post('/api/sources', (req, res) => {
  try {
    const { name, url, category } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, error: 'Имя и URL обязательны' });
    }

    const info = db.prepare(`
      INSERT INTO sources (name, url, category, enabled)
      VALUES (?, ?, ?, 1)
    `).run(name.trim(), url.trim(), (category || 'Главное').trim());

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. PUT /api/sources/:id/toggle - Toggle source enabled/disabled
app.put('/api/sources/:id/toggle', (req, res) => {
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

// 7. DELETE /api/sources/:id - Delete a source
app.delete('/api/sources/:id', (req, res) => {
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

// Start Express server
app.listen(PORT, () => {
  console.log(`🚀 News Server running on http://localhost:${PORT}`);

  // Schedule auto-fetch every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('⏰ Scheduled cron: starting auto-refresh of news...');
    try {
      await fetchAllNews();
    } catch (err) {
      console.error('Scheduled fetch error:', err);
    }
  });

  // Initial fetch on server start if database has fewer than 20 articles
  const count = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
  if (count < 20) {
    console.log(`Database has only ${count} articles. Launching initial fetch...`);
    fetchAllNews().catch(err => console.error('Initial fetch error:', err));
  }
});
