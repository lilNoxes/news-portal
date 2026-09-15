import React, { useState } from 'react';
import { Bookmark, ExternalLink, Share2, Clock, Check } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';

const SOURCE_COLORS = {
  'РБК Главное': 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-900',
  'РБК Технологии': 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900',
  'РБК Экономика': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
  'Хабр (IT & Разработка)': 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-900',
  '3DNews (Гаджеты и IT)': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
  'Lenta.ru': 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  'Коммерсантъ': 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-900',
  'N+1 (Наука)': 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-900'
};

export default function NewsCard({
  article,
  isBookmarked,
  onToggleBookmark,
  onOpenModal
}) {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  const sourceBadgeClass = SOURCE_COLORS[article.source] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

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
      className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* Image Preview or Gradient Fallback */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {article.image_url && !imageError ? (
          <img
            src={article.image_url}
            alt={article.title}
            onError={() => setImageError(true)}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/40 flex items-center justify-center p-6 text-center">
            <span className="text-3xl font-black text-slate-300 dark:text-slate-700 select-none uppercase tracking-widest">
              {article.source}
            </span>
          </div>
        )}

        {/* Source and Category Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-md shadow-sm ${sourceBadgeClass}`}>
            {article.source}
          </span>
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-black/60 text-white backdrop-blur-md">
            {article.category}
          </span>
        </div>

        {/* Action Button: Bookmark (Floating top-right) */}
        <button
          onClick={handleBookmark}
          title={isBookmarked ? 'Удалить из закладок' : 'Сохранить в закладки'}
          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition z-10 ${
            isBookmarked
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:text-amber-500 shadow-sm'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatRelativeTime(article.pub_date || article.pub_timestamp)}</span>
          </div>

          {/* Title */}
          <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-snug group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors line-clamp-2 mb-2">
            {article.title}
          </h2>

          {/* Description snippet */}
          {article.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
              {article.description}
            </p>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(article);
            }}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-1"
          >
            Читать далее
          </button>

          <div className="flex items-center gap-1.5">
            {/* Copy / Share */}
            <button
              onClick={handleCopy}
              title="Скопировать ссылку"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
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
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
