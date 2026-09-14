import React from 'react';
import { ProjectSummary } from '@/types';
import { Clock, Bug, GitPullRequest, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ProjectSummaryCardProps {
  summary: ProjectSummary;
}

export const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({ summary }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
              {summary.masterProjectCode} • {summary.clientName}
            </span>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">{summary.masterProjectName}</h3>
          </div>
          {summary.isDelayed ? (
            <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-red-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              延誤 {summary.delayDays} 天
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold">
              正常進行中
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
            <span>整體進度 Progress</span>
            <span className="font-mono font-bold text-brand-600">{summary.overallProgressPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${
                summary.isDelayed ? 'bg-red-500' : 'bg-brand-600'
              }`}
              style={{ width: `${summary.overallProgressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
          <div className="bg-gray-50 p-2.5 rounded-lg text-center">
            <div className="flex items-center justify-center text-gray-400 mb-1">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-bold text-gray-900 font-mono">
              {summary.totalActualHours} / {summary.totalEstimatedHours}h
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">預估 vs 實際工時</div>
          </div>

          <div className="bg-amber-50/60 p-2.5 rounded-lg text-center border border-amber-100">
            <div className="flex items-center justify-center text-amber-600 mb-1">
              <Bug className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-bold text-amber-900 font-mono">{summary.unresolvedBugsCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">未關閉 Bug 數</div>
          </div>

          <div className="bg-blue-50/60 p-2.5 rounded-lg text-center border border-blue-100">
            <div className="flex items-center justify-center text-blue-600 mb-1">
              <GitPullRequest className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-bold text-blue-900 font-mono">{summary.activeCRsCount}</div>
            <div className="text-[10px] text-blue-700 mt-0.5">進行中 CR 數</div>
          </div>
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
        <span className="text-gray-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          預計完工: {summary.targetEndDate}
        </span>
        <Link
          href={`/projects/${summary.masterProjectId}`}
          className="text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1 hover:underline"
        >
          專案詳情 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
