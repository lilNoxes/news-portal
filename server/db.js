import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'news.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_fetched_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guid TEXT UNIQUE,
    title TEXT NOT NULL,
    link TEXT NOT NULL UNIQUE,
    description TEXT,
    content TEXT,
    pub_date TEXT,
    pub_timestamp INTEGER,
    source TEXT NOT NULL,
    source_id INTEGER,
    category TEXT NOT NULL,
    image_url TEXT,
    ai_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_id) REFERENCES sources(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_digests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    headline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_articles_pub_timestamp ON articles(pub_timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
  CREATE INDEX IF NOT EXISTS idx_articles_link ON articles(link);

  -- Full-Text Search Virtual Table (FTS5) using unicode61 tokenizer for Cyrillic and Latin
  CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title,
    description,
    content,
    tokenize='unicode61 remove_diacritics 2'
  );

  -- Automatic FTS synchronization triggers
  CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
    INSERT INTO articles_fts(rowid, title, description, content)
    VALUES (new.id, new.title, coalesce(new.description, ''), coalesce(new.content, ''));
  END;

  CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
    DELETE FROM articles_fts WHERE rowid = old.id;
  END;

  CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
    DELETE FROM articles_fts WHERE rowid = old.id;
    INSERT INTO articles_fts(rowid, title, description, content)
    VALUES (new.id, new.title, coalesce(new.description, ''), coalesce(new.content, ''));
  END;
`);

// Migration and sync: upgrade FTS table to standalone if external content was used
try {
  const ftsMaster = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'articles_fts'").get();
  if (ftsMaster && ftsMaster.sql && ftsMaster.sql.includes("content='articles'")) {
    console.log('🔄 Upgrading FTS5 table to robust standalone mode...');
    db.exec(`
      DROP TRIGGER IF EXISTS articles_ai;
      DROP TRIGGER IF EXISTS articles_ad;
      DROP TRIGGER IF EXISTS articles_au;
      DROP TABLE IF EXISTS articles_fts;
      CREATE VIRTUAL TABLE articles_fts USING fts5(
        title,
        description,
        content,
        tokenize='unicode61 remove_diacritics 2'
      );
      CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
        INSERT INTO articles_fts(rowid, title, description, content)
        VALUES (new.id, new.title, coalesce(new.description, ''), coalesce(new.content, ''));
      END;
      CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
        DELETE FROM articles_fts WHERE rowid = old.id;
      END;
      CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
        DELETE FROM articles_fts WHERE rowid = old.id;
        INSERT INTO articles_fts(rowid, title, description, content)
        VALUES (new.id, new.title, coalesce(new.description, ''), coalesce(new.content, ''));
      END;
    `);
  }

  const articlesCount = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
  const ftsCount = db.prepare('SELECT COUNT(*) as count FROM articles_fts').get().count;
  if (ftsCount < articlesCount) {
    console.log(`Syncing FTS index (${ftsCount} -> ${articlesCount} articles)...`);
    db.exec(`
      DELETE FROM articles_fts;
      INSERT INTO articles_fts(rowid, title, description, content)
      SELECT id, title, coalesce(description, ''), coalesce(content, '') FROM articles;
    `);
  }
} catch (err) {
  console.warn('Notice: FTS migration/rebuild check:', err.message);
}

// Migration: ensure ai_summary column exists in existing database
try {
  const tableCols = db.prepare("PRAGMA table_info(articles)").all();
  const hasAiSummary = tableCols.some(c => c.name === 'ai_summary');
  if (!hasAiSummary) {
    console.log('🔄 Adding ai_summary column to articles table...');
    db.exec("ALTER TABLE articles ADD COLUMN ai_summary TEXT;");
  }
} catch (err) {
  console.warn('Notice: ai_summary migration check:', err.message);
}

// Pre-populate default sources if table is empty
const defaultSources = [
  { name: 'ТАСС (Главное)', url: 'https://tass.ru/rss/v2.xml', category: 'Главное' },
  { name: 'Интерфакс', url: 'https://www.interfax.ru/rss.asp', category: 'Главное' },
  { name: 'РБК Главное', url: 'https://rssexport.rbc.ru/rbcnews/news/30/full.rss', category: 'Главное' },
  { name: 'Lenta.ru', url: 'https://lenta.ru/rss/news', category: 'Главное' },
  { name: 'Ведомости (Бизнес)', url: 'https://www.vedomosti.ru/rss/news', category: 'Бизнес' },
  { name: 'Коммерсантъ', url: 'https://www.kommersant.ru/RSS/news.xml', category: 'Бизнес' },
  { name: 'Хабр (IT & Разработка)', url: 'https://habr.com/ru/rss/all/all/', category: 'Технологии' },
  { name: '3DNews (Гаджеты и IT)', url: 'https://3dnews.ru/news/rss/', category: 'Технологии' },
  { name: 'CNews (Высокие технологии)', url: 'https://www.cnews.ru/inc/rss/news.xml', category: 'Технологии' },
  { name: 'N+1 (Наука)', url: 'https://nplus1.ru/rss', category: 'Наука' }
];

const insertSource = db.prepare(`
  INSERT OR IGNORE INTO sources (name, url, category, enabled)
  VALUES (@name, @url, @category, 1)
`);

const insertMany = db.transaction((sources) => {
  for (const src of sources) {
    insertSource.run(src);
  }
});

insertMany(defaultSources);

/**
 * Remove articles older than specified days to prevent unbounded database growth.
 */
export function cleanupOldArticles(retentionDays = 14) {
  try {
    const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const info = db.prepare('DELETE FROM articles WHERE pub_timestamp < ?').run(cutoffTimestamp);
    if (info.changes > 0) {
      console.log(`🧹 [Retention] Cleaned up ${info.changes} old articles older than ${retentionDays} days.`);
      try {
        db.pragma('wal_checkpoint(PASSIVE)');
      } catch (err) {
        // ignore checkpoint warnings
      }
    }
    return info.changes;
  } catch (err) {
    console.error('Error during cleanupOldArticles:', err);
    return 0;
  }
}

export default db;
