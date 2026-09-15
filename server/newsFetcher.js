import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
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
  timeout: 12000,
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

  // 4. Look inside content / description HTML for <img>
  const htmlContent = item.contentEncoded || item.content || item.description || '';
  if (htmlContent && htmlContent.includes('<img')) {
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
 * Fetch and store news from all active sources
 */
export async function fetchAllNews() {
  console.log(`[${new Date().toISOString()}] Starting news fetch...`);

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

  for (const src of activeSources) {
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
          const content = item.contentEncoded || item.content || description;
          
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
      totalAdded += addedFromSource;
      console.log(`✓ ${src.name}: ${addedFromSource} new articles added.`);
    } catch (err) {
      console.error(`✗ Error fetching ${src.name} (${src.url}):`, err.message);
    }
  }

  console.log(`[${new Date().toISOString()}] News fetch complete. Total new articles: ${totalAdded}`);
  return { success: true, totalAdded };
}
