import React, { useState } from 'react';
import { Bookmark, ExternalLink, Share2, Clock, Check, BookOpen, ArrowUpRight } from 'lucide-react';
import { formatRelativeTime, calculateReadingTime } from '../utils/dateUtils';

const SOURCE_DOTS = {
  'ТАСС (Главное)': 'bg-blue-500',
  'Интерфакс': 'bg-red-500',
  'РБК Главное': 'bg-rose-500',
  'Lenta.ru': 'bg-amber-500',
  'Ведомости (Бизнес)': 'bg-purple-500',
  'Коммерсантъ': 'bg-indigo-500',
  'Хабр (IT & Разработка)': 'bg-sky-500',
  '3DNews (Гаджеты и IT)': 'bg-cyan-500',
  'CNews (Высокие технологии)': 'bg-emerald-500',
  'N+1 (Наука)': 'bg-teal-500'
};

export default function NewsCard({
  article,
  isBookmarked,
  onToggleBookmark,
  onOpenModal
}) {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  const dotColor = SOURCE_DOTS[article.source] || 'bg-sky-500';
  const readingTime = calculateReadingTime((article.title || '') + ' ' + (article.description || ''));

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(article.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    onToggleBookmark(article);
  };

  return (
    <article
      onClick={() => onOpenModal(article)}
      className="group relative flex flex-col bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden shadow-sm hover:shadow-xl hover:border-sky-500/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* Image Preview or Gradient Fallback */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {article.image_url && !imageError ? (
          <img
            src={article.image_url}
            alt={article.title}
            onError={() => setImageError(true)}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/40 flex items-center justify-center p-6 text-center">
            <span className="text-2xl font-black text-slate-300 dark:text-slate-700 select-none uppercase tracking-widest">
              {article.source}
            </span>
          </div>
        )}

        {/* Gradient shadow for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* Source and Category Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 backdrop-blur-md shadow-sm border border-white/20 dark:border-slate-700/50">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            <span className="truncate max-w-[120px]">{article.source}</span>
          </span>
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-black/60 text-white backdrop-blur-md">
            {article.category}
          </span>
        </div>

        {/* Floating Bookmark Button */}
        <button
          onClick={handleBookmark}
          title={isBookmarked ? 'Удалить из закладок' : 'Сохранить в закладки'}
          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all duration-200 z-10 shadow-sm ${
            isBookmarked
              ? 'bg-amber-500 text-white shadow-amber-500/30 scale-105'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:scale-105'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Timestamp & Reading Time */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(article.pub_date || article.pub_timestamp)}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              <span>{readingTime}</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug tracking-tight group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors line-clamp-2 mb-2">
            {article.title}
          </h2>

          {/* Description snippet */}
          {article.description && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {article.description}
            </p>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>Читать</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>

          <div className="flex items-center gap-1">
            {/* Copy link */}
            <button
              onClick={handleCopy}
              title="Скопировать ссылку"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>

            {/* External link */}
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Открыть источник"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
