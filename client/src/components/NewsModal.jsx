import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Bookmark, Share2, Clock, Check, BookOpen } from 'lucide-react';
import { formatRelativeTime, calculateReadingTime } from '../utils/dateUtils';

export default function NewsModal({
  article,
  onClose,
  isBookmarked,
  onToggleBookmark
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(article.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const readingTime = calculateReadingTime((article.title || '') + ' ' + (article.description || ''));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Top Action Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50">
              {article.source}
            </span>
            <span className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {article.category}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleBookmark(article)}
              title={isBookmarked ? 'Удалить из закладок' : 'Сохранить'}
              className={`p-2 rounded-xl transition ${
                isBookmarked
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCopy}
              title="Скопировать ссылку"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          {/* Cover Image if available */}
          {article.image_url && (
            <div className="mb-6 rounded-2xl overflow-hidden aspect-[16/9] w-full max-h-96 bg-slate-900 shadow-md">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400 mb-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatRelativeTime(article.pub_date || article.pub_timestamp)}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{readingTime}</span>
            </div>
            <span>•</span>
            <span>{new Date(article.pub_date || article.pub_timestamp).toLocaleString('ru-RU')}</span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-6">
            {article.title}
          </h1>

          {/* Text Content */}
          <div className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed space-y-4 mb-8">
            {article.description && (
              <p className="font-medium text-slate-800 dark:text-slate-200 text-lg leading-relaxed">
                {article.description}
              </p>
            )}

            {article.content && article.content !== article.description && (
              <div
                className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            )}
          </div>

          {/* Footer Call to Action */}
          <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Полная версия статьи доступна на сайте источника
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Материал опубликован изданием: <strong className="font-semibold text-slate-700 dark:text-slate-300">{article.source}</strong>
              </p>
            </div>
            
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm shadow-md shadow-sky-500/25 transition active:scale-95 whitespace-nowrap"
            >
              <span>Читать на первоисточнике</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
