"use client";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers: show first, last, current +/- 1, with "..." for gaps
  function getPageNumbers(): (number | "...")[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];
    const around = new Set<number>();
    around.add(1);
    around.add(totalPages);
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      if (i >= 1 && i <= totalPages) around.add(i);
    }

    const sorted = Array.from(around).sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        pages.push("...");
      }
      pages.push(sorted[i]);
    }

    return pages;
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
      {/* Left: count */}
      <span className="text-sm text-slate-500">
        顯示 {start}-{end} / 共 {totalItems} 筆
      </span>

      {/* Center: page size */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">每頁</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 border border-slate-200 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Right: page navigation */}
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 px-3 rounded-lg text-sm border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          &lt; 上一頁
        </button>
        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="h-8 px-2 flex items-center text-sm text-slate-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-[2rem] px-2 rounded-lg text-sm border transition-colors ${
                p === currentPage
                  ? "bg-[#2563EB] text-white border-[#2563EB]"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 px-3 rounded-lg text-sm border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          下一頁 &gt;
        </button>
      </div>
    </div>
  );
}
