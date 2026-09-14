import React from 'react';
import { ChangeRequest } from '@/types';
import { FileText, CheckCircle, XCircle, Clock, Edit2, Trash2 } from 'lucide-react';

interface CRTableProps {
  changeRequests: ChangeRequest[];
  onApprovalChange?: (crId: string, status: ChangeRequest['approvalStatus']) => void;
  onEdit?: (cr: ChangeRequest) => void;
  onDelete?: (crId: string) => void;
}

export const CRTable: React.FC<CRTableProps> = ({ changeRequests, onApprovalChange, onEdit, onDelete }) => {
  const getApprovalBadge = (status: ChangeRequest['approvalStatus']) => {
    switch (status) {
      case 'draft':
        return <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">草稿 Draft</span>;
      case 'submitted':
        return (
          <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            <Clock className="w-3 h-3" /> 待簽核 (Submitted)
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            <CheckCircle className="w-3 h-3" /> 已核准 (Approved)
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 bg-red-100 text-red-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            <XCircle className="w-3 h-3" /> 已駁回 (Rejected)
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
          <tr>
            <th className="py-3 px-4">需求變更 (CR) 名稱與背景原因</th>
            <th className="py-3 px-4">影響範圍 (Impact Scope)</th>
            <th className="py-3 px-4">新增預估工時</th>
            <th className="py-3 px-4">簽核狀態 (Approval Status)</th>
            <th className="py-3 px-4">申請人</th>
            <th className="py-3 px-4 text-right">簽核與操作 (Actions)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {changeRequests.map((cr) => (
            <tr key={cr.id} className="hover:bg-gray-50/80 transition-colors">
              <td className="py-3.5 px-4 max-w-sm">
                <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-600" />
                  {cr.title}
                </div>
                <div className="text-gray-600 mt-1 line-clamp-2 text-[11px]">
                  {cr.backgroundReason}
                </div>
              </td>
              <td className="py-3.5 px-4 text-gray-600 max-w-xs">{cr.impactScope}</td>
              <td className="py-3.5 px-4 font-mono font-bold text-brand-700 text-sm">
                +{cr.estimatedAdditionalHours} 小時
              </td>
              <td className="py-3.5 px-4">{getApprovalBadge(cr.approvalStatus)}</td>
              <td className="py-3.5 px-4 text-gray-700 font-medium">{cr.applicantName || '客戶提報'}</td>
              <td className="py-3.5 px-4 text-right space-x-1">
                {cr.approvalStatus === 'submitted' && (
                  <>
                    <button
                      onClick={() => onApprovalChange?.(cr.id, 'approved')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1 rounded font-medium shadow-sm transition-colors"
                    >
                      核准 (Approve)
                    </button>
                    <button
                      onClick={() => onApprovalChange?.(cr.id, 'rejected')}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs px-2.5 py-1 rounded font-medium transition-colors"
                    >
                      駁回
                    </button>
                  </>
                )}
                <button
                  onClick={() => onEdit?.(cr)}
                  className="p-1 text-gray-500 hover:text-brand-600 rounded hover:bg-gray-100"
                  title="編輯"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete?.(cr.id)}
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
