import React from 'react';
import { ShieldCheck, Activity, Radio } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';

export default function StatsBanner({ stats, lastUpdated }) {
  if (!stats) return null;

  return (
    <div className="my-5 px-4 py-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
        </div>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Прямой эфир новостей
        </span>
        <span className="text-slate-400 hidden sm:inline">•</span>
        <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
          {stats.activeSources || 10} проверенных изданий
        </span>
      </div>

      <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-500" />
          <span>Всего: <strong className="font-bold text-slate-800 dark:text-slate-200">{stats.totalArticles || 0}</strong></span>
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Синхронизировано: <strong className="font-semibold text-slate-700 dark:text-slate-300">{formatRelativeTime(lastUpdated)}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
