import { Settings, Clock, Calendar } from "lucide-react";
import { TimeField, NumberField, WeekOffPicker } from "./UIComponents";

interface ShiftSettingsPanelProps {
  shiftName: string;
  setShiftName: (v: string) => void;
  shiftStart: string;
  setShiftStart: (v: string) => void;
  shiftEnd: string;
  setShiftEnd: (v: string) => void;
  graceMinutes: number;
  setGraceMinutes: (v: number) => void;
  weekOffDays: number[];
  setWeekOffDays: (v: number[]) => void;
  lateAfter: string;
}

export function ShiftSettingsPanel({
  shiftName,
  setShiftName,
  shiftStart,
  setShiftStart,
  shiftEnd,
  setShiftEnd,
  graceMinutes,
  setGraceMinutes,
  weekOffDays,
  setWeekOffDays,
  lateAfter,
}: ShiftSettingsPanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* Panel Header */}
      <div className="bg-gradient-to-r from-zinc-50 to-white px-6 py-4 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-zinc-100 p-2">
            <Settings className="h-5 w-5 text-zinc-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Shift & Timing Settings</h2>
            <p className="text-sm text-zinc-600">Configure work schedules and policies</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Shift Name */}
        <div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-zinc-700">Shift Name</span>
            <input
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent hover:border-zinc-300"
              placeholder="General Shift"
            />
          </label>
        </div>

        {/* Working Hours */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-700">Working Hours</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TimeField label="Start Time" value={shiftStart} onChange={setShiftStart} />
            <TimeField label="End Time" value={shiftEnd} onChange={setShiftEnd} />
          </div>
        </div>

        {/* Grace Period */}
        <div>
          <NumberField
            label="Grace Minutes"
            value={graceMinutes}
            onChange={setGraceMinutes}
            min={0}
            max={120}
          />
          <p className="text-xs text-zinc-500 mt-1">
            Employees can mark attendance within this period after shift start without being marked late
          </p>
        </div>

        {/* Week Off Days */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-700">Week Off Days</span>
          </div>
          <WeekOffPicker value={weekOffDays} onChange={setWeekOffDays} />
        </div>

        {/* Rules Preview */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            Computed Rules Preview
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Late after:</span>
              <span className="font-bold text-zinc-900 bg-white px-2 py-1 rounded border border-zinc-200">
                {lateAfter}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">No IN on working day:</span>
              <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                ABSENT
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Holiday/Week-off:</span>
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                Not counted as absent
              </span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <div className="h-4 w-4 rounded-full bg-amber-200 mt-0.5 flex-shrink-0"></div>
            <div className="text-xs text-amber-800">
              <strong>Note:</strong> These settings update the attendance rules instantly. In production, you can save these configurations to the database for persistent use across sessions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
