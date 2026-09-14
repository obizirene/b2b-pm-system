import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badgeText?: string;
  badgeVariant?: 'danger' | 'warning' | 'success' | 'info';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badgeText,
  badgeVariant = 'info',
}) => {
  const badgeClasses = {
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-800',
    success: 'bg-emerald-100 text-emerald-800',
    info: 'bg-blue-100 text-blue-800',
  }[badgeVariant];

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {icon && <div className="p-2 rounded-lg bg-gray-50 text-gray-600">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {badgeText && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClasses}`}>
            {badgeText}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
};
