import { Users, Clock, Calendar, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { StatusPill } from "./UIComponents";
import type { 
  InPunch, 
  Holiday, 
  ComputedStatus, 
  DayAgg, 
  AllUsersType 
} from "./types";

interface DayDetailsDrawerContentProps {
  selectedUserId: string | AllUsersType;
  punch: InPunch | null;
  computed: ComputedStatus | null;
  holiday: Holiday | null;
  agg: DayAgg | null;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  lateAfter: string;
}

export function DayDetailsDrawerContent({
  selectedUserId,
  punch,
  computed,
  holiday,
  agg,
  shiftName,
  shiftStart,
  shiftEnd,
  graceMinutes,
  lateAfter,
}: DayDetailsDrawerContentProps) {
  const isAll = selectedUserId === "ALL";

  if (isAll) {
    return (
      <div className="space-y-4">
        {/* Summary Card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-600" />
            Summary
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{agg?.present ?? 0}</div>
              <div className="text-xs text-green-600">Present</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{agg?.absent ?? 0}</div>
              <div className="text-xs text-red-600">Absent</div>
            </div>
            {agg?.late ? (
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-2xl font-bold text-amber-700">{agg.late}</div>
                <div className="text-xs text-amber-600">Late</div>
              </div>
            ) : (
              <div className="text-center p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <div className="text-2xl font-bold text-zinc-400">0</div>
                <div className="text-xs text-zinc-500">Late</div>
              </div>
            )}
          </div>
        </div>

        {/* Shift Info */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-600" />
            Shift Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600">Shift Name:</span>
              <span className="font-semibold text-zinc-900">{shiftName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Working Hours:</span>
              <span className="font-mono text-zinc-900">{shiftStart}–{shiftEnd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Grace Period:</span>
              <span className="font-semibold text-zinc-900">{graceMinutes} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Late After:</span>
              <span className="font-semibold text-amber-600">{lateAfter}</span>
            </div>
          </div>
        </div>

        {/* Special Day Info */}
        {agg?.holiday && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Holiday
            </h3>
            <div className="text-blue-800">{agg.holiday.name}</div>
          </div>
        )}

        {agg?.weekOff && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="font-semibold text-zinc-700 mb-2">Week Off</h3>
            <div className="text-zinc-600">Selected day is a week off.</div>
          </div>
        )}

        {agg?.upcoming && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="font-semibold text-zinc-700 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Upcoming Day
            </h3>
            <div className="text-zinc-600">No attendance status yet.</div>
          </div>
        )}

        {/* User Details */}
        {agg && !agg.weekOff && !agg.upcoming && !agg.holiday && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="font-semibold text-zinc-900 mb-3">Users on this day</h3>
            <div className="space-y-3">
              {agg.details.map((u) => (
                <div key={u.userId} className="flex items-center justify-between gap-3 p-3 bg-zinc-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-zinc-900">{u.userName}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">
                      {u.inTime ? `IN ${u.inTime}` : "No IN"}
                      {u.note ? ` • ${u.note}` : ""}
                    </div>
                  </div>
                  <StatusPill status={u.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Single user view
  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-zinc-900">Attendance Status</h3>
          <StatusPill status={computed?.status || "UPCOMING"} />
        </div>
        {computed?.label && (
          <div className="text-sm text-zinc-600 bg-zinc-50 p-2 rounded">
            {computed.label}
          </div>
        )}
      </div>

      {/* Shift Info */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-600" />
          Shift Details
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">Shift:</span>
            <span className="font-semibold text-zinc-900">{shiftName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Hours:</span>
            <span className="font-mono text-zinc-900">{shiftStart}–{shiftEnd}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Grace:</span>
            <span className="font-semibold text-zinc-900">{graceMinutes} min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Late After:</span>
            <span className="font-semibold text-amber-600">{lateAfter}</span>
          </div>
        </div>
      </div>

      {/* Holiday Info */}
      {holiday && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Holiday
          </h3>
          <div className="text-blue-800">{holiday.name}</div>
        </div>
      )}

      {/* Punch Details */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="font-semibold text-zinc-900 mb-3">Punch Records</h3>
        {punch ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">IN Time</span>
              </div>
              <span className="font-bold text-green-700 font-mono">{punch.inTime}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">No IN Punch</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions Note */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-xs text-amber-800">
            <strong>Future Actions:</strong> Regularize attendance, mark leave, or apply admin overrides will be available here.
          </div>
        </div>
      </div>
    </div>
  );
}
