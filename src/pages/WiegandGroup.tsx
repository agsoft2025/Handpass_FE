import { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { Edit, Trash } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import { useDevices } from "../service/useDevice";
import { useUsers } from "../service/useUsers";
import {
  useCreateUserWiegand,
  useCreateWiegandGroup,
  useDeleteUserWiegand,
  useUpdateWiegandGroup,
  useUpdateUserWiegand,
  useUserWiegands,
  useWiegandGroups,
} from "../service/useWiegandGroup";

type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const weekdayOptions: { label: string; value: Weekday }[] = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
];
const weekdayLabelMap: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

const weekdaysToBitmask = (days: Weekday[]) =>
  days.reduce((mask, day) => mask | (1 << (day - 1)), 0);

const bitmaskToWeekdays = (mask: number): Weekday[] =>
  weekdayOptions
    .map((day) => day.value)
    .filter((day) => (mask & (1 << (day - 1))) !== 0);

const timeStringToSeconds = (time: string) => {
  const [hh, mm] = time.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh * 3600 + mm * 60;
};

const secondsToTimeString = (seconds: number) => {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hh = String(Math.floor(total / 3600) % 24).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  return `${hh}:${mm}`;
};

const formatTimeForDisplay = (value: unknown) => {
  if (typeof value === "number") return secondsToTimeString(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return secondsToTimeString(Number(trimmed));
    return trimmed || "-";
  }
  return "-";
};

const toTimeInputValue = (value: unknown) => {
  if (typeof value === "number") return secondsToTimeString(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return secondsToTimeString(Number(trimmed));
    return trimmed;
  }
  return "";
};

const normalizeUnixSeconds = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return String(numeric >= 1_000_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric));
};

const initialForm = {
  group_id: "",
  sn: "",
  timestamp: "",
  del_flag: "0",
  start: "",
  end: "",
  weekdays: [] as Weekday[],
};

const initialAssignForm = {
  sn: "",
  user_id: "",
  group_id: "",
  timestamp: "",
  del_flag: false,
};

type DeviceSnOption = {
  sn: string;
  label: string;
};

type GroupIdOption = {
  group_id: string;
  sn: string;
};

function TabPanel(props: { children?: React.ReactNode; value: number; index: number }) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const WiegandGroup = () => {
  const [tabValue, setTabValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [groupsPaginationModel, setGroupsPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [assignPaginationModel, setAssignPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [snSearchText, setSnSearchText] = useState("");
  const [snSearchQuery, setSnSearchQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [isAssignEditMode, setIsAssignEditMode] = useState(false);
  const [selectedAssignId, setSelectedAssignId] = useState("");
  const [assignSnSearchText, setAssignSnSearchText] = useState("");
  const [assignSnSearchQuery, setAssignSnSearchQuery] = useState("");
  const [assignUserSearchText, setAssignUserSearchText] = useState("");
  const [assignForm, setAssignForm] = useState(initialAssignForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(initialForm);
  const debouncedSnSearchQuery = useDebounce(snSearchQuery, 400);
  const debouncedAssignSnSearchQuery = useDebounce(assignSnSearchQuery, 400);
  const debouncedAssignUserSearchText = useDebounce(assignUserSearchText, 400);
  const createWiegandGroup = useCreateWiegandGroup();
  const updateWiegandGroup = useUpdateWiegandGroup();
  const createUserWiegand = useCreateUserWiegand();
  const deleteUserWiegand = useDeleteUserWiegand();
  const updateUserWiegand = useUpdateUserWiegand();
  const {
    data: userWiegandsData,
    isLoading: isUserWiegandsLoading,
    isFetching: isUserWiegandsFetching,
    isError: isUserWiegandsError,
  } = useUserWiegands(true, assignPaginationModel.page + 1, assignPaginationModel.pageSize);
  const { data, isLoading, isFetching, isError } = useWiegandGroups(
    0,
    true,
    groupsPaginationModel.page + 1,
    groupsPaginationModel.pageSize
  );
  const { data: devicesData, isLoading: isDevicesLoading } = useDevices(1, debouncedSnSearchQuery);
  const { data: assignDevicesData, isLoading: isAssignDevicesLoading } = useDevices(1, debouncedAssignSnSearchQuery);
  const { data: usersData, isLoading: isUsersLoading } = useUsers(1, 100, debouncedAssignUserSearchText);

  const snOptions: DeviceSnOption[] = useMemo(() => {
    return Array.from(
      new Map(
        (devicesData?.data || [])
          .filter((device: any) => device?.sn)
          .map((device: any) => {
            const sn = String(device.sn);
            const deviceName = String(device?.device_name || "").trim();
            const label = deviceName ? `${deviceName} (${sn})` : sn;
            return [sn, { sn, label }];
          })
      ).values()
    );
  }, [devicesData]);

  const assignSnOptions: DeviceSnOption[] = useMemo(() => {
    return Array.from(
      new Map(
        (assignDevicesData?.data || [])
          .filter((device: any) => device?.sn)
          .map((device: any) => {
            const sn = String(device.sn);
            const deviceName = String(device?.device_name || device?.name || "").trim();
            const label = deviceName ? `${deviceName} (${sn})` : sn;
            return [sn, { sn, label }];
          })
      ).values()
    );
  }, [assignDevicesData]);

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
        ? data.items
        : [];

  const groupsRowCount =
    Number((data as any)?.pagination?.total ?? (data as any)?.totalCount ?? (data as any)?.total ?? list.length) || 0;

  const handleEditRow = (row: any) => {
    setError("");
    setSuccess("");
    setIsEditMode(true);
    setSelectedId(String(row.api_id ?? row.id ?? ""));
    setForm({
      group_id: String(row.group_id ?? ""),
      sn: String(row.snRaw ?? row.sn ?? ""),
      timestamp: normalizeUnixSeconds(row.timestamp),
      del_flag: String(row.del_flag ?? "0"),
      start: toTimeInputValue(row.start),
      end: toTimeInputValue(row.end),
      weekdays: Array.isArray(row.weekdaysRaw)
        ? row.weekdaysRaw
            .map((day: number) => Number(day))
            .filter((day: number) => day >= 1 && day <= 7) as Weekday[]
        : typeof row.weekdaysRaw === "number"
          ? bitmaskToWeekdays(row.weekdaysRaw)
          : [],
    });
    setSnSearchText(String(row.sn ?? row.snRaw ?? ""));
    setSnSearchQuery(String(row.snRaw ?? row.sn ?? ""));
    setOpen(true);
  };

  const columns: GridColDef[] = [
    { field: "group_id", headerName: "Group ID", flex: 0.7 },
    { field: "sn", headerName: "SN", flex: 1.5 },
    { field: "timestamp", headerName: "Timestamp", flex: 1 },
    { field: "del_flag", headerName: "Del Flag", flex: 0.7 },
    { field: "start", headerName: "Start", flex: 0.8 },
    { field: "end", headerName: "End", flex: 0.8 },
    { field: "weekdays", headerName: "Weekdays", flex: 1.2 },
    {
      field: "action",
      headerName: "Action",
      flex: 0.6,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={() => handleEditRow(params.row)}>
          <Edit size={18} />
        </IconButton>
      ),
    },
  ];

  const rows = list.map((item: any, index: number) => {
    const firstConfig = item?.time_configs?.[0];
    const rawWeekdays = firstConfig?.weekdays;
    const deviceName = String(item?.device?.name ?? "").trim();
    const serialNumber = String(item?.sn ?? "").trim();
    const snDisplay =
      deviceName && serialNumber ? `${deviceName} (${serialNumber})` : serialNumber || deviceName || "-";
    const weekdaysArray: Weekday[] = Array.isArray(rawWeekdays)
      ? rawWeekdays
          .map((day: number) => Number(day))
          .filter((day: number) => day >= 1 && day <= 7) as Weekday[]
      : typeof rawWeekdays === "number"
        ? bitmaskToWeekdays(rawWeekdays)
        : [];
    return {
      id: item?.id ?? `${item?.group_id || "wg"}-${index}`,
      api_id: item?.id ?? "",
      group_id: item?.group_id ?? "-",
      sn: snDisplay,
      snRaw: serialNumber,
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

  const assignList = Array.isArray(userWiegandsData)
    ? userWiegandsData
    : Array.isArray(userWiegandsData?.data)
      ? userWiegandsData.data
      : Array.isArray(userWiegandsData?.items)
        ? userWiegandsData.items
        : [];

  const assignRowCount =
    Number(
      (userWiegandsData as any)?.pagination?.total ??
        (userWiegandsData as any)?.totalCount ??
        (userWiegandsData as any)?.total ??
        assignList.length
    ) || 0;

  function handleEditAssignRow(row: any) {
    setAssignError("");
    setAssignSuccess("");
    setIsAssignEditMode(true);
    setSelectedAssignId(String(row?.api_id || row?.id || ""));

    const snDisplay = String(row?.sn || "");
    const extractedSn = snDisplay.match(/\(([^)]+)\)\s*$/)?.[1] || "";
    const sn = String(row?.snRaw || extractedSn || "");
    const timestampValue = normalizeUnixSeconds(row?.timestampRaw ?? row?.timestamp) || "";

    setAssignForm((prev) => ({
      ...prev,
      sn,
      user_id: String(row?.user_id ?? ""),
      group_id: String(row?.group_id ?? ""),
      timestamp: timestampValue,
    }));
    setAssignSnSearchText(snDisplay || sn);
    setAssignSnSearchQuery(sn);
    setAssignUserSearchText(String(row?.user_id ?? ""));
    setAssignOpen(true);
  }

  async function handleDeleteAssignRow(row: any) {
    const id = String(row?.api_id || row?.id || "");
    if (!id) {
      setAssignError("Invalid record selected for delete.");
      return;
    }
    const ok = window.confirm(`Delete this assignment (${id})?`);
    if (!ok) return;

    setAssignError("");
    setAssignSuccess("");
    try {
      await deleteUserWiegand.mutateAsync(id);
      setAssignSuccess("Deleted assignment successfully.");
    } catch (err: any) {
      setAssignError(err?.response?.data?.message || "Failed to delete assignment.");
    }
  }

  const assignColumns: GridColDef[] = [
    // { field: "id", headerName: "ID", flex: 1.4 },
    { field: "user_id", headerName: "User ID", flex: 0.7 },
    { field: "group_id", headerName: "Group ID", flex: 0.8 },
    { field: "sn", headerName: "Device", flex: 1.8 },
    // { field: "group_uuid", headerName: "Group UUID", flex: 1.4 },
    { field: "timestamp", headerName: "Timestamp", flex: 1 },
    { field: "del_flag", headerName: "Del Flag", flex: 0.8 },
    {
           field: "actions",
           headerName: "Actions",
           flex: 1,
           sortable: false,
           renderCell: (params) => (
             <div>
               <Button variant="text" size="small" onClick={() => handleEditAssignRow(params.row)}>
                 <Edit />
               </Button>
                <Button
                  variant="text"
                  color="error"
                 size="small"
                 onClick={() => handleDeleteAssignRow(params.row)}
                 disabled={deleteUserWiegand.isPending}
               >
                 <Trash />
               </Button>
             </div>
           ),
         },
  ];

  const assignRows = assignList.map((item: any, index: number) => {
    const apiId = item?.id ?? item?.user_wiegand_id ?? "";
    const snRaw = String(item?.sn ?? item?.device_sn ?? item?.serial_number ?? "");
    const deviceName = String(item?.device_name ?? item?.device?.name ?? "").trim();
    const snDisplay = deviceName && snRaw ? `${deviceName} (${snRaw})` : deviceName || snRaw || "-";
    const timestampRaw = item?.timestamp;
    return {
      id: item?.id ?? item?.user_wiegand_id ?? `${item?.user_id || "uw"}-${index}`,
      api_id: apiId ? String(apiId) : "",
      sn: snDisplay,
      snRaw,
      user_id: item?.user_id ?? "-",
      group_uuid: item?.group_uuid ?? "-",
      group_id: item?.group_id ?? "-",
      timestamp: normalizeUnixSeconds(timestampRaw) || "-",
      timestampRaw,
      del_flag: typeof item?.del_flag === "boolean" ? (item.del_flag ? "true" : "false") : "-",
    };
  });

  const groupOptions = Array.from(
    new Map(
      list
        .filter((item: any) => item?.group_id)
        .map((item: any) => [item.group_id, { group_id: String(item.group_id), sn: String(item.sn || "") } satisfies GroupIdOption])
    ).values()
  ) as GroupIdOption[];

  const userIdOptions = Array.from(
    new Set((usersData?.data || []).map((user: any) => user?.user_id).filter(Boolean))
  );

  const handleToggleWeekday = (day: Weekday) => {
    setForm((prev) => {
      const exists = prev.weekdays.includes(day);
      return {
        ...prev,
        weekdays: exists
          ? prev.weekdays.filter((d) => d !== day)
          : [...prev.weekdays, day].sort((a, b) => a - b),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.weekdays.length === 0) {
      setError("Select at least one weekday.");
      return;
    }
    if (!form.group_id || !form.sn || !form.timestamp || !form.del_flag || !form.start || !form.end) {
      setError("Please fill all fields.");
      return;
    }

    const payload = {
      group_id: form.group_id,
      sn: form.sn,
      timestamp: Number(form.timestamp),
      del_flag: Number(form.del_flag),
      time_configs: [
        {
          start: timeStringToSeconds(form.start),
          end: timeStringToSeconds(form.end),
          weekdays: weekdaysToBitmask(form.weekdays),
        },
      ],
    };

    try {
      if (isEditMode) {
        if (!selectedId) {
          setError("Invalid record selected for update.");
          return;
        }
        await updateWiegandGroup.mutateAsync({ id: selectedId, payload });
        setSuccess("Wiegand group updated successfully.");
      } else {
        await createWiegandGroup.mutateAsync(payload);
        setSuccess("Wiegand group created successfully.");
      }
      setOpen(false);
      setForm(initialForm);
      setSelectedId("");
      setIsEditMode(false);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (isEditMode ? "Failed to update wiegand group." : "Failed to create wiegand group.")
      );
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError("");
    setAssignSuccess("");

    if (!assignForm.sn || !assignForm.user_id || !assignForm.group_id || !assignForm.timestamp) {
      setAssignError("Please fill all fields.");
      return;
    }

    try {
      if (isAssignEditMode) {
        if (!selectedAssignId) {
          setAssignError("Invalid record selected for update.");
          return;
        }
        await updateUserWiegand.mutateAsync({
          id: selectedAssignId,
          payload: {
            sn: assignForm.sn,
            user_id: assignForm.user_id,
            group_id: assignForm.group_id,
            timestamp: Number(assignForm.timestamp),
          },
        });
        setAssignSuccess("Updated assignment successfully.");
      } else {
        await createUserWiegand.mutateAsync({
          sn: assignForm.sn,
          user_id: assignForm.user_id,
          group_id: assignForm.group_id,
          timestamp: Number(assignForm.timestamp),
          del_flag: assignForm.del_flag,
        });
        setAssignSuccess("Assigned wiegand group successfully.");
      }
      setAssignOpen(false);
      setAssignForm(initialAssignForm);
      setAssignSnSearchText("");
      setAssignSnSearchQuery("");
      setAssignUserSearchText("");
      setIsAssignEditMode(false);
      setSelectedAssignId("");
    } catch (err: any) {
      setAssignError(
        err?.response?.data?.message ||
          (isAssignEditMode ? "Failed to update assignment." : "Failed to assign wiegand group.")
      );
    }
  };

  return (
    <Box className="p-4">
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Remote/Time Group" className="text-primary! font-extrabold!" />
          <Tab label="Assign remote Group" className="text-primary! font-extrabold!" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <div className="mb-4 flex items-center justify-end">
          {/* <h1 className="text-primary text-4xl font-extrabold">Wiegand Group</h1> */}
          <Button
            variant="contained"
            className="!bg-primary"
              onClick={() => {
                setError("");
                setSuccess("");
                setIsEditMode(false);
                setSelectedId("");
                setSnSearchText("");
                setSnSearchQuery("");
                setForm({ ...initialForm, timestamp: String(Math.floor(Date.now() / 1000)) });
                setOpen(true);
              }}
            >
            Create remote/time group
          </Button>
        </div>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        {error && !open && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to fetch wiegand groups.
          </Alert>
        )}

        <Box sx={{ height: 560, width: "100%", mb: 2 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={isLoading || isFetching}
            pagination
            paginationMode="server"
            rowCount={groupsRowCount}
            pageSizeOptions={[5, 10, 20, 50]}
            paginationModel={groupsPaginationModel}
            onPaginationModelChange={setGroupsPaginationModel}
            disableRowSelectionOnClick
            disableColumnSelector
            sx={{
              "& .MuiDataGrid-cell:focus": { outline: "none" },
            }}
          />
        </Box>

        <Dialog
          open={open}
          onClose={() => !createWiegandGroup.isPending && !updateWiegandGroup.isPending && setOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle>{isEditMode ? "Edit wiegand group" : "Create wiegand group"}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}

                <TextField
                  label="Group ID"
                  value={form.group_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, group_id: e.target.value }))}
                  required
                  fullWidth
                />

                <Autocomplete<DeviceSnOption, false, false, true>
                  options={snOptions}
                  freeSolo
                  value={snOptions.find((option) => option.sn === form.sn) || (form.sn ? form.sn : null)}
                  inputValue={snSearchText}
                  onChange={(_, value) => {
                    const selectedSn = typeof value === "string" ? value : String(value?.sn || "");
                    const selectedLabel =
                      typeof value === "string" ? value : String(value?.label || selectedSn);
                    setForm((prev) => ({ ...prev, sn: selectedSn }));
                    setSnSearchText(selectedLabel);
                    setSnSearchQuery(selectedSn);
                  }}
                  onInputChange={(_, value, reason) => {
                    if (reason === "input" || reason === "clear") {
                      setSnSearchText(value || "");
                      setSnSearchQuery(value || "");
                      setForm((prev) => ({ ...prev, sn: value || "" }));
                    }
                  }}
                  getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
                  isOptionEqualToValue={(option, value) =>
                    typeof value === "string" ? option.sn === value : option.sn === value.sn
                  }
                  loading={isDevicesLoading}
                  fullWidth
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="SN"
                      required
                      fullWidth
                    />
                  )}
                />

                <TextField
                  label="Timestamp"
                  type="number"
                  value={form.timestamp}
                  onChange={(e) => setForm((prev) => ({ ...prev, timestamp: e.target.value }))}
                  required
                  disabled
                  fullWidth
                />

                <TextField
                  label="Start Time"
                  type="time"
                  value={form.start}
                  onChange={(e) => setForm((prev) => ({ ...prev, start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />

                <TextField
                  label="End Time"
                  type="time"
                  value={form.end}
                  onChange={(e) => setForm((prev) => ({ ...prev, end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Weekdays
                  </Typography>
                  <FormGroup row>
                    {weekdayOptions.map((day) => (
                      <FormControlLabel
                        key={day.value}
                        control={
                          <Checkbox
                            checked={form.weekdays.includes(day.value)}
                            onChange={() => handleToggleWeekday(day.value)}
                          />
                        }
                        label={day.label}
                      />
                    ))}
                  </FormGroup>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setOpen(false)}
                disabled={createWiegandGroup.isPending || updateWiegandGroup.isPending}
              >
                Cancel
              </Button>
              {!isEditMode ? (
                <Button type="submit" variant="contained" disabled={createWiegandGroup.isPending}>
                  {createWiegandGroup.isPending ? "Creating..." : "Create"}
                </Button>
              ) : (
                <Button type="submit" variant="contained" disabled={updateWiegandGroup.isPending}>
                  {updateWiegandGroup.isPending ? "Updating..." : "Update"}
                </Button>
              )}
            </DialogActions>
          </form>
        </Dialog>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <div className="mb-4 flex items-center justify-end">
          {/* <h1 className="text-primary text-4xl font-extrabold">Assign Wiegand Group</h1> */}
          <Button
            variant="contained"
            className="!bg-primary"
            onClick={() => {
              setAssignError("");
              setAssignSuccess("");
              setIsAssignEditMode(false);
              setSelectedAssignId("");
              setAssignForm({
                ...initialAssignForm,
                timestamp: String(Math.floor(Date.now() / 1000)),
                del_flag: false,
              });
              setAssignSnSearchText("");
              setAssignSnSearchQuery("");
              setAssignUserSearchText("");
              setAssignOpen(true);
            }}
          >
            Assign wiegand group
          </Button>
        </div>

        {assignSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {assignSuccess}
          </Alert>
        )}
        {assignError && !assignOpen && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {assignError}
          </Alert>
        )}
        {isUserWiegandsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to fetch assign wiegand groups.
          </Alert>
        )}

        <Box sx={{ height: 560, width: "100%", mb: 2 }}>
          <DataGrid
            rows={assignRows}
            columns={assignColumns}
            loading={isUserWiegandsLoading || isUserWiegandsFetching}
            pagination
            paginationMode="server"
            rowCount={assignRowCount}
            pageSizeOptions={[5, 10, 20, 50]}
            paginationModel={assignPaginationModel}
            onPaginationModelChange={setAssignPaginationModel}
            disableRowSelectionOnClick
            disableColumnSelector
            sx={{
              "& .MuiDataGrid-cell:focus": { outline: "none" },
            }}
          />
        </Box>

        <Dialog
          open={assignOpen}
          onClose={() => {
            if (createUserWiegand.isPending || updateUserWiegand.isPending) return;
            setAssignOpen(false);
            setIsAssignEditMode(false);
            setSelectedAssignId("");
          }}
          fullWidth
          maxWidth="sm"
        >
          <form onSubmit={handleAssignSubmit}>
            <DialogTitle>{isAssignEditMode ? "Edit assigned wiegand group" : "Assign wiegand group"}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {assignError && <Alert severity="error">{assignError}</Alert>}

                <Autocomplete<GroupIdOption, false, false, false>
                  options={groupOptions}
                  value={groupOptions.find((option) => option.group_id === assignForm.group_id) || null}
                  onChange={(_, value) => {
                    const selectedGroupId = value?.group_id || "";
                    const selectedSn = value?.sn || "";
                    setAssignForm((prev) => ({
                      ...prev,
                      group_id: selectedGroupId,
                      sn: selectedSn || prev.sn,
                    }));
                    if (selectedSn) {
                      setAssignSnSearchText(selectedSn);
                      setAssignSnSearchQuery(selectedSn);
                    }
                  }}
                  getOptionLabel={(option) => option.group_id || ""}
                  isOptionEqualToValue={(a, b) => a.group_id === b.group_id}
                  fullWidth
                  renderInput={(params) => <TextField {...params} label="Group ID" required fullWidth />}
                />

                <Autocomplete<DeviceSnOption, false, false, true>
                  options={assignSnOptions}
                  freeSolo
                  value={
                    assignSnOptions.find((option) => option.sn === assignForm.sn) || (assignForm.sn ? assignForm.sn : null)
                  }
                  inputValue={assignSnSearchText}
                  onChange={(_, value) => {
                    const selectedSn = typeof value === "string" ? value : String(value?.sn || "");
                    const selectedLabel =
                      typeof value === "string" ? value : String(value?.label || selectedSn);
                    setAssignForm((prev) => ({ ...prev, sn: selectedSn }));
                    setAssignSnSearchText(selectedLabel);
                    setAssignSnSearchQuery(selectedSn);
                  }}
                  onInputChange={(_, value, reason) => {
                    if (reason === "input" || reason === "clear") {
                      setAssignSnSearchText(value || "");
                      setAssignSnSearchQuery(value || "");
                      setAssignForm((prev) => ({ ...prev, sn: value || "" }));
                    }
                  }}
                  getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
                  isOptionEqualToValue={(option, value) =>
                    typeof value === "string" ? option.sn === value : option.sn === value.sn
                  }
                  loading={isAssignDevicesLoading}
                  fullWidth
                  renderInput={(params) => <TextField {...params} label="SN" required fullWidth />}
                />

                <Autocomplete
                  options={userIdOptions}
                  freeSolo
                  value={assignForm.user_id}
                  inputValue={assignUserSearchText}
                  onChange={(_, value) => {
                    const selectedUserId = String(value || "");
                    setAssignForm((prev) => ({ ...prev, user_id: selectedUserId }));
                    setAssignUserSearchText(selectedUserId);
                  }}
                  onInputChange={(_, value) => {
                    setAssignUserSearchText(value || "");
                    setAssignForm((prev) => ({ ...prev, user_id: value || "" }));
                  }}
                  loading={isUsersLoading}
                  fullWidth
                  renderInput={(params) => <TextField {...params} label="User ID" required fullWidth />}
                />

                <TextField
                  label="Timestamp"
                  type="number"
                  value={assignForm.timestamp}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, timestamp: e.target.value }))}
                  disabled
                  required
                  fullWidth
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={assignForm.del_flag}
                      onChange={(e) =>
                        setAssignForm((prev) => ({ ...prev, del_flag: e.target.checked }))
                      }
                    />
                  }
                  label="Del Flag (set true if needed)"
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setAssignOpen(false);
                  setIsAssignEditMode(false);
                  setSelectedAssignId("");
                }}
                disabled={createUserWiegand.isPending || updateUserWiegand.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createUserWiegand.isPending || updateUserWiegand.isPending}
              >
                {createUserWiegand.isPending || updateUserWiegand.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </TabPanel>
    </Box>
  );
};

export default WiegandGroup;
