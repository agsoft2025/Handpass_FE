import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { Edit, Trash } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { useUsers } from "../../service/useUsers";
import {
  useCreateUserWiegand,
  useDeleteAllUserWiegands,
  useUserWiegands,
  useWiegandGroups,
} from "../../service/useWiegandGroup";
import { useTimeGroups } from "../../service/useTimeGroup";
import { DeleteConfirmDialog } from "../common/DeleteConfirmDialog";
import type { GroupIdOption, TimeGroupOption } from "./types";
import {
  bitmaskToWeekdays,
  formatTimeForDisplay,
  type Weekday,
  weekdayLabelMap,
} from "./utils";
import { useAuth } from "../../auth/AuthProvider";

const initialAssignForm = {
  sn: "",
  user_id: "",
  remote_group_id: "",
  time_group_id: "",
};

type DraftAssignment = { group_id: string; time_group_id: string };

type UserSearchResult = {
  user_id: string;
  label: string;
};

const AssignRemoteTimeGroupTab = () => {
  const { user } = useAuth();
  const role = String((user as any)?.role ?? "").toLowerCase();
  const isOperator = role === "operator";
  const [assignPaginationModel, setAssignPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [isAssignEditMode, setIsAssignEditMode] = useState(false);
  const [assignForm, setAssignForm] = useState(initialAssignForm);
  const [userSearchText, setUserSearchText] = useState("");
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [remoteGroupSearchText, setRemoteGroupSearchText] = useState("");
  const [showRemoteGroupSuggestions, setShowRemoteGroupSuggestions] = useState(false);
  const [timeGroupSearchText, setTimeGroupSearchText] = useState("");
  const [showTimeGroupSuggestions, setShowTimeGroupSuggestions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<null | { user_id: string; ids: string[] }>(null);
  const [draftAssignments, setDraftAssignments] = useState<DraftAssignment[]>([]);
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);

  const debouncedUserSearchText = useDebounce(userSearchText, 400);

  const {
    data: assignmentsData,
    isLoading: isAssignmentsLoading,
    isFetching: isAssignmentsFetching,
  } = useUserWiegands(true, assignPaginationModel.page + 1, assignPaginationModel.pageSize);

  const { data: usersData, isLoading: isUsersLoading } = useUsers(
    1,
    10,
    debouncedUserSearchText,
    assignOpen && debouncedUserSearchText.trim().length > 0
  );

  const { data: remoteGroupsData, isLoading: isRemoteGroupsLoading } = useWiegandGroups(0, true);
  const { data: timeGroupsData, isLoading: isTimeGroupsLoading } = useTimeGroups(0, true);

  const createUserWiegand = useCreateUserWiegand();
  const deleteAllUserWiegands = useDeleteAllUserWiegands();

  const assignmentsList = Array.isArray(assignmentsData)
    ? assignmentsData
    : Array.isArray(assignmentsData?.data)
      ? assignmentsData.data
      : Array.isArray(assignmentsData?.items)
        ? assignmentsData.items
        : [];

  const assignmentsRowCount =
    Number(
      (assignmentsData as any)?.pagination?.total ??
        (assignmentsData as any)?.total_records ??
        (assignmentsData as any)?.totalCount ??
        (assignmentsData as any)?.total ??
        assignmentsList.length
    ) || 0;

  const groupOptions: GroupIdOption[] = useMemo(() => {
    const list = Array.isArray(remoteGroupsData)
      ? remoteGroupsData
      : Array.isArray((remoteGroupsData as any)?.data)
        ? (remoteGroupsData as any).data
        : Array.isArray((remoteGroupsData as any)?.items)
          ? (remoteGroupsData as any).items
          : [];
    return Array.from(
      new Map(
        list
          .filter((item: any) => item?.group_id)
          .map((item: any) => [
            item.group_id,
            {
              group_id: String(item.group_id),
              sn: String(item.sn || ""),
              device_name: String(item.device_name || item.deviceName || ""),
            } satisfies GroupIdOption,
          ])
      ).values()
    ) as GroupIdOption[];
  }, [remoteGroupsData]);

  const groupIdToSn = useMemo(() => {
    return new Map(groupOptions.map((o) => [String(o.group_id), String(o.sn || "")]));
  }, [groupOptions]);

  const groupIdToDeviceName = useMemo(() => {
    return new Map(groupOptions.map((o) => [String(o.group_id), String(o.device_name || "")]));
  }, [groupOptions]);

  const timeGroupOptions: TimeGroupOption[] = useMemo(() => {
    const timeList = Array.isArray(timeGroupsData)
      ? timeGroupsData
      : Array.isArray((timeGroupsData as any)?.data)
        ? (timeGroupsData as any).data
        : Array.isArray((timeGroupsData as any)?.items)
          ? (timeGroupsData as any).items
          : [];

    return timeList
      .map((item: any) => {
        const timeGroupId = String(item?.time_group_id ?? "");
        if (!timeGroupId) return null;
        const firstConfig = item?.time_configs?.[0];
        const start = formatTimeForDisplay(firstConfig?.start);
        const end = formatTimeForDisplay(firstConfig?.end);
        const rawWeekdays = firstConfig?.weekdays;
        const weekdaysArray: Weekday[] = Array.isArray(rawWeekdays)
          ? (rawWeekdays
              .map((day: number) => Number(day))
              .filter((day: number) => day >= 1 && day <= 7) as Weekday[])
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
  }, [timeGroupsData]);

  const timeGroupIdToLabel = useMemo(() => {
    return new Map(timeGroupOptions.map((o) => [String(o.time_group_id), String(o.label || o.time_group_id)]));
  }, [timeGroupOptions]);

  const remoteGroupHelperText = useMemo(() => {
    const groupId = String(assignForm.remote_group_id || "").trim();
    if (!groupId) return "Type group id or device name to search, then pick from results.";
    const deviceName = String(groupIdToDeviceName.get(groupId) || "").trim();
    const sn = String(groupIdToSn.get(groupId) || "").trim();
    if (deviceName && sn) return `Device: ${deviceName} (${sn})`;
    if (deviceName) return `Device: ${deviceName}`;
    if (sn) return `Device SN: ${sn}`;
    return "Device not found for this group.";
  }, [assignForm.remote_group_id, groupIdToDeviceName, groupIdToSn]);

  const timeGroupHelperText = useMemo(() => {
    const id = String(assignForm.time_group_id || "").trim();
    if (!id) return "Enter a time group ID.";
    return timeGroupIdToLabel.get(id) || "Time group not found.";
  }, [assignForm.time_group_id, timeGroupIdToLabel]);

  const remoteGroupSearchResults: GroupIdOption[] = useMemo(() => {
    const q = remoteGroupSearchText.trim().toLowerCase();
    if (!q) return groupOptions.slice(0, 8);
    return groupOptions
      .filter(
        (o) =>
          String(o.group_id).toLowerCase().includes(q) ||
          String(o.device_name || "").toLowerCase().includes(q) ||
          String(o.sn || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [remoteGroupSearchText, groupOptions]);

  const timeGroupSearchResults: TimeGroupOption[] = useMemo(() => {
    const q = timeGroupSearchText.trim().toLowerCase();
    if (!q) return timeGroupOptions.slice(0, 8);
    return timeGroupOptions
      .filter(
        (o) =>
          String(o.time_group_id).toLowerCase().includes(q) || String(o.label || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [timeGroupSearchText, timeGroupOptions]);

  const assignColumns: GridColDef[] = [
    { field: "user_id", headerName: "UserID", flex: 0.8 },
    { field: "remote_group_ids", headerName: "RemoteGroupID(s)", flex: 1.2 },
    { field: "time_group_ids", headerName: "TimeGroupID(s)", flex: 1.0 },
    { field: "device_names", headerName: "Access to Device(s)", flex: 1.8 },
    { field: "timestamp", headerName: "Timestamp", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.9,
      sortable: false,
      renderCell: (params) => (
        <div>
          {!isOperator && (
            <>
              <Button variant="text" size="small" onClick={() => handleEditAssignRow(params.row)}>
                <Edit />
              </Button>
              <Button
                variant="text"
                color="error"
                size="small"
                onClick={() => handleDeleteAssignRow(params.row)}
                disabled={deleteAllUserWiegands.isPending}
              >
                <Trash />
              </Button>
            </>
          )}
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
        device_names: Set<string>;
        assignment_pairs: Map<string, DraftAssignment>;
        latest_timestamp: number;
      }
    >();

    const expanded: any[] = [];
    for (const item of assignmentsList) {
      if (item && typeof item === "object" && Array.isArray((item as any).assignments)) {
        const baseUserId = String((item as any)?.user_id ?? "").trim();
        const baseSn = String((item as any)?.sn ?? "").trim();
        const baseDeviceName = String((item as any)?.device_name ?? (item as any)?.deviceName ?? "").trim();
        for (const a of (item as any).assignments) {
          expanded.push({
            ...(a ?? {}),
            user_id: baseUserId,
            sn: baseSn,
            device_name: baseDeviceName || (a as any)?.device_name || (a as any)?.deviceName || "",
          });
        }
      } else {
        expanded.push(item);
      }
    }

    for (const item of expanded) {
      const user_id = String(item?.user_id ?? "").trim();
      if (!user_id) continue;

      const id = String(item?.id ?? item?.assignment_id ?? "").trim();
      const groupId = String(item?.group_id ?? item?.remote_group_id ?? "").trim();
      const timeGroupId = String(item?.time_group_id ?? "").trim();
      const sn = String(item?.sn ?? "").trim();
      const deviceName = String(item?.device_name ?? item?.deviceName ?? "").trim();
      const ts = Number(item?.timestamp ?? 0) || 0;

      if (!byUser.has(user_id)) {
        byUser.set(user_id, {
          user_id,
          assignment_ids: [],
          remote_group_ids: new Set<string>(),
          time_group_ids: new Set<string>(),
          sns: new Set<string>(),
          device_names: new Set<string>(),
          assignment_pairs: new Map<string, DraftAssignment>(),
          latest_timestamp: ts,
        });
      }

      const agg = byUser.get(user_id)!;
      if (id) agg.assignment_ids.push(id);
      if (groupId) agg.remote_group_ids.add(groupId);
      if (timeGroupId) agg.time_group_ids.add(timeGroupId);
      if (sn) agg.sns.add(sn);
      if (deviceName && sn) agg.device_names.add(`${deviceName} (${sn})`);
      else if (deviceName) agg.device_names.add(deviceName);
      else if (sn) agg.device_names.add(sn);
      if (groupId && timeGroupId) {
        const key = `${groupId}`.toLowerCase() + "::" + `${timeGroupId}`.toLowerCase();
        if (!agg.assignment_pairs.has(key)) agg.assignment_pairs.set(key, { group_id: groupId, time_group_id: timeGroupId });
      }
      if (ts > agg.latest_timestamp) agg.latest_timestamp = ts;
    }

    return Array.from(byUser.values()).map((agg) => {
      const remoteGroupText = Array.from(agg.remote_group_ids).sort().join(", ") || "-";
      const timeGroupText = Array.from(agg.time_group_ids).sort().join(", ") || "-";
      const snsText = Array.from(agg.sns).sort().join(", ") || "-";
      const deviceNamesText =
        Array.from(agg.device_names).sort().join(", ") || (snsText !== "-" ? snsText : "-");
      return {
        id: agg.user_id,
        user_id: agg.user_id,
        assignment_ids: agg.assignment_ids,
        assignment_pairs: Array.from(agg.assignment_pairs.values()),
        remote_group_ids: remoteGroupText,
        time_group_ids: timeGroupText,
        sns: snsText,
        device_names: deviceNamesText,
        timestamp: agg.latest_timestamp || "-",
      };
    });
  }, [assignmentsList]);

  const userSearchResults: UserSearchResult[] = useMemo(() => {
    const raw = (usersData as any)?.data ?? [];
    return (raw || [])
      .filter((u: any) => u?.user_id)
      .slice(0, 8)
      .map((u: any) => {
        const uid = String(u.user_id);
        const name = String(u?.name || u?.user_name || "").trim();
        const label = name ? `${name} (${uid})` : uid;
        return { user_id: uid, label } satisfies UserSearchResult;
      });
  }, [usersData]);

  const addOrUpdateDraftAssignment = () => {
    const group_id = String(assignForm.remote_group_id || "").trim();
    const time_group_id = String(assignForm.time_group_id || "").trim();

    if (!group_id) return setAssignError("Please select Remote Group ID.");
    if (!time_group_id) return setAssignError("Please enter Time Group ID.");

    setDraftAssignments((prev) => {
      const nextKey = `${group_id}`.toLowerCase() + "::" + `${time_group_id}`.toLowerCase();
      const existsAtOtherIndex = prev.some((a, idx) => {
        if (editingDraftIndex != null && idx === editingDraftIndex) return false;
        const k = `${a.group_id}`.toLowerCase() + "::" + `${a.time_group_id}`.toLowerCase();
        return k === nextKey;
      });

      if (existsAtOtherIndex) {
        setAssignError("This Group ID and Time Group ID combination is already added.");
        return prev;
      }

      if (editingDraftIndex != null) {
        const copy = [...prev];
        copy[editingDraftIndex] = { group_id, time_group_id };
        return copy;
      }

      return [...prev, { group_id, time_group_id }];
    });

    setRemoteGroupSearchText("");
    setShowRemoteGroupSuggestions(false);
    setTimeGroupSearchText("");
    setShowTimeGroupSuggestions(false);
    setAssignForm((prev) => ({ ...prev, remote_group_id: "", time_group_id: "" }));
    setEditingDraftIndex(null);
  };

  function handleEditAssignRow(row: any) {
    setAssignError("");
    setAssignSuccess("");
    setIsAssignEditMode(true);
    setDraftAssignments([]);

    const pairs: DraftAssignment[] = Array.isArray(row?.assignment_pairs) ? row.assignment_pairs : [];
    setDraftAssignments(
      pairs
        .map((p: any) => ({ group_id: String(p?.group_id ?? "").trim(), time_group_id: String(p?.time_group_id ?? "").trim() }))
        .filter((p: DraftAssignment) => p.group_id && p.time_group_id)
    );
    setEditingDraftIndex(null);

    setAssignForm((prev) => ({
      ...prev,
      user_id: String(row.user_id ?? ""),
      remote_group_id: "",
      time_group_id: "",
      sn: "",
    }));
    setUserSearchText(String(row.user_id ?? ""));
    setShowUserSuggestions(false);
    setRemoteGroupSearchText("");
    setShowRemoteGroupSuggestions(false);
    setTimeGroupSearchText("");
    setShowTimeGroupSuggestions(false);

    setAssignOpen(true);
  }

  async function handleDeleteAssignRow(row: any) {
    if (isOperator) return;
    const user_id = String(row?.user_id ?? "");
    const ids: string[] = Array.isArray(row?.assignment_ids) ? row.assignment_ids : [];
    if (!user_id || ids.length === 0) {
      setAssignError("Invalid record selected for delete.");
      return;
    }
    setDeleteTarget({ user_id, ids: ids.map((id) => String(id)) });
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (isOperator) return;
    setAssignError("");
    setAssignSuccess("");
    try {
      await deleteAllUserWiegands.mutateAsync({ user_id: deleteTarget.user_id });
      setAssignSuccess("Deleted user assignments successfully.");
      setDeleteTarget(null);
    } catch (err: any) {
      setAssignError(err?.response?.data?.msg || err?.response?.data?.message || "Failed to delete assignment.");
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperator) return;
    setAssignError("");
    setAssignSuccess("");

    if (!assignForm.user_id) return setAssignError("Please enter User ID.");

    const maybeGroup = String(assignForm.remote_group_id || "").trim();
    const maybeTime = String(assignForm.time_group_id || "").trim();

    const combined: DraftAssignment[] = [...draftAssignments];
    if (editingDraftIndex == null && maybeGroup && maybeTime) combined.push({ group_id: maybeGroup, time_group_id: maybeTime });

    const assignments = combined
      .map((a) => ({
        group_id: String(a.group_id || "").trim(),
        time_group_id: String(a.time_group_id || "").trim(),
      }))
      .filter((a) => a.group_id && a.time_group_id);

    if (assignments.length === 0) return setAssignError("Please add at least one assignment.");
    if (editingDraftIndex != null) return setAssignError("Finish editing the assignment (click Update assignment) before saving.");

    const seen = new Set<string>();
    for (const a of assignments) {
      const key = `${a.group_id}`.toLowerCase() + "::" + `${a.time_group_id}`.toLowerCase();
      if (seen.has(key)) {
        setAssignError("Duplicate assignment found (same Group ID and Time Group ID). Please remove the duplicate.");
        return;
      }
      seen.add(key);
    }

    try {
      if (isAssignEditMode) {
        await deleteAllUserWiegands.mutateAsync({ user_id: assignForm.user_id });
      }

      const bySn = new Map<string, DraftAssignment[]>();
      for (const a of assignments) {
        const sn = String(groupIdToSn.get(a.group_id) || "").trim();
        if (!sn) {
          setAssignError(`Device SN not found for group ${a.group_id}.`);
          return;
        }
        if (!bySn.has(sn)) bySn.set(sn, []);
        bySn.get(sn)!.push(a);
      }

      await Promise.all(
        Array.from(bySn.entries()).map(([sn, snAssignments]) =>
          createUserWiegand.mutateAsync({
            sn,
            user_id: assignForm.user_id,
            assignments: snAssignments,
            del_flag: false,
          } as any)
        )
      );

      setAssignSuccess(isAssignEditMode ? "Updated assigned remote/time group successfully." : "Assigned remote/time group successfully.");

      setAssignOpen(false);
      setAssignForm(initialAssignForm);
      setDraftAssignments([]);
      setEditingDraftIndex(null);
      setUserSearchText("");
      setShowUserSuggestions(false);
      setRemoteGroupSearchText("");
      setShowRemoteGroupSuggestions(false);
      setTimeGroupSearchText("");
      setShowTimeGroupSuggestions(false);
      setIsAssignEditMode(false);
    } catch (err: any) {
      setAssignError(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          (isAssignEditMode ? "Failed to update assigned remote/time group." : "Failed to assign wiegand group.")
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
              setAssignError("");
              setAssignSuccess("");
              setIsAssignEditMode(false);
              setAssignForm({ ...initialAssignForm });
              setDraftAssignments([]);
              setEditingDraftIndex(null);
              setUserSearchText("");
              setShowUserSuggestions(false);
              setRemoteGroupSearchText("");
              setShowRemoteGroupSuggestions(false);
              setTimeGroupSearchText("");
              setShowTimeGroupSuggestions(false);
              setAssignOpen(true);
            }}
          >
            Assign remote/time group
          </Button>
        )}
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
          if (createUserWiegand.isPending || deleteAllUserWiegands.isPending) return;
          setAssignOpen(false);
          setIsAssignEditMode(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleAssignSubmit}>
          <DialogTitle>{isAssignEditMode ? "Edit assigned remote/time group" : "Assign remote/time group"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {assignError && <Alert severity="error">{assignError}</Alert>}

              <TextField
                label="User ID"
                value={userSearchText}
                onChange={(e) => {
                  const next = e.target.value || "";
                  setUserSearchText(next);
                  setAssignForm((prev) => ({ ...prev, user_id: next.trim() }));
                  setShowUserSuggestions(true);
                }}
                onFocus={() => setShowUserSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowUserSuggestions(false);
                }}
                required
                fullWidth
                helperText="Type user id or name to search, then pick from results."
              />

              {showUserSuggestions && (isUsersLoading || userSearchResults.length > 0) && (
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Search results
                    </Typography>
                    {isUsersLoading && <CircularProgress size={16} />}
                  </Stack>
                  {userSearchResults.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No users found.
                    </Typography>
                  ) : (
                    <List dense sx={{ maxHeight: 180, overflow: "auto" }}>
                      {userSearchResults.map((u) => (
                        <ListItemButton
                          key={u.user_id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setUserSearchText(u.user_id);
                            setAssignForm((prev) => ({ ...prev, user_id: u.user_id }));
                            setShowUserSuggestions(false);
                          }}
                        >
                          <ListItemText primary={u.label} secondary={u.user_id} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              )}

              <TextField
                label="Remote Group ID"
                value={remoteGroupSearchText}
                onChange={(e) => {
                  const next = e.target.value || "";
                  setRemoteGroupSearchText(next);
                  setAssignForm((prev) => ({
                    ...prev,
                    remote_group_id: next.trim(),
                    sn: String(groupIdToSn.get(next.trim()) || ""),
                  }));
                  setShowRemoteGroupSuggestions(true);
                }}
                onFocus={() => setShowRemoteGroupSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowRemoteGroupSuggestions(false);
                }}
                fullWidth
                helperText={remoteGroupHelperText}
              />

              {showRemoteGroupSuggestions && (isRemoteGroupsLoading || remoteGroupSearchResults.length > 0) && (
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Remote groups
                    </Typography>
                    {isRemoteGroupsLoading && <CircularProgress size={16} />}
                  </Stack>
                  {remoteGroupSearchResults.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No remote groups found.
                    </Typography>
                  ) : (
                    <List dense sx={{ maxHeight: 180, overflow: "auto" }}>
                      {remoteGroupSearchResults.map((g) => (
                        <ListItemButton
                          key={g.group_id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setRemoteGroupSearchText(g.group_id);
                            setAssignForm((prev) => ({
                              ...prev,
                              remote_group_id: g.group_id,
                              sn: String(g.sn || ""),
                            }));
                            setShowRemoteGroupSuggestions(false);
                          }}
                        >
                          <ListItemText
                            primary={`${g.group_id} (Device: ${g.device_name ? `${g.device_name} (${g.sn || "-"})` : g.sn || "-"})`}
                            secondary={g.device_name || g.group_id}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              )}

              <TextField
                label="Time Group ID"
                value={timeGroupSearchText}
                onChange={(e) => {
                  const next = e.target.value || "";
                  setTimeGroupSearchText(next);
                  setAssignForm((prev) => ({ ...prev, time_group_id: next.trim() }));
                  setShowTimeGroupSuggestions(true);
                }}
                onFocus={() => setShowTimeGroupSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowTimeGroupSuggestions(false);
                }}
                fullWidth
                helperText={timeGroupHelperText}
              />

              {showTimeGroupSuggestions && (isTimeGroupsLoading || timeGroupSearchResults.length > 0) && (
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Time groups
                    </Typography>
                    {isTimeGroupsLoading && <CircularProgress size={16} />}
                  </Stack>
                  {timeGroupSearchResults.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No time groups found.
                    </Typography>
                  ) : (
                    <List dense sx={{ maxHeight: 180, overflow: "auto" }}>
                      {timeGroupSearchResults.map((t) => (
                        <ListItemButton
                          key={t.time_group_id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setTimeGroupSearchText(t.time_group_id);
                            setAssignForm((prev) => ({ ...prev, time_group_id: t.time_group_id }));
                            setShowTimeGroupSuggestions(false);
                          }}
                        >
                          <ListItemText primary={t.label || t.time_group_id} secondary={t.time_group_id} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              )}

              <Button
                variant="outlined"
                onClick={addOrUpdateDraftAssignment}
                disabled={createUserWiegand.isPending || deleteAllUserWiegands.isPending}
              >
                {editingDraftIndex == null ? "Add assignment" : "Update assignment"}
              </Button>

              {editingDraftIndex != null && (
                <Button
                  variant="text"
                  onClick={() => {
                    setEditingDraftIndex(null);
                    setRemoteGroupSearchText("");
                    setTimeGroupSearchText("");
                    setAssignForm((prev) => ({ ...prev, remote_group_id: "", time_group_id: "" }));
                  }}
                  disabled={createUserWiegand.isPending || deleteAllUserWiegands.isPending}
                >
                  Cancel edit
                </Button>
              )}

              {draftAssignments.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Assignments
                  </Typography>
                  <List dense>
                    {draftAssignments.map((a, idx) => (
                      <ListItem
                        key={`${a.group_id}:${a.time_group_id}:${idx}`}
                        disablePadding
                        secondaryAction={
                          <IconButton
                            edge="end"
                            size="small"
                            color="error"
                            onClick={() => {
                              setDraftAssignments((prev) => prev.filter((_, i) => i !== idx));
                              if (editingDraftIndex === idx) setEditingDraftIndex(null);
                            }}
                          >
                            <Trash size={16} />
                          </IconButton>
                        }
                      >
                        <ListItemButton
                        key={`${a.group_id}:${a.time_group_id}:${idx}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setAssignError("");
                          setEditingDraftIndex(idx);
                          setRemoteGroupSearchText(a.group_id);
                          setTimeGroupSearchText(a.time_group_id);
                          setAssignForm((prev) => ({
                            ...prev,
                            remote_group_id: a.group_id,
                            time_group_id: a.time_group_id,
                            sn: String(groupIdToSn.get(a.group_id) || prev.sn || ""),
                          }));
                          setShowRemoteGroupSuggestions(false);
                          setShowTimeGroupSuggestions(false);
                        }}
                      >
                        <ListItemText primary={`${a.group_id} → ${a.time_group_id}`} secondary="Click to edit" />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setAssignOpen(false);
                setIsAssignEditMode(false);
              }}
              disabled={createUserWiegand.isPending || deleteAllUserWiegands.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createUserWiegand.isPending || deleteAllUserWiegands.isPending}
            >
              {createUserWiegand.isPending || deleteAllUserWiegands.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete assignments"
        message={
          deleteTarget
            ? `Are you sure you want to delete ALL assignments for User ${deleteTarget.user_id}? (${deleteTarget.ids.length} records)`
            : "Are you sure you want to delete these assignments?"
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteAllUserWiegands.isPending}
      />
    </>
  );
};

export default AssignRemoteTimeGroupTab;
