import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { Edit, Trash } from "lucide-react";
import { useCreateTimeGroup, useSoftDeleteTimeGroup, useTimeGroups, useUpdateTimeGroup } from "../../service/useTimeGroup";
import { DeleteConfirmDialog } from "../common/DeleteConfirmDialog";
import {
  bitmaskToWeekdays,
  formatTimeForDisplay,
  normalizeUnixMillis,
  normalizeUnixSeconds,
  timeStringToSeconds,
  toTimeInputValue,
  weekdaysToBitmask,
  type Weekday,
  weekdayLabelMap,
  weekdayOptions,
} from "./utils";
import { useAuth } from "../../auth/AuthProvider";

const initialTimeForm = {
  time_group_id: "",
  timestamp: "",
  del_flag: "0",
  start: "",
  end: "",
  weekdays: [] as Weekday[],
};

const TimeGroupTab = () => {
  const { user } = useAuth();
  const role = String((user as any)?.role ?? "").toLowerCase();
  const isOperator = role === "operator";
  const [timeOpen, setTimeOpen] = useState(false);
  const [timePaginationModel, setTimePaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [isTimeEditMode, setIsTimeEditMode] = useState(false);
  const [selectedTimeId, setSelectedTimeId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeForm, setTimeForm] = useState(initialTimeForm);
  const [deleteTarget, setDeleteTarget] = useState<null | { time_group_id: string }>(null);

  const createTimeGroup = useCreateTimeGroup();
  const updateTimeGroup = useUpdateTimeGroup();
  const softDeleteTimeGroup = useSoftDeleteTimeGroup();

  const {
    data: timeGroupsData,
    isLoading: isTimeGroupsLoading,
    isFetching: isTimeGroupsFetching,
    isError: isTimeGroupsError,
  } = useTimeGroups(0, true, timePaginationModel.page + 1, timePaginationModel.pageSize);

  const timeList = Array.isArray(timeGroupsData)
    ? timeGroupsData
    : Array.isArray(timeGroupsData?.data)
      ? timeGroupsData.data
      : Array.isArray(timeGroupsData?.items)
        ? timeGroupsData.items
        : [];

  const timeGroupsRowCount =
    Number(
      (timeGroupsData as any)?.pagination?.total ??
        (timeGroupsData as any)?.totalCount ??
        (timeGroupsData as any)?.total ??
        timeList.length
    ) || 0;

  const timeRows = useMemo(() => {
    return timeList.map((item: any, index: number) => {
      const firstConfig = item?.time_configs?.[0];
      const rawWeekdays = firstConfig?.weekdays;
      const weekdaysArray: Weekday[] = Array.isArray(rawWeekdays)
        ? (rawWeekdays
            .map((day: number) => Number(day))
            .filter((day: number) => day >= 1 && day <= 7) as Weekday[])
        : typeof rawWeekdays === "number"
          ? bitmaskToWeekdays(rawWeekdays)
          : [];

      return {
        id: item?.id ?? `${item?.time_group_id || "tg"}-${index}`,
        api_id: item?.id ?? "",
        time_group_id: item?.time_group_id ?? "-",
        timestamp: item?.timestamp ?? "-",
        del_flag: item?.del_flag ?? "0",
        start: formatTimeForDisplay(firstConfig?.start),
        end: formatTimeForDisplay(firstConfig?.end),
        weekdaysRaw: rawWeekdays,
        weekdays:
          weekdaysArray.length > 0
            ? weekdaysArray.map((day: number) => weekdayLabelMap[day] || String(day)).join(", ")
            : "-",
      };
    });
  }, [timeList]);

  const handleEditTimeRow = (row: any) => {
    setError("");
    setSuccess("");
    setIsTimeEditMode(true);
    setSelectedTimeId(String(row.api_id ?? row.id ?? ""));
    setTimeForm({
      time_group_id: String(row.time_group_id ?? ""),
      timestamp: normalizeUnixSeconds(row.timestamp),
      del_flag: String(row.del_flag ?? "0"),
      start: toTimeInputValue(row.start),
      end: toTimeInputValue(row.end),
      weekdays: Array.isArray(row.weekdaysRaw)
        ? (row.weekdaysRaw
            .map((day: number) => Number(day))
            .filter((day: number) => day >= 1 && day <= 7) as Weekday[])
        : typeof row.weekdaysRaw === "number"
          ? bitmaskToWeekdays(row.weekdaysRaw)
          : [],
    });
    setTimeOpen(true);
  };

  const handleDeleteTimeRow = (row: any) => {
    const time_group_id = String(row?.time_group_id ?? "").trim();
    if (!time_group_id || time_group_id === "-") {
      setError("Invalid record selected for delete.");
      return;
    }
    setDeleteTarget({ time_group_id });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setError("");
    setSuccess("");
    try {
      await softDeleteTimeGroup.mutateAsync({ time_group_id: deleteTarget.time_group_id });
      setSuccess("Time group deleted successfully.");
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.response?.data?.msg || err?.response?.data?.message || "Failed to delete time group.");
    }
  };

  const handleToggleTimeWeekday = (day: Weekday) => {
    setTimeForm((prev) => {
      const exists = prev.weekdays.includes(day);
      return {
        ...prev,
        weekdays: exists ? prev.weekdays.filter((d) => d !== day) : [...prev.weekdays, day].sort((a, b) => a - b),
      };
    });
  };

  const timeGroupColumns: GridColDef[] = [
    { field: "time_group_id", headerName: "TimeGroupID", flex: 0.9 },
    { field: "timestamp", headerName: "Timestamp", flex: 1 },
    { field: "start", headerName: "Start time", flex: 0.9 },
    { field: "end", headerName: "End time", flex: 0.9 },
    { field: "weekdays", headerName: "Weekdays", flex: 1.2 },
    {
      field: "action",
      headerName: "Action",
      flex: 0.6,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          {!isOperator && (
            <>
              <IconButton size="small" onClick={() => handleEditTimeRow(params.row)}>
                <Edit size={18} />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => handleDeleteTimeRow(params.row)}>
                <Trash size={18} />
              </IconButton>
            </>
          )}
        </Stack>
      ),
    },
  ];

  const handleTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (timeForm.weekdays.length === 0) {
      setError("Select at least one weekday.");
      return;
    }
    if (!timeForm.time_group_id || !timeForm.timestamp || !timeForm.del_flag || !timeForm.start || !timeForm.end) {
      setError("Please fill all fields.");
      return;
    }

    const payload = {
      time_group_id: timeForm.time_group_id,
      timestamp: Number(timeForm.timestamp),
      del_flag: Number(timeForm.del_flag),
      time_configs: [
        {
          start: timeStringToSeconds(timeForm.start),
          end: timeStringToSeconds(timeForm.end),
          weekdays: weekdaysToBitmask(timeForm.weekdays),
        },
      ],
    };

    try {
      if (isTimeEditMode) {
        if (!selectedTimeId) {
          setError("Invalid record selected for update.");
          return;
        }
        await updateTimeGroup.mutateAsync({ id: selectedTimeId, payload: payload as any });
        setSuccess("Time group updated successfully.");
      } else {
        await createTimeGroup.mutateAsync(payload as any);
        setSuccess("Time group created successfully.");
      }
      setTimeOpen(false);
      setTimeForm(initialTimeForm);
      setSelectedTimeId("");
      setIsTimeEditMode(false);
    } catch (err: any) {
      setError(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          (isTimeEditMode ? "Failed to update time group." : "Failed to create time group.")
      );
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        {!isOperator && (
          <Button
            variant="contained"
            className="!bg-primary"
            onClick={() => {
              setError("");
              setSuccess("");
              setIsTimeEditMode(false);
              setSelectedTimeId("");
              setTimeForm({
                time_group_id: "",
                timestamp: String(Math.floor(Date.now() / 1000)),
                del_flag: "0",
                start: "",
                end: "",
                weekdays: [],
              });
              setTimeOpen(true);
            }}
          >
            Create time group
          </Button>
        )}
      </div>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {error && !timeOpen && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {isTimeGroupsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to fetch time groups.
        </Alert>
      )}

      <Box sx={{ height: 560, width: "100%", mb: 2 }}>
        <DataGrid
          rows={timeRows}
          columns={timeGroupColumns}
          loading={isTimeGroupsLoading || isTimeGroupsFetching}
          pagination
          paginationMode="server"
          rowCount={timeGroupsRowCount}
          pageSizeOptions={[5, 10, 20, 50]}
          paginationModel={timePaginationModel}
          onPaginationModelChange={setTimePaginationModel}
          disableRowSelectionOnClick
          disableColumnSelector
          sx={{
            "& .MuiDataGrid-cell:focus": { outline: "none" },
          }}
        />
      </Box>

      <Dialog
        open={timeOpen}
        onClose={() => {
          if (createTimeGroup.isPending || updateTimeGroup.isPending) return;
          setTimeOpen(false);
          setIsTimeEditMode(false);
          setSelectedTimeId("");
        }}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleTimeSubmit}>
          <DialogTitle>{isTimeEditMode ? "Edit time group" : "Create time group"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="TimeGroupID"
                value={timeForm.time_group_id}
                onChange={(e) => setTimeForm((prev) => ({ ...prev, time_group_id: e.target.value }))}
                required
                fullWidth
              />

              <TextField
                label="Timestamp"
                type="number"
                value={
                  normalizeUnixSeconds(timeForm.timestamp)
                    ? normalizeUnixMillis(timeForm.timestamp)
                    : timeForm.timestamp
                }
                onChange={(e) => setTimeForm((prev) => ({ ...prev, timestamp: e.target.value }))}
                required
                fullWidth
              />

              <TextField
                label="Start"
                type="time"
                value={timeForm.start}
                onChange={(e) => setTimeForm((prev) => ({ ...prev, start: e.target.value }))}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="End"
                type="time"
                value={timeForm.end}
                onChange={(e) => setTimeForm((prev) => ({ ...prev, end: e.target.value }))}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <Box>
                <Box sx={{ mb: 1, fontWeight: 600 }}>Weekdays</Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {weekdayOptions.map((d) => (
                    <Button
                      key={d.value}
                      variant={timeForm.weekdays.includes(d.value) ? "contained" : "outlined"}
                      size="small"
                      onClick={() => handleToggleTimeWeekday(d.value)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setTimeOpen(false);
                setIsTimeEditMode(false);
                setSelectedTimeId("");
              }}
              disabled={createTimeGroup.isPending || updateTimeGroup.isPending}
            >
              Cancel
            </Button>
            {!isTimeEditMode ? (
              <Button type="submit" variant="contained" disabled={createTimeGroup.isPending}>
                {createTimeGroup.isPending ? "Saving..." : "Save"}
              </Button>
            ) : (
              <Button type="submit" variant="contained" disabled={updateTimeGroup.isPending}>
                {updateTimeGroup.isPending ? "Updating..." : "Update"}
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete time group"
        message={
          deleteTarget
            ? `Are you sure you want to delete time group ${deleteTarget.time_group_id}?`
            : "Are you sure you want to delete this time group?"
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={softDeleteTimeGroup.isPending}
      />
    </>
  );
};

export default TimeGroupTab;
