import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { ProjectSummary } from '@/types';

interface DelayAlertBannerProps {
  delayedProjects: ProjectSummary[];
}

export const DelayAlertBanner: React.FC<DelayAlertBannerProps> = ({ delayedProjects }) => {
  if (delayedProjects.length === 0) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm mb-6">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
            專案進度延誤警示 (Schedule Delay Warnings)
            <span className="bg-red-200 text-red-900 text-xs px-2 py-0.5 rounded-full font-mono">
              {delayedProjects.length} 個專案延誤
            </span>
          </h3>
          <div className="mt-2 space-y-2">
            {delayedProjects.map((prj) => (
              <div key={prj.masterProjectId} className="flex flex-wrap items-center justify-between text-xs text-red-900 bg-white/70 p-2.5 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{prj.masterProjectName}</span>
                  <span className="text-gray-500">({prj.masterProjectCode})</span>
                  <span className="text-gray-600">| 客戶: {prj.clientName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-red-700">
                    <Clock className="w-3.5 h-3.5" />
                    已超過預計完工日 {prj.targetEndDate} (逾期 {prj.delayDays} 天)
                  </span>
                  <span className="bg-red-600 text-white text-[11px] px-2 py-0.5 rounded font-medium">
                    需緊急調度
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
