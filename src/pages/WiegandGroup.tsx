import { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { Edit, Trash } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import { useDevices } from "../service/useDevice";
import { useUsers } from "../service/useUsers";
import {
  useCreateTimeGroup,
  useTimeGroups,
  useUpdateTimeGroup,
} from "../service/useTimeGroup";
import {
  useCreateWiegandGroup,
  useCreateUserWiegand,
  useDeleteUserWiegand,
  useUpdateUserWiegand,
  useUserWiegands,
  useUpdateWiegandGroup,
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

const normalizeUnixMillis = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return String(numeric >= 1_000_000_000_000 ? Math.floor(numeric) : Math.floor(numeric * 1000));
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
  remote_group_ids: [] as string[],
  time_group_id: "",
};

type UserOption = {
  id: string;
  label: string;
};

type DeviceSnOption = {
  sn: string;
  label: string;
};

type GroupIdOption = {
  group_id: string;
  sn: string;
};

type TimeGroupOption = {
  time_group_id: string;
  label: string;
  time_configs: any[];
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
  const [timeOpen, setTimeOpen] = useState(false);
  const [groupsPaginationModel, setGroupsPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [timePaginationModel, setTimePaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [assignPaginationModel, setAssignPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [isTimeEditMode, setIsTimeEditMode] = useState(false);
  const [selectedTimeId, setSelectedTimeId] = useState("");
  const [snSearchText, setSnSearchText] = useState("");
  const [snSearchQuery, setSnSearchQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [isAssignEditMode, setIsAssignEditMode] = useState(false);
  const [assignSnSearchText, setAssignSnSearchText] = useState("");
  const [assignSnSearchQuery, setAssignSnSearchQuery] = useState("");
  const [assignForm, setAssignForm] = useState(initialAssignForm);
  const [assignUserSearchText, setAssignUserSearchText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(initialForm);
  const [timeForm, setTimeForm] = useState({
    time_group_id: "",
    timestamp: "",
    del_flag: "0",
    start: "",
    end: "",
    weekdays: [] as Weekday[],
  });
  const debouncedSnSearchQuery = useDebounce(snSearchQuery, 400);
  const debouncedAssignSnSearchQuery = useDebounce(assignSnSearchQuery, 400);
  const debouncedAssignUserSearchText = useDebounce(assignUserSearchText, 400);
  const createWiegandGroup = useCreateWiegandGroup();
  const updateWiegandGroup = useUpdateWiegandGroup();
  const createTimeGroup = useCreateTimeGroup();
  const updateTimeGroup = useUpdateTimeGroup();
  const createUserWiegand = useCreateUserWiegand();
  const updateUserWiegand = useUpdateUserWiegand();
  const deleteUserWiegand = useDeleteUserWiegand();
  const { data, isLoading, isFetching } = useWiegandGroups(
    0,
    true,
    groupsPaginationModel.page + 1,
    groupsPaginationModel.pageSize
  );

  const {
    data: timeGroupsData,
    isLoading: isTimeGroupsLoading,
    isFetching: isTimeGroupsFetching,
    isError: isTimeGroupsError,
  } = useTimeGroups(0, true, timePaginationModel.page + 1, timePaginationModel.pageSize);

  const {
    data: assignmentsData,
    isLoading: isAssignmentsLoading,
    isFetching: isAssignmentsFetching,
    isError: isAssignmentsError,
  } = useUserWiegands(true, assignPaginationModel.page + 1, assignPaginationModel.pageSize);
  const { data: devicesData, isLoading: isDevicesLoading } = useDevices(1, debouncedSnSearchQuery);
  const { data: assignDevicesData, isLoading: isAssignDevicesLoading } = useDevices(1, debouncedAssignSnSearchQuery);
  const { data: usersData, isLoading: isUsersLoading } = useUsers(1, 10, debouncedAssignUserSearchText);

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

  const timeList = Array.isArray(timeGroupsData)
    ? timeGroupsData
    : Array.isArray(timeGroupsData?.data)
      ? timeGroupsData.data
      : Array.isArray(timeGroupsData?.items)
        ? timeGroupsData.items
        : [];

  const assignmentsList = Array.isArray(assignmentsData)
    ? assignmentsData
    : Array.isArray(assignmentsData?.data)
      ? assignmentsData.data
      : Array.isArray(assignmentsData?.items)
        ? assignmentsData.items
        : [];

  const groupsRowCount =
    Number((data as any)?.pagination?.total ?? (data as any)?.totalCount ?? (data as any)?.total ?? list.length) || 0;

  const timeGroupsRowCount =
    Number(
      (timeGroupsData as any)?.pagination?.total ??
        (timeGroupsData as any)?.totalCount ??
        (timeGroupsData as any)?.total ??
        timeList.length
    ) || 0;

  const assignmentsRowCount =
    Number(
      (assignmentsData as any)?.pagination?.total ??
        (assignmentsData as any)?.total_records ??
        (assignmentsData as any)?.totalCount ??
        (assignmentsData as any)?.total ??
        assignmentsList.length
    ) || 0;

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

  const remoteGroupColumns: GridColDef[] = [
    { field: "group_id", headerName: "RemoteGroupID", flex: 0.9 },
    { field: "sn", headerName: "Serial Number", flex: 1.6 },
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
        <IconButton size="small" onClick={() => handleEditTimeRow(params.row)}>
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

  const timeRows = timeList.map((item: any, index: number) => {
    const firstConfig = item?.time_configs?.[0];
    const rawWeekdays = firstConfig?.weekdays;
    const weekdaysArray: Weekday[] = Array.isArray(rawWeekdays)
      ? rawWeekdays
          .map((day: number) => Number(day))
          .filter((day: number) => day >= 1 && day <= 7) as Weekday[]
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

  function handleEditAssignRow(row: any) {
    setAssignError("");
    setAssignSuccess("");
    // Aggregated row: treat Edit as "add more assignments" for this user.
    setIsAssignEditMode(false);

    setAssignForm((prev) => ({
      ...prev,
      sn: "",
      user_id: String(row.user_id ?? ""),
      remote_group_ids: [],
      time_group_id: "",
    }));

    setAssignSnSearchText("");
    setAssignSnSearchQuery("");
    setAssignOpen(true);
  }

  async function handleDeleteAssignRow(row: any) {
    const user_id = String(row?.user_id ?? "");
    const ids: string[] = Array.isArray(row?.assignment_ids) ? row.assignment_ids : [];
    if (!user_id || ids.length === 0) {
      setAssignError("Invalid record selected for delete.");
      return;
    }
    const ok = window.confirm(
      `Delete ALL assignments for User ${user_id}? (${ids.length} records)`
    );
    if (!ok) return;

    setAssignError("");
    setAssignSuccess("");
    try {
      await Promise.all(ids.map((id) => deleteUserWiegand.mutateAsync(String(id))));
      setAssignSuccess("Deleted user assignments successfully.");
    } catch (err: any) {
      setAssignError(err?.response?.data?.msg || err?.response?.data?.message || "Failed to delete assignment.");
    }
  }

  const assignColumns: GridColDef[] = [
    { field: "user_id", headerName: "UserID", flex: 0.8 },
    { field: "remote_group_ids", headerName: "RemoteGroupID(s)", flex: 1.2 },
    { field: "time_group_ids", headerName: "TimeGroupID(s)", flex: 1.0 },
    { field: "sns", headerName: "Access to Device(s)", flex: 1.8 },
    { field: "timestamp", headerName: "Timestamp", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.9,
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

  const assignRows = useMemo(() => {
    const byUser = new Map<
      string,
      {
        user_id: string;
        assignment_ids: string[];
        remote_group_ids: Set<string>;
        time_group_ids: Set<string>;
        sns: Set<string>;
        latest_timestamp: number;
      }
    >();

    for (const item of assignmentsList) {
      const user_id = String(item?.user_id ?? "").trim();
      if (!user_id) continue;

      const id = String(item?.id ?? "").trim();
      const groupId = String(item?.group_id ?? item?.remote_group_id ?? "").trim();
      const timeGroupId = String(item?.time_group_id ?? "").trim();
      const sn = String(item?.sn ?? "").trim();
      const ts = Number(item?.timestamp ?? 0) || 0;

      if (!byUser.has(user_id)) {
        byUser.set(user_id, {
          user_id,
          assignment_ids: [],
          remote_group_ids: new Set<string>(),
          time_group_ids: new Set<string>(),
          sns: new Set<string>(),
          latest_timestamp: ts,
        });
      }

      const agg = byUser.get(user_id)!;
      if (id) agg.assignment_ids.push(id);
      if (groupId) agg.remote_group_ids.add(groupId);
      if (timeGroupId) agg.time_group_ids.add(timeGroupId);
      if (sn) agg.sns.add(sn);
      if (ts > agg.latest_timestamp) agg.latest_timestamp = ts;
    }

    return Array.from(byUser.values()).map((agg) => {
      const remoteGroupText = Array.from(agg.remote_group_ids).sort().join(", ") || "-";
      const timeGroupText = Array.from(agg.time_group_ids).sort().join(", ") || "-";
      const snsText = Array.from(agg.sns).sort().join(", ") || "-";
      return {
        id: agg.user_id,
        user_id: agg.user_id,
        assignment_ids: agg.assignment_ids,
        remote_group_ids: remoteGroupText,
        time_group_ids: timeGroupText,
        sns: snsText,
        timestamp: agg.latest_timestamp || "-",
      };
    });
  }, [assignmentsList]);

  const userOptions: UserOption[] = useMemo(() => {
    const raw = (usersData as any)?.data ?? [];
    return (raw || [])
      .filter((u: any) => u?.user_id)
      .map((u: any) => {
        const uid = String(u.user_id);
        const name = String(u?.name || u?.user_name || "").trim();
        const label = name ? `${name} (${uid})` : uid;
        return { id: uid, label };
      });
  }, [usersData]);

  const groupOptions = Array.from(
    new Map(
      list
        .filter((item: any) => item?.group_id)
        .map((item: any) => [item.group_id, { group_id: String(item.group_id), sn: String(item.sn || "") } satisfies GroupIdOption])
    ).values()
  ) as GroupIdOption[];

  const timeGroupOptions: TimeGroupOption[] = useMemo(() => {
    return timeList
      .map((item: any) => {
        const timeGroupId = String(item?.time_group_id ?? "");
        if (!timeGroupId) return null;
        const firstConfig = item?.time_configs?.[0];
        const start = formatTimeForDisplay(firstConfig?.start);
        const end = formatTimeForDisplay(firstConfig?.end);
        const rawWeekdays = firstConfig?.weekdays;
        const weekdaysArray: Weekday[] = Array.isArray(rawWeekdays)
          ? rawWeekdays
              .map((day: number) => Number(day))
              .filter((day: number) => day >= 1 && day <= 7) as Weekday[]
          : typeof rawWeekdays === "number"
            ? bitmaskToWeekdays(rawWeekdays)
            : [];
        const weekdays =
          weekdaysArray.length > 0
            ? weekdaysArray.map((day: number) => weekdayLabelMap[day] || String(day)).join(", ")
            : "-";
        const ts = String(item?.timestamp ?? "-");
        return {
          time_group_id: timeGroupId,
          label: `${timeGroupId} | ${start}-${end} | ${weekdays} | ${ts}`,
          time_configs: Array.isArray(item?.time_configs) ? item.time_configs : [],
        };
      })
      .filter(Boolean) as TimeGroupOption[];
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
        ? row.weekdaysRaw
            .map((day: number) => Number(day))
            .filter((day: number) => day >= 1 && day <= 7) as Weekday[]
        : typeof row.weekdaysRaw === "number"
          ? bitmaskToWeekdays(row.weekdaysRaw)
          : [],
    });
    setTimeOpen(true);
  };

  const handleToggleTimeWeekday = (day: Weekday) => {
    setTimeForm((prev) => {
      const exists = prev.weekdays.includes(day);
      return {
        ...prev,
        weekdays: exists
          ? prev.weekdays.filter((d) => d !== day)
          : [...prev.weekdays, day].sort((a, b) => a - b),
      };
    });
  };

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
        await updateTimeGroup.mutateAsync({ id: selectedTimeId, payload });
        setSuccess("Time group updated successfully.");
      } else {
        await createTimeGroup.mutateAsync(payload);
        setSuccess("Time group created successfully.");
      }

      setTimeOpen(false);
      setTimeForm({
        time_group_id: "",
        timestamp: "",
        del_flag: "0",
        start: "",
        end: "",
        weekdays: [],
      });
      setSelectedTimeId("");
      setIsTimeEditMode(false);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (isTimeEditMode ? "Failed to update time group." : "Failed to create time group.")
      );
    }
  };

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

    if (!assignForm.sn || !assignForm.user_id || assignForm.remote_group_ids.length === 0 || !assignForm.time_group_id) {
      setAssignError("Please fill all fields.");
      return;
    }

    const now = Date.now();
    const payloads = assignForm.remote_group_ids.map((gid) => ({
      sn: assignForm.sn,
      user_id: assignForm.user_id,
      group_id: gid,
      time_group_id: assignForm.time_group_id,
      timestamp: now,
      del_flag: false,
    }));

    try {
      // Bulk create (multi remote group IDs) in one action
      await Promise.all(payloads.map((p) => createUserWiegand.mutateAsync(p as any)));
      setAssignSuccess("Assigned remote/time group(s) successfully.");
      setAssignOpen(false);
      setAssignForm(initialAssignForm);
      setAssignSnSearchText("");
      setAssignSnSearchQuery("");
      setAssignUserSearchText("");
      setIsAssignEditMode(false);
    } catch (err: any) {
      setAssignError(
        err?.response?.data?.message ||
          "Failed to assign wiegand group."
      );
    }
  };

  return (
    <Box className="p-4">
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Remote Group" className="text-primary! font-extrabold!" />
          <Tab label="Time Group" className="text-primary! font-extrabold!" />
          <Tab label="Assign Remote/Time Group" className="text-primary! font-extrabold!" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <div className="mb-4 flex items-center justify-end">
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
            Create remote group
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
        {isTimeGroupsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to fetch time groups.
          </Alert>
        )}

        <Box sx={{ height: 560, width: "100%", mb: 2 }}>
          <DataGrid
            rows={rows}
            columns={remoteGroupColumns}
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
          onClose={() => {
            if (createWiegandGroup.isPending || updateWiegandGroup.isPending) return;
            setOpen(false);
            setIsEditMode(false);
            setSelectedId("");
          }}
          fullWidth
          maxWidth="sm"
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle>{isEditMode ? "Edit remote/time group" : "Create remote/time group"}</DialogTitle>
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
                  value={snOptions.find((o) => o.sn === form.sn) || (form.sn ? form.sn : null)}
                  inputValue={snSearchText}
                  onChange={(_, value) => {
                    const selectedSn = typeof value === "string" ? value : String(value?.sn || "");
                    const selectedLabel = typeof value === "string" ? value : String(value?.label || selectedSn);
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
                  renderInput={(params) => <TextField {...params} label="Serial Number" required fullWidth />}
                />

                <TextField
                  label="Timestamp"
                  type="number"
                  value={form.timestamp}
                  onChange={(e) => setForm((prev) => ({ ...prev, timestamp: e.target.value }))}
                  required
                  fullWidth
                />

                <TextField
                  label="Start"
                  type="time"
                  value={form.start}
                  onChange={(e) => setForm((prev) => ({ ...prev, start: e.target.value }))}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="End"
                  type="time"
                  value={form.end}
                  onChange={(e) => setForm((prev) => ({ ...prev, end: e.target.value }))}
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
                        variant={form.weekdays.includes(d.value) ? "contained" : "outlined"}
                        size="small"
                        onClick={() => handleToggleWeekday(d.value)}
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
                  setOpen(false);
                  setIsEditMode(false);
                  setSelectedId("");
                }}
                disabled={createWiegandGroup.isPending || updateWiegandGroup.isPending}
              >
                Cancel
              </Button>
              {!isEditMode ? (
                <Button type="submit" variant="contained" disabled={createWiegandGroup.isPending}>
                  {createWiegandGroup.isPending ? "Saving..." : "Save"}
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
                  value={normalizeUnixSeconds(timeForm.timestamp) ? normalizeUnixMillis(timeForm.timestamp) : timeForm.timestamp}
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
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <div className="mb-4 flex items-center justify-end">
          {/* <h1 className="text-primary text-4xl font-extrabold">Assign Wiegand Group</h1> */}
          <Button
            variant="contained"
            className="!bg-primary"
            onClick={() => {
              setAssignError("");
              setAssignSuccess("");
              setIsAssignEditMode(false);
              setAssignForm({
                ...initialAssignForm,
              });
              setAssignSnSearchText("");
              setAssignSnSearchQuery("");
              setAssignOpen(true);
            }}
          >
            Assign remote/time group
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
        {isAssignmentsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to fetch assignments.
          </Alert>
        )}

        <Box sx={{ height: 560, width: "100%", mb: 2 }}>
          <DataGrid
            rows={assignRows}
            columns={assignColumns}
            loading={isAssignmentsLoading || isAssignmentsFetching}
            pagination
            paginationMode="server"
            rowCount={assignmentsRowCount}
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
          }}
          fullWidth
          maxWidth="sm"
        >
          <form onSubmit={handleAssignSubmit}>
            <DialogTitle>
              {isAssignEditMode ? "Edit assigned remote/time group" : "Assign remote/time group"}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {assignError && <Alert severity="error">{assignError}</Alert>}

                <Autocomplete<UserOption, false, false, false>
                  options={userOptions}
                  value={userOptions.find((u) => u.id === assignForm.user_id) || null}
                  inputValue={assignUserSearchText}
                  onInputChange={(_, value) => setAssignUserSearchText(value || "")}
                  onChange={(_, value) => {
                    setAssignForm((prev) => ({ ...prev, user_id: String(value?.id || "") }));
                  }}
                  getOptionLabel={(option) => option.label || option.id}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  loading={isUsersLoading}
                  fullWidth
                  renderInput={(params) => <TextField {...params} label="User" required fullWidth />}
                />

                <Autocomplete<GroupIdOption, true, false, false>
                  options={groupOptions}
                  value={groupOptions.filter((option) => assignForm.remote_group_ids.includes(option.group_id))}
                  onChange={(_, values) => {
                    const selectedGroupIds = (values || []).map((v) => String(v.group_id));
                    // Keep current SN behavior: if user picks groups tied to a device, prefill SN from first selected.
                    const firstSn = String(values?.[0]?.sn || "");
                    setAssignForm((prev) => ({
                      ...prev,
                      remote_group_ids: selectedGroupIds,
                      sn: firstSn || prev.sn,
                    }));
                    if (firstSn) {
                      setAssignSnSearchText(firstSn);
                      setAssignSnSearchQuery(firstSn);
                    }
                  }}
                  getOptionLabel={(option) => option.group_id || ""}
                  isOptionEqualToValue={(a, b) => a.group_id === b.group_id}
                  fullWidth
                  renderInput={(params) => (
                    <TextField {...params} label="Remote Group" required fullWidth />
                  )}
                />

                <Autocomplete<TimeGroupOption, false, false, false>
                  options={timeGroupOptions}
                  value={timeGroupOptions.find((option) => option.time_group_id === assignForm.time_group_id) || null}
                  onChange={(_, value) => {
                    setAssignForm((prev) => ({
                      ...prev,
                      time_group_id: String(value?.time_group_id || ""),
                    }));
                  }}
                  getOptionLabel={(option) => option.label || option.time_group_id}
                  isOptionEqualToValue={(a, b) => a.time_group_id === b.time_group_id}
                  fullWidth
                  renderInput={(params) => (
                    <TextField {...params} label="Time Group" required fullWidth />
                  )}
                />

                <Autocomplete<DeviceSnOption, false, false, true>
                  options={assignSnOptions}
                  freeSolo
                  value={assignSnOptions.find((option) => option.sn === assignForm.sn) || (assignForm.sn ? assignForm.sn : null)}
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
                  renderInput={(params) => (
                    <TextField {...params} label="Access to Device" required fullWidth />
                  )}
                />

              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setAssignOpen(false);
                  setIsAssignEditMode(false);
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
