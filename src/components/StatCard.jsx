import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function StatCard({
  title,
  value,
  description,
  icon,
  href = "#",
  highlight = false,
  delay = "",
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 truncate text-3xl font-bold ${
              highlight
                ? "text-blue-600"
                : "text-slate-900"
            }`}
          >
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={`dcc-icon-motion flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              highlight
                ? "bg-blue-100 text-blue-700"
                : "bg-blue-50 text-blue-600"
            }`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold text-slate-400">
          View details
        </span>

        <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition group-hover:gap-2">
          Open
          <ArrowRight
            size={14}
            className="dcc-arrow-motion"
          />
        </span>
      </div>
    </>
  );

  if (!href || href === "#") {
    return (
      <div
        className={`dcc-card-motion dcc-fade-up rounded-2xl border bg-white p-5 shadow-sm ${
          highlight
            ? "border-blue-200 ring-1 ring-blue-100"
            : "border-slate-200"
        } ${delay}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`dcc-card-motion dcc-fade-up group block rounded-2xl border bg-white p-5 shadow-sm ${
        highlight
          ? "border-blue-200 ring-1 ring-blue-100"
          : "border-slate-200"
      } ${delay}`}
    >
      {content}
    </Link>
  );
}