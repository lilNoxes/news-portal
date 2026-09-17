import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import db from './db.js';

// Custom fields to catch media:content and enclosures
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded']
    ]
  },
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  }
});

/**
 * Extract an image URL from RSS item data or HTML content
 */
function extractImageUrl(item) {
  // 1. Check enclosure
  if (item.enclosure && item.enclosure.url && (item.enclosure.type?.startsWith('image') || /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url))) {
    return item.enclosure.url;
  }

  // 2. Check media:content
  if (item.mediaContent) {
    if (typeof item.mediaContent === 'object' && item.mediaContent['$']?.url) {
      return item.mediaContent['$'].url;
    }
    if (typeof item.mediaContent === 'string' && item.mediaContent.startsWith('http')) {
      return item.mediaContent;
    }
  }

  // 3. Check media:thumbnail
  if (item.mediaThumbnail) {
    if (typeof item.mediaThumbnail === 'object' && item.mediaThumbnail['$']?.url) {
      return item.mediaThumbnail['$'].url;
    }
    if (typeof item.mediaThumbnail === 'string' && item.mediaThumbnail.startsWith('http')) {
      return item.mediaThumbnail;
    }
  }

  // 4. Look inside content / description HTML for <img> (fast regex first, cheerio fallback)
  const htmlContent = item.contentEncoded || item.content || item.description || '';
  if (htmlContent && htmlContent.includes('<img')) {
    const fastMatch = htmlContent.match(/<img[^>]+src=["'](https?:\/\/[^"'\s>]+)["']/i);
    if (fastMatch && fastMatch[1]) {
      return fastMatch[1];
    }
    try {
      const $ = cheerio.load(htmlContent);
      const src = $('img').first().attr('src');
      if (src && src.startsWith('http')) {
        return src;
      }
    } catch {
      // ignore parsing error
    }
  }

  return null;
}

/**
 * Clean up text (strip HTML tags, normalize whitespace)
 */
function cleanText(text) {
  if (!text) return '';
  const cleaned = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

/**
 * Sanitize HTML content before storing in the database
 */
function sanitizeArticleContent(rawHtml) {
  if (!rawHtml) return '';
  return sanitizeHtml(rawHtml, {
    allowedTags: [
      'p', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'br', 'h2', 'h3', 'h4', 'img', 'figure', 'figcaption'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
    }
  });
}

let isFetching = false;

/**
 * Fetch and process news from a single source
 */
async function fetchSingleSource(src, insertArticle, updateSourceTime) {
  try {
    console.log(`Fetching from: ${src.name} (${src.url})`);
    const feed = await parser.parseURL(src.url);

    let addedFromSource = 0;
    const insertBatch = db.transaction((items) => {
      for (const item of items) {
        if (!item.title || !item.link) continue;

        const link = item.link.trim();
        const guid = item.guid || item.id || link;
        const title = cleanText(item.title);
        const rawDesc = item.contentSnippet || item.summary || item.description || '';
        const description = cleanText(rawDesc);
        const rawContent = item.contentEncoded || item.content || description;
        const content = sanitizeArticleContent(rawContent);
        
        let pubTimestamp = Date.now();
        let pubDate = new Date().toISOString();

        if (item.pubDate || item.isoDate) {
          const parsed = new Date(item.isoDate || item.pubDate);
          if (!isNaN(parsed.getTime())) {
            pubTimestamp = parsed.getTime();
            pubDate = parsed.toISOString();
          }
        }

        const imageUrl = extractImageUrl(item);

        const result = insertArticle.run({
          guid,
          title,
          link,
          description,
          content,
          pub_date: pubDate,
          pub_timestamp: pubTimestamp,
          source: src.name,
          source_id: src.id,
          category: src.category,
          image_url: imageUrl
        });

        if (result.changes > 0) {
          addedFromSource++;
        }
      }
    });

    if (feed.items && feed.items.length > 0) {
      insertBatch(feed.items);
    }

    updateSourceTime.run(new Date().toISOString(), src.id);
    console.log(`✓ ${src.name}: ${addedFromSource} new articles added.`);
    return addedFromSource;
  } catch (err) {
    console.error(`✗ Error fetching ${src.name} (${src.url}):`, err.message);
    return 0;
  }
}

/**
 * Fetch and store news from all active sources using a concurrency pool
 */
export async function fetchAllNews() {
  if (isFetching) {
    console.log(`[${new Date().toISOString()}] News fetch already in progress, skipping duplicate invocation.`);
    return { success: true, totalAdded: 0, alreadyRunning: true };
  }

  isFetching = true;
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting parallel news fetch...`);

  try {
    const activeSources = db.prepare('SELECT * FROM sources WHERE enabled = 1').all();
    let totalAdded = 0;

    const insertArticle = db.prepare(`
      INSERT OR IGNORE INTO articles (
        guid, title, link, description, content,
        pub_date, pub_timestamp, source, source_id, category, image_url
      ) VALUES (
        @guid, @title, @link, @description, @content,
        @pub_date, @pub_timestamp, @source, @source_id, @category, @image_url
      )
    `);

    const updateSourceTime = db.prepare('UPDATE sources SET last_fetched_at = ? WHERE id = ?');

    // Run parallel fetch with concurrency pool of 3
    const CONCURRENCY = 3;
    const pool = [];
    const executing = new Set();

    for (const src of activeSources) {
      const task = Promise.resolve().then(() => fetchSingleSource(src, insertArticle, updateSourceTime));
      pool.push(task);
      executing.add(task);

      const clean = () => executing.delete(task);
      task.then(clean, clean);

      if (executing.size >= CONCURRENCY) {
        await Promise.race(executing);
      }
    }

    const results = await Promise.allSettled(pool);
    for (const r of results) {
      if (r.status === 'fulfilled') {
        totalAdded += r.value || 0;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${new Date().toISOString()}] Parallel news fetch complete in ${duration}s. Total new articles: ${totalAdded}`);
    return { success: true, totalAdded, duration };
  } finally {
    isFetching = false;
  }
}
