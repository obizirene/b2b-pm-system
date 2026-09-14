import React from 'react';
import { Issue } from '@/types';
import { AlertCircle, CheckCircle2, Clock, Edit2, Trash2 } from 'lucide-react';

interface IssueTableProps {
  issues: Issue[];
  onStatusChange?: (issueId: string, newStatus: Issue['status']) => void;
  onEdit?: (issue: Issue) => void;
  onDelete?: (issueId: string) => void;
}

export const IssueTable: React.FC<IssueTableProps> = ({ issues, onStatusChange, onEdit, onDelete }) => {
  const getSeverityBadge = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">Critical</span>;
      case 'high':
        return <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full font-semibold">High</span>;
      case 'medium':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">Medium</span>;
      case 'low':
        return <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">Low</span>;
    }
  };

  const getStatusBadge = (status: Issue['status']) => {
    switch (status) {
      case 'open':
        return (
          <span className="flex items-center gap-1 text-red-600 font-medium text-xs">
            <AlertCircle className="w-3.5 h-3.5" /> 未處置 (Open)
          </span>
        );
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 text-amber-600 font-medium text-xs">
            <Clock className="w-3.5 h-3.5" /> 處理中 (In Progress)
          </span>
        );
      case 'resolved':
      case 'closed':
        return (
          <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> 已關閉 (Resolved)
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
          <tr>
            <th className="py-3 px-4">Bug 標題與重現步驟</th>
            <th className="py-3 px-4">嚴重度 (Severity)</th>
            <th className="py-3 px-4">當前狀態 (Status)</th>
            <th className="py-3 px-4">提報人 / 負責人</th>
            <th className="py-3 px-4">提報時間</th>
            <th className="py-3 px-4 text-right">操作 (Actions)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {issues.map((issue) => (
            <tr key={issue.id} className="hover:bg-gray-50/80 transition-colors">
              <td className="py-3.5 px-4 max-w-sm">
                <div className="font-semibold text-gray-900 text-sm">{issue.title}</div>
                <div className="text-gray-500 mt-1 line-clamp-2 text-[11px] font-mono bg-gray-50 p-1.5 rounded">
                  重現步驟: {issue.stepsToReproduce}
                </div>
              </td>
              <td className="py-3.5 px-4">{getSeverityBadge(issue.severity)}</td>
              <td className="py-3.5 px-4">{getStatusBadge(issue.status)}</td>
              <td className="py-3.5 px-4">
                <div className="text-gray-900 font-medium">{issue.assigneeName || '未指派'}</div>
                <div className="text-gray-400 text-[11px]">提報: {issue.reporterName}</div>
              </td>
              <td className="py-3.5 px-4 text-gray-500 font-mono">
                {new Date(issue.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3.5 px-4 text-right space-x-1">
                <select
                  value={issue.status}
                  onChange={(e) => onStatusChange?.(issue.id, e.target.value as Issue['status'])}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-brand-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button
                  onClick={() => onEdit?.(issue)}
                  className="p-1 text-gray-500 hover:text-brand-600 rounded hover:bg-gray-100"
                  title="編輯"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete?.(issue.id)}
                  className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100"
                  title="刪除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
