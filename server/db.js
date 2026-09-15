import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'news.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_id) REFERENCES sources(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_articles_pub_timestamp ON articles(pub_timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
  CREATE INDEX IF NOT EXISTS idx_articles_link ON articles(link);
`);

// Pre-populate default sources if table is empty
const defaultSources = [
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

export default db;
