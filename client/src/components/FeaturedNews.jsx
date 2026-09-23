import React, { useState } from 'react';
import { Bookmark, Clock, ArrowRight, Share2, Check, Sparkles, BookOpen } from 'lucide-react';
import { formatRelativeTime, calculateReadingTime } from '../utils/dateUtils';

const SOURCE_DOTS = {
  'ТАСС (Главное)': 'bg-blue-400',
  'Интерфакс': 'bg-red-400',
  'РБК Главное': 'bg-rose-400',
  'Lenta.ru': 'bg-amber-400',
  'Ведомости (Бизнес)': 'bg-purple-400',
  'Коммерсантъ': 'bg-indigo-400',
  'Хабр (IT & Разработка)': 'bg-sky-400',
  '3DNews (Гаджеты и IT)': 'bg-cyan-400',
  'CNews (Высокие технологии)': 'bg-emerald-400',
  'N+1 (Наука)': 'bg-teal-400',
  'Lenta.ru (Мир)': 'bg-amber-400',
  'The Guardian (World)': 'bg-sky-400',
  'Al Jazeera (World)': 'bg-orange-400',
  'TechCrunch': 'bg-green-400',
  'The Verge': 'bg-violet-400',
  'Ars Technica': 'bg-amber-500'
};

export default function FeaturedNews({
  article,
  isBookmarked,
  onToggleBookmark,
  onOpenModal
}) {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!article) return null;

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

  const readingTime = calculateReadingTime((article.title || '') + ' ' + (article.description || ''));
  const dotColor = SOURCE_DOTS[article.source] || 'bg-sky-400';

  return (
    <div
      onClick={() => onOpenModal(article)}
      className="group relative my-6 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-sm hover:shadow-2xl hover:border-sky-500/30 transition-all duration-300 cursor-pointer"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* Visual / Image Area (7 cols on lg) */}
        <div className="lg:col-span-7 relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto min-h-[260px] sm:min-h-[320px] lg:min-h-[400px] overflow-hidden bg-slate-900">
          {article.image_url && !imageError ? (
            <img
              src={article.image_url}
              alt={article.title}
              onError={() => setImageError(true)}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-sky-950 to-indigo-950 flex flex-col items-center justify-center p-8 text-center">
              <Sparkles className="w-12 h-12 text-sky-400/40 mb-3" />
              <span className="text-3xl sm:text-4xl font-black text-slate-700 select-none uppercase tracking-widest">
                {article.source}
              </span>
            </div>
          )}

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:hidden" />

          {/* Spotlight Tag */}
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-500 text-white shadow-lg shadow-rose-500/30 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              Главное событие
            </span>
          </div>

          {/* Floating Bookmark Button on Image */}
          <button
            onClick={handleBookmark}
            title={isBookmarked ? 'Удалить из закладок' : 'Сохранить'}
            className={`absolute top-4 right-4 p-2.5 rounded-xl backdrop-blur-md transition z-10 shadow-md ${
              isBookmarked
                ? 'bg-amber-500 text-white ring-2 ring-amber-400'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:text-amber-500'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Content Area (5 cols on lg) */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Source & Meta Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                <span>{article.source}</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50">
                {article.category}
              </span>
            </div>

            {/* Time & Reading Time */}
            <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatRelativeTime(article.pub_date || article.pub_timestamp)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{readingTime}</span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-3 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors line-clamp-3">
              {article.title}
            </h2>

            {/* Description snippet */}
            {article.description && (
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 line-clamp-3 lg:line-clamp-4 leading-relaxed">
                {article.description}
              </p>
            )}
          </div>

          {/* Action footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform">
              <span>Читать полностью</span>
              <ArrowRight className="w-4 h-4" />
            </span>

            <button
              onClick={handleCopy}
              title="Скопировать ссылку"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
