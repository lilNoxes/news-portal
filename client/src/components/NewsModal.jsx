import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { X, ExternalLink, Bookmark, Share2, Clock, Check, BookOpen, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { formatRelativeTime, calculateReadingTime } from '../utils/dateUtils';

export default function NewsModal({
  article,
  onClose,
  isBookmarked,
  onToggleBookmark
}) {
  const [copied, setCopied] = useState(false);
  const [aiSummary, setAiSummary] = useState(article?.ai_summary || null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    setAiSummary(article?.ai_summary || null);
    setAiError('');
    setLoadingAi(false);
  }, [article]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  const handleGenerateAiSummary = async () => {
    if (!article?.id) return;
    try {
      setLoadingAi(true);
      setAiError('');
      const res = await fetch(`/api/ai/summarize/${article.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.summary) {
        setAiSummary(data.summary);
        article.ai_summary = data.summary;
      } else {
        setAiError(data.error || 'Не удалось сгенерировать выжимку.');
      }
    } catch (err) {
      setAiError('Ошибка связи с Gemini AI: ' + err.message);
    } finally {
      setLoadingAi(false);
    }
  };

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

          {/* Gemini AI TL;DR Summary Block */}
          {aiSummary ? (
            <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-sky-50/50 to-purple-50/60 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-purple-950/40 border border-indigo-200/70 dark:border-indigo-800/70 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500 text-white shadow-sm shadow-indigo-500/30">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                    Суть за 10 секунд (Gemini AI TL;DR)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                  AI Сводка
                </span>
              </div>
              <div className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed space-y-1.5 font-normal">
                {aiSummary.split('\n').map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  return (
                    <p key={idx} className={trimmed.startsWith('•') || trimmed.startsWith('-') ? 'pl-2' : ''}>
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Экономьте время: выжимка новости
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Нейросеть выделит ключевые тезисы за пару секунд
                  </p>
                </div>
              </div>

              <button
                onClick={handleGenerateAiSummary}
                disabled={loadingAi}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-60 shrink-0"
              >
                {loadingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Анализирую новость...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Получить выжимку (AI)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {aiError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

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
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
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
