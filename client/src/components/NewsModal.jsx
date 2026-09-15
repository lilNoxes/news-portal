import React, { useEffect } from 'react';
import { X, ExternalLink, Bookmark, Share2, Clock, Check } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';

export default function NewsModal({
  article,
  onClose,
  isBookmarked,
  onToggleBookmark
}) {
  const [copied, setCopied] = React.useState(false);

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Close Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
              {article.source}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {article.category}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleBookmark(article)}
              title={isBookmarked ? 'Удалить из закладок' : 'Сохранить'}
              className={`p-2 rounded-xl transition ${
                isBookmarked
                  ? 'bg-amber-500 text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCopy}
              title="Скопировать ссылку"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Share2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          {/* Image if available */}
          {article.image_url && (
            <div className="mb-6 rounded-2xl overflow-hidden aspect-[16/9] w-full max-h-80 bg-slate-100 dark:bg-slate-800">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatRelativeTime(article.pub_date || article.pub_timestamp)}</span>
            <span>•</span>
            <span>{new Date(article.pub_date || article.pub_timestamp).toLocaleString('ru-RU')}</span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-6">
            {article.title}
          </h1>

          {/* Text Content */}
          <div className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed space-y-4 mb-8">
            {article.description && (
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {article.description}
              </p>
            )}

            {article.content && article.content !== article.description && (
              <div
                className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            )}
          </div>

          {/* Footer CTA */}
          <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Полная версия статьи доступна на сайте источника
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {article.source}
              </p>
            </div>
            
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-sm shadow-md shadow-sky-500/20 transition active:scale-95 whitespace-nowrap"
            >
              <span>Перейти к первоисточнику</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
