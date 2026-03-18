import React from "react";
import { CheckCircle2, XCircle, CalendarDays, Clock, AlertCircle } from "lucide-react";
import type { Status } from "./types";

export function StatusPill({ status }: { status: Status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border transition-all duration-200 shadow-sm";
  const map: Record<Status, string> = {
    PRESENT: "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 hover:shadow-md",
    LATE: "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 hover:shadow-md",
    ABSENT: "border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-200 hover:shadow-md",
    HOLIDAY: "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-md",
    WEEK_OFF: "border-purple-300 bg-purple-100 text-purple-800 hover:bg-purple-200 hover:shadow-md",
    UPCOMING: "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md",
  };
  
  const icons: Record<Status, React.ReactNode> = {
    PRESENT: <CheckCircle2 className="h-3 w-3 mr-1" />,
    LATE: <Clock className="h-3 w-3 mr-1" />,
    ABSENT: <XCircle className="h-3 w-3 mr-1" />,
    HOLIDAY: <CalendarDays className="h-3 w-3 mr-1" />,
    WEEK_OFF: <CalendarDays className="h-3 w-3 mr-1" />,
    UPCOMING: <AlertCircle className="h-3 w-3 mr-1" />,
  };

  return (
    <span className={`${base} ${map[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "from-zinc-900 to-zinc-700",
  trend,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      <div
        className={[
          "absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-20 group-hover:opacity-30 transition-opacity",
          accent,
        ].join(" ")}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
            {title}
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent mb-1">{value}</div>
          {subtitle && <div className="text-sm text-slate-600">{subtitle}</div>}
          {trend && (
            <div className={`text-xs font-medium mt-2 px-2 py-1 rounded-full inline-flex items-center ${
              trend.isPositive ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
            }`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </div>
          )}
        </div>
        <div className="rounded-xl border border-white/30 bg-gradient-to-br from-white/50 to-white/20 p-3 backdrop-blur-sm group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ 
  value, 
  total, 
  color = "zinc",
  showPercentage = true 
}: { 
  value: number; 
  total: number; 
  color?: "green" | "red" | "zinc" | "amber" | "emerald" | "rose" | "blue";
  showPercentage?: boolean;
}) {
  const pct = total <= 0 ? 0 : Math.round((value / total) * 100);
  
  const colorClasses = {
    green: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    red: "bg-gradient-to-r from-rose-500 to-rose-600", 
    zinc: "bg-gradient-to-r from-slate-600 to-slate-700",
    amber: "bg-gradient-to-r from-amber-500 to-amber-600",
    emerald: "bg-gradient-to-r from-emerald-500 to-teal-600",
    rose: "bg-gradient-to-r from-rose-500 to-pink-600",
    blue: "bg-gradient-to-r from-blue-500 to-indigo-600"
  };

  const bgColors = {
    green: "bg-emerald-100",
    red: "bg-rose-100",
    zinc: "bg-slate-100",
    amber: "bg-amber-100",
    emerald: "bg-emerald-100",
    rose: "bg-rose-100",
    blue: "bg-blue-100"
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
        <span className="font-medium">Attendance Rate</span>
        {showPercentage && (
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-full">{pct}%</span>
        )}
      </div>
      <div className={`h-3 w-full rounded-full ${bgColors[color]} overflow-hidden shadow-inner`}>
        <div 
          className={`h-full rounded-full ${colorClasses[color]} transition-all duration-700 ease-out relative overflow-hidden`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
      </div>
      <div className="mt-1 text-xs text-slate-500 text-right">
        {value} of {total} days
      </div>
    </div>
  );
}

export function TimeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-zinc-700 font-medium">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border px-3 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent ${
          error ? 'border-red-300 bg-red-50' : 'border-zinc-200 hover:border-zinc-300'
        }`}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 600,
  error,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-zinc-700 font-medium">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`rounded-lg border px-3 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent ${
          error ? 'border-red-300 bg-red-50' : 'border-zinc-200 hover:border-zinc-300'
        }`}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function WeekOffPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (v: number[]) => void;
}) {
  const days: { k: number; name: string; short: string }[] = [
    { k: 0, name: "Sunday", short: "Sun" },
    { k: 1, name: "Monday", short: "Mon" },
    { k: 2, name: "Tuesday", short: "Tue" },
    { k: 3, name: "Wednesday", short: "Wed" },
    { k: 4, name: "Thursday", short: "Thu" },
    { k: 5, name: "Friday", short: "Fri" },
    { k: 6, name: "Saturday", short: "Sat" },
  ];

  return (
    <div className="text-sm">
      <div className="mb-3 text-zinc-700 font-medium">Week Off Days</div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const selected = value.includes(d.k);
          return (
            <button
              key={d.k}
              type="button"
              onClick={() => {
                if (selected) onChange(value.filter((x) => x !== d.k));
                else onChange([...value, d.k].sort((a, b) => a - b));
              }}
              className={[
                "relative rounded-lg border px-2 py-2 text-xs font-semibold transition-all duration-200",
                selected 
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" 
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
              ].join(" ")}
              title={d.name}
            >
              {d.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
