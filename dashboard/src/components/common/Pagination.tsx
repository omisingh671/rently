import { useEffect, useState } from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
} from "react-icons/hi2";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  const [input, setInput] = useState(String(page));

  const isFirst = page === 1;
  const isLast = page === totalPages;

  useEffect(() => {
    setInput(String(page));
  }, [page]);

  const commitPageChange = () => {
    const next = Number(input);

    if (Number.isNaN(next)) {
      setInput(String(page));
      return;
    }

    const clamped = Math.min(Math.max(next, 1), totalPages);

    if (clamped !== page) {
      onPageChange(clamped);
    } else {
      setInput(String(page));
    }
  };

  const navBtn =
    "h-8 w-8 rounded-lg flex items-center justify-center text-sm font-medium transition cursor-pointer";
  const navBtnActive = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
  const navBtnDisabled = "text-slate-300 cursor-not-allowed";

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          disabled={isFirst}
          onClick={() => onPageChange(1)}
          className={`${navBtn} ${isFirst ? navBtnDisabled : navBtnActive}`}
          aria-label="First page"
        >
          <HiChevronDoubleLeft className="h-4 w-4" />
        </button>

        <button
          disabled={isFirst}
          onClick={() => onPageChange(page - 1)}
          className={`${navBtn} ${isFirst ? navBtnDisabled : navBtnActive}`}
          aria-label="Previous page"
        >
          <HiChevronLeft className="h-4 w-4" />
        </button>

        <div className="mx-2 flex items-center gap-2 text-sm text-slate-600 font-medium">
          <span>Page</span>

          <input
            type="number"
            min={1}
            max={totalPages}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={commitPageChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitPageChange();
                e.currentTarget.blur();
              }
            }}
            className="h-8 w-12 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-center font-bold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <span>of {totalPages}</span>
        </div>

        <button
          disabled={isLast}
          onClick={() => onPageChange(page + 1)}
          className={`${navBtn} ${isLast ? navBtnDisabled : navBtnActive}`}
          aria-label="Next page"
        >
          <HiChevronRight className="h-4 w-4" />
        </button>

        <button
          disabled={isLast}
          onClick={() => onPageChange(totalPages)}
          className={`${navBtn} ${isLast ? navBtnDisabled : navBtnActive}`}
          aria-label="Last page"
        >
          <HiChevronDoubleRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
