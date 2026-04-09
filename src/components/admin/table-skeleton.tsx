"use client";

/**
 * Table skeleton placeholder for admin pages.
 * Used while initial data is being loaded.
 */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-5 py-3.5 text-left">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 1 ? "bg-gray-100/30" : ""}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="px-5 py-4">
                  <div
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: `${40 + ((rowIdx + colIdx) * 13) % 50}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Stat card skeleton for dashboard.
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-20 mb-3" />
          <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Page header skeleton for titles.
 */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <div className="h-6 bg-gray-200 rounded animate-pulse w-32 mb-2" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-48" />
    </div>
  );
}
