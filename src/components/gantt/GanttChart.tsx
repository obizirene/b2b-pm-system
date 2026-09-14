import React from 'react';
import { GanttGroup, GanttItem } from '@/types';

interface GanttChartProps {
  groups: GanttGroup[];
  onItemClick?: (item: GanttItem) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({ groups, onItemClick }) => {
  // Timeline setup: August 1 to September 15, 2026 (46 days window)
  const startDateMin = new Date('2026-08-01');
  const totalDays = 46;
  const colWidth = 24; // 24px per day
  const headerHeight = 40;
  const rowHeight = 44;

  const getX = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffTime = d.getTime() - startDateMin.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    return diffDays * colWidth;
  };

  const getWidth = (startStr: string, endStr: string) => {
    const startX = getX(startStr);
    const endX = getX(endStr) + colWidth;
    return Math.max(colWidth, endX - startX);
  };

  // Generate day columns header
  const daysHeader = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDateMin);
    d.setDate(d.getDate() + i);
    return {
      dayNum: d.getDate(),
      month: d.getMonth() + 1,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      dateStr: d.toISOString().split('T')[0],
    };
  });

  // Calculate coordinates for drawing dependency arrows
  const itemCoords = new Map<string, { x: number; y: number; width: number }>();
  let currentRow = 0;

  groups.forEach((g) => {
    currentRow++; // phase row
    g.tasks.forEach((t) => {
      const x = getX(t.startDate);
      const w = getWidth(t.startDate, t.targetEndDate);
      const y = headerHeight + currentRow * rowHeight + rowHeight / 2;
      itemCoords.set(t.id, { x, y, width: w });
      currentRow++;
    });
  });

  return (
    <div className="w-full overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
      <div className="min-w-[1200px] flex">
        {/* Left Table Panel: Name & Metadata */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-gray-50 z-10">
          <div className="h-10 px-4 flex items-center font-semibold text-xs text-gray-600 border-b border-gray-200 bg-gray-100">
            專案階段與任務 (Task / Phase)
          </div>
          {groups.map((group) => (
            <React.Fragment key={group.subProjectId}>
              <div className="h-11 px-3 flex items-center justify-between border-b border-gray-200 bg-blue-50/60 font-medium text-sm text-blue-900">
                <span className="truncate">{group.subProjectName}</span>
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-mono">
                  {group.progressPercent}%
                </span>
              </div>
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onItemClick?.(task)}
                  className="h-11 pl-7 pr-3 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 text-xs text-gray-700 cursor-pointer"
                >
                  <span className="truncate max-w-[160px] font-medium">{task.name}</span>
                  <div className="flex items-center gap-1">
                    {task.varianceDays > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                        延遲 {task.varianceDays} 天
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500 font-mono">{task.progressPercent}%</span>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Right SVG Gantt Canvas Timeline */}
        <div className="flex-1 overflow-x-auto relative">
          <svg
            width={totalDays * colWidth}
            height={headerHeight + (currentRow + 1) * rowHeight}
            className="block"
          >
            {/* Grid Columns */}
            {daysHeader.map((d, idx) => (
              <g key={idx}>
                <rect
                  x={idx * colWidth}
                  y={0}
                  width={colWidth}
                  height="100%"
                  fill={d.isWeekend ? '#f9fafb' : '#ffffff'}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
                <text
                  x={idx * colWidth + colWidth / 2}
                  y={24}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-500 font-mono"
                >
                  {d.dayNum}
                </text>
              </g>
            ))}

            {/* Header divider */}
            <line x1={0} y1={headerHeight} x2={totalDays * colWidth} y2={headerHeight} stroke="#e5e7eb" strokeWidth={1} />

            {/* Render Rows and Bars */}
            {(() => {
              let rIndex = 0;
              return groups.map((group) => {
                const phaseRow = rIndex++;
                const phaseX = getX(group.startDate);
                const phaseW = getWidth(group.startDate, group.targetEndDate);
                const phaseY = headerHeight + phaseRow * rowHeight + 12;

                return (
                  <g key={group.subProjectId}>
                    {/* Phase background summary bar */}
                    <rect
                      x={phaseX}
                      y={phaseY}
                      width={phaseW}
                      height={18}
                      rx={3}
                      fill="#1e3a8a"
                      opacity={0.85}
                    />
                    <rect
                      x={phaseX}
                      y={phaseY}
                      width={(phaseW * group.progressPercent) / 100}
                      height={18}
                      rx={3}
                      fill="#3b82f6"
                    />

                    {/* Task Rows */}
                    {group.tasks.map((task) => {
                      const taskRow = rIndex++;
                      const taskX = getX(task.startDate);
                      const taskW = getWidth(task.startDate, task.targetEndDate);
                      const taskY = headerHeight + taskRow * rowHeight + 12;
                      const isDelayed = task.varianceDays > 0;

                      return (
                        <g key={task.id} className="cursor-pointer group" onClick={() => onItemClick?.(task)}>
                          {/* Task Planned Bar */}
                          <rect
                            x={taskX}
                            y={taskY}
                            width={taskW}
                            height={20}
                            rx={4}
                            fill={isDelayed ? '#fecdd3' : '#e0f2fe'}
                            stroke={isDelayed ? '#f43f5e' : '#0284c7'}
                            strokeWidth={1}
                          />

                          {/* Task Progress Bar */}
                          <rect
                            x={taskX}
                            y={taskY}
                            width={(taskW * task.progressPercent) / 100}
                            height={20}
                            rx={4}
                            fill={isDelayed ? '#e11d48' : '#0284c7'}
                          />

                          {/* Task Label on bar */}
                          <text
                            x={taskX + 8}
                            y={taskY + 14}
                            className="text-[10px] fill-gray-800 font-medium select-none"
                          >
                            {task.name}
                          </text>

                          {/* Actual vs Target Diff marker if actualEndDate exists */}
                          {task.actualEndDate && (
                            <line
                              x1={getX(task.actualEndDate)}
                              y1={taskY - 2}
                              x2={getX(task.actualEndDate)}
                              y2={taskY + 22}
                              stroke="#ef4444"
                              strokeWidth={2}
                              strokeDasharray="3,3"
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              });
            })()}

            {/* Render Dependency SVG Arrows */}
            {groups.flatMap((g) => g.tasks).map((task) => {
              if (!task.dependencies || task.dependencies.length === 0) return null;
              const targetCoord = itemCoords.get(task.id);
              if (!targetCoord) return null;

              return task.dependencies.map((depId) => {
                const sourceCoord = itemCoords.get(depId);
                if (!sourceCoord) return null;

                const startX = sourceCoord.x + sourceCoord.width;
                const startY = sourceCoord.y;
                const endX = targetCoord.x;
                const endY = targetCoord.y;
                const midX = startX + (endX - startX) / 2;

                const pathD = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

                return (
                  <g key={`${depId}->${task.id}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4,2"
                    />
                    <polygon
                      points={`${endX},${endY} ${endX - 5},${endY - 4} ${endX - 5},${endY + 4}`}
                      fill="#f59e0b"
                    />
                  </g>
                );
              });
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
