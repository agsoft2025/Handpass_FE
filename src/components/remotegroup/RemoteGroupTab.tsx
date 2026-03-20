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
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { Edit, Trash } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { useDevices } from "../../service/useDevice";
import {
  useCreateWiegandGroup,
  useSoftDeleteWiegandGroup,
  useUpdateWiegandGroup,
  useWiegandGroups,
} from "../../service/useWiegandGroup";
import { DeleteConfirmDialog } from "../common/DeleteConfirmDialog";
import type { DeviceSnOption } from "./types";
import {
  bitmaskToWeekdays,
  formatTimeForDisplay,
  type Weekday,
  weekdayLabelMap,
} from "./utils";
import { useAuth } from "../../auth/AuthProvider";

const initialForm = {
  group_id: "",
  sn: ""
};

const RemoteGroupTab = () => {
  const { user } = useAuth();
  const role = String((user as any)?.role ?? "").toLowerCase();
  const isOperator = role === "operator";
  const [open, setOpen] = useState(false);
  const [groupsPaginationModel, setGroupsPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [snSearchText, setSnSearchText] = useState("");
  const [snSearchQuery, setSnSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(initialForm);
  const [deleteTarget, setDeleteTarget] = useState<null | { group_id: string; sn: string }>(null);

  const debouncedSnSearchQuery = useDebounce(snSearchQuery, 400);

  const createWiegandGroup = useCreateWiegandGroup();
  const updateWiegandGroup = useUpdateWiegandGroup();
  const softDeleteWiegandGroup = useSoftDeleteWiegandGroup();
  const { data, isLoading, isFetching, isError } = useWiegandGroups(
    0,
    true,
    groupsPaginationModel.page + 1,
    groupsPaginationModel.pageSize
  );
  const { data: devicesData, isLoading: isDevicesLoading } = useDevices(1, debouncedSnSearchQuery);

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

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
        ? data.items
        : [];

  const groupsRowCount =
    Number((data as any)?.pagination?.total ?? (data as any)?.totalCount ?? (data as any)?.total ?? list.length) || 0;

  const rows = list.map((item: any, index: number) => {
    const firstConfig = item?.time_configs?.[0];
    const rawWeekdays = firstConfig?.weekdays;
    const deviceName = String(item?.device?.name ?? "").trim();
    const serialNumber = String(item?.sn ?? "").trim();
    const snDisplay =
      deviceName && serialNumber ? `${deviceName} (${serialNumber})` : serialNumber || deviceName || "-";
    const weekdaysArray: Weekday[] = Array.isArray(rawWeekdays)
      ? (rawWeekdays
          .map((day: number) => Number(day))
          .filter((day: number) => day >= 1 && day <= 7) as Weekday[])
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

  const handleEditRow = (row: any) => {
    setError("");
    setSuccess("");
    setIsEditMode(true);
    setSelectedId(String(row.api_id ?? row.id ?? ""));
    setForm({
      group_id: String(row.group_id ?? ""),
      sn: String(row.snRaw ?? row.sn ?? ""),
    });
    setSnSearchText(String(row.sn ?? row.snRaw ?? ""));
    setSnSearchQuery(String(row.snRaw ?? row.sn ?? ""));
    setOpen(true);
  };

  const handleDeleteClick = (row: any) => {
    const group_id = String(row?.group_id ?? "").trim();
    const sn = String(row?.snRaw ?? "").trim();
    if (!group_id || !sn || group_id === "-" || sn === "-") {
      setError("Invalid record selected for delete.");
      return;
    }
    setDeleteTarget({ group_id, sn });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setError("");
    setSuccess("");
    try {
      await softDeleteWiegandGroup.mutateAsync(deleteTarget);
      setSuccess("Remote group deleted successfully.");
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete remote group.");
    }
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
        <Stack direction="row" spacing={1}>
          {!isOperator && (
            <>
              <IconButton size="small" onClick={() => handleEditRow(params.row)}>
                <Edit size={18} />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteClick(params.row)}
                disabled={softDeleteWiegandGroup.isPending}
              >
                <Trash size={18} />
              </IconButton>
            </>
          )}
        </Stack>
      ),
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.group_id || !form.sn) {
      setError("Please fill all fields.");
      return;
    }

    const payload = {
      group_id: form.group_id,
      sn: form.sn,
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
              setIsEditMode(false);
              setSelectedId("");
              setSnSearchText("");
              setSnSearchQuery("");
              setForm({ ...initialForm });
              setOpen(true);
            }}
          >
            Create remote group
          </Button>
        )}
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
          Failed to fetch remote groups.
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
          <DialogTitle>{isEditMode ? "Edit remote group" : "Create remote group"}</DialogTitle>
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

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete remote group"
        message={
          deleteTarget
            ? `Are you sure you want to delete group ${deleteTarget.group_id} (SN: ${deleteTarget.sn})?`
            : "Are you sure you want to delete this remote group?"
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={softDeleteWiegandGroup.isPending}
      />
    </>
  );
};

export default RemoteGroupTab;
