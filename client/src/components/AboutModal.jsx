import React, { useEffect } from 'react';
import { X, ShieldCheck, Newspaper, Sparkles, ExternalLink, Mail, Scale, CheckCircle2, Cpu, FileText } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sources = [
    { name: 'ТАСС', desc: 'Федеральное государственное информационное агентство', category: 'Главное' },
    { name: 'Коммерсантъ', desc: 'Деловые и политические события, аналитика рынков', category: 'Бизнес' },
    { name: 'Ведомости', desc: 'Авторитетная деловая журналистика и экономика', category: 'Бизнес' },
    { name: 'Хабр', desc: 'Крупнейшее IT-сообщество: разработка, DevOps, ИИ', category: 'Технологии' },
    { name: '3DNews', desc: 'Первое независимое издание о цифровых технологиях', category: 'Технологии' },
    { name: 'Интерфакс', desc: 'Оперативные политические и финансовые сводки', category: 'Главное' },
    { name: 'N+1', desc: 'Научно-популярное издание о науке и биотехе', category: 'Наука' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-md bg-slate-950/60 transition-opacity">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-r from-slate-50 via-sky-50/40 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                О проекте «ИнфоЛента»
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  E-E-A-T
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Редакционная политика, источники и стандарты качества</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          
          {/* Mission */}
          <section className="bg-sky-50/60 dark:bg-sky-950/30 rounded-2xl p-4 border border-sky-200/60 dark:border-sky-900/40">
            <h3 className="text-sm font-bold text-sky-950 dark:text-sky-200 flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-sky-500" />
              Миссия и принципы платформы
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              «ИнфоЛента» — независимый технологический агрегатор новостей. Мы собираем актуальные публикации из ведущих лицензированных СМИ и авторитетных технологических ресурсов в режиме реального времени, помогая читателям экономить время и оставаться в курсе главных событий без информационного шума.
            </p>
          </section>

          {/* AI Transparency */}
          <section className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500" />
              Прозрачность использования искусственного интеллекта (AI Policy)
            </h3>
            <p className="text-xs sm:text-sm">
              Портал интегрирован с языковой моделью нового поколения <strong>Google Gemini Flash</strong>. ИИ используется исключительно для двух вспомогательных задач:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <div className="font-semibold text-xs text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Субъективные выжимки (TL;DR)
                </div>
                <div className="text-[12px] text-slate-500 dark:text-slate-400">
                  Краткое резюме материала из 3 тезисов для предварительного ознакомления.
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <div className="font-semibold text-xs text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Аналитический дайджест дня
                </div>
                <div className="text-[12px] text-slate-500 dark:text-slate-400">
                  Кластеризация главных тем за сутки с выделением ключевых трендов.
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              ИИ-модель не создает авторский контент «с нуля» и не заменяет журналистские материалы, а структурирует данные первоисточника.
            </p>
          </section>

          {/* Copyright & Sources */}
          <section className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-500" />
              Авторские права и ссылки на первоисточники
            </h3>
            <p className="text-xs sm:text-sm">
              Все имущественные и неимущественные права на публикуемые материалы принадлежат их законным правообладателям. Каждая карточка и публикация снабжены обязательной прямой ссылкой на оригинальный материал издания.
            </p>
          </section>

          {/* Connected Media Sources */}
          <section className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              Подключенные издания
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {sources.map((s, idx) => (
                <div key={idx} className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.desc}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {s.category}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Contacts */}
          <section className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-500" />
                Связь с редакцией и правообладателями
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                По вопросам сотрудничества, добавления источников и запросов:
              </div>
            </div>
            <a
              href="mailto:editorial@infrlo.com"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition"
            >
              <span>editorial@infrlo.com</span>
            </a>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>ИнфоЛента v1.2 • SQLite FTS5 • Gemini 3.6</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
