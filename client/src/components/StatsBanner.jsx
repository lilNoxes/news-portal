import React from 'react';
import { ShieldCheck, Zap, Activity } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';

export default function StatsBanner({ stats, lastUpdated }) {
  if (!stats) return null;

  return (
    <div className="my-6 p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/20 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Лента в прямом эфире
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Автоматический сбор из {stats.activeSources || 8} проверенных RSS-источников
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span>Всего в базе: <strong className="font-semibold text-slate-900 dark:text-white">{stats.totalArticles || 0}</strong></span>
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-sky-500" />
            <span>Обновлено: <strong className="font-semibold text-slate-900 dark:text-white">{formatRelativeTime(lastUpdated)}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
