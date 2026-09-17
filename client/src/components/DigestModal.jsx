import React, { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, Share2, Check, Calendar, AlertCircle } from 'lucide-react';

export default function DigestModal({ isOpen, onClose }) {
  const [digest, setDigest] = useState(null);
  const [headline, setHeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDigest();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const loadDigest = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/ai/digest');
      const data = await res.json();
      if (data.success) {
        setDigest(data.digest);
        setHeadline(data.headline || 'Картина дня от искусственного интеллекта');
      } else {
        setError(data.error || 'Не удалось сформировать дайджест.');
      }
    } catch (err) {
      setError('Ошибка загрузки дайджеста: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!digest) return;
    navigator.clipboard.writeText(`${headline}\n\n${digest}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background gradient */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-sky-500/10 via-indigo-500/5 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Дайджест дня
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Главные события за последние 24 часа</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {digest && (
              <button
                onClick={handleCopy}
                title="Скопировать сводку"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative p-6 sm:p-8 max-h-[75vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center mx-auto shadow-inner">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                  Искусственный интеллект анализирует новости...
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Gemini читает актуальные сводки от 10 ведущих СМИ и формулирует главные инфоповоды
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-amber-800 dark:text-amber-200 text-sm space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Сводка временно недоступна</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
              <button
                onClick={loadDigest}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-amber-200/60 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 transition"
              >
                Повторить попытку
              </button>
            </div>
          ) : digest ? (
            <div className="space-y-6">
              {/* Headline Banner */}
              {headline && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-purple-950/20 border border-sky-100 dark:border-sky-800/50">
                  <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block mb-1">
                    Главный акцент дня
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                    {headline}
                  </h3>
                </div>
              )}

              {/* Digest Markdown Content */}
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed space-y-4">
                {digest.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Сгенерировано нейросетью Google Gemini
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
