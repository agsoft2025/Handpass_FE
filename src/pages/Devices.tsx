import { useDeleteDevice, useDevices, useUpdateDevice } from "../service/useDevice";
import { useState } from "react";
import EditDeviceDialog from "../components/device/EditDeviceDialog";
import { DeviceCard } from "../components/device/DeviceCard";
import { CommonLoader } from "../components/common/CommonLoader";
import { DeleteConfirmDialog } from "../components/common/DeleteConfirmDialog";
import { Box, Button } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { LayoutGrid, List, Pencil, Trash } from "lucide-react";


const Devices = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  const { data, isLoading, isFetching, error } = useDevices(
    viewMode === "list" ? paginationModel.page + 1 : 1,
    "",
    true,
    viewMode === "list" ? paginationModel.pageSize : undefined
  );
  const updateMutation = useUpdateDevice();
  const deleteMutation = useDeleteDevice();

  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleEdit = (device: any) => {
    setSelected(device);
    setOpen(true);
  };

  const handleUpdate = (id: string, name: string) => {
    updateMutation.mutate(
      { id, name },
      {
        onSuccess: () => {
          setOpen(false);
          setSelected(null);
        },
        onError: (err) => {
          console.error(err);
        },
      }
    );
  };

  const handleDeleteClick = (device: any) => {
    setSelectedId(device.id);
  };

  const handleConfirmDelete = () => {
    if (!selectedId) return;
    deleteMutation.mutate(selectedId, {
      onSuccess: () => setSelectedId(null)
    });
  };



  if (isLoading) return <CommonLoader />;

  if (error) return <p className="text-red-500">Failed to load devices</p>;

  const formatDateTime = (value: unknown) => {
    if (!value) return "-";
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const columns: GridColDef[] = [
    {
      field: "device_name",
      headerName: "Device Name",
      flex: 1.2,
      renderCell: (params) => (
        <Box sx={{ display: "flex", flexDirection: "column", py: 1 }}>
          <span className="font-semibold">{params.row.device_name || "Unnamed Device"}</span>
          <span className="text-xs text-gray-500">SN: {params.row.sn}</span>
        </Box>
      ),
      sortable: false,
    },
    { field: "device_ip", headerName: "IP", flex: 1 },
    {
      field: "online_status",
      headerName: "Status",
      flex: 0.6,
      renderCell: (params) => {
        const isOnline = Number(params.row.online_status) === 1;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isOnline ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-700"
              }`}
          >
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
            {isOnline ? "Online" : "Offline"}
          </span>
        );
      },
      sortable: false,
    },
    { field: "firmware_version", headerName: "Firmware", flex: 1 },
    {
      field: "last_connect_time",
      headerName: "Last Connect",
      flex: 1.1,
      renderCell: (params) => <span>{formatDateTime(params.row.last_connect_time)}</span>,
    },
    {
      field: "created_at",
      headerName: "Created At",
      flex: 1.1,
      renderCell: (params) => <span>{formatDateTime(params.row.created_at)}</span>,
    },
    {
      field: "updated_at",
      headerName: "Updated At",
      flex: 1.1,
      renderCell: (params) => <span>{formatDateTime(params.row.updated_at)}</span>,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.8,
      sortable: false,
      renderCell: (params) => (
        <div>
          <Button variant="text" size="small" onClick={() => handleEdit(params.row)}>
            <Pencil size={18} />
          </Button>
          <Button variant="text" color="error" size="small" onClick={() => handleDeleteClick(params.row)}>
            <Trash size={18} />
          </Button>
        </div>
      ),
    },
  ];

  const rows = data?.data ?? [];

  return (
    <div>
      <h1 className='text-primary font-extrabold text-4xl mb-2'>Device Management</h1>
      <div className='flex items-center justify-between'>
        <p>Manage physical access terminals and cameras.</p>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant={viewMode === "grid" ? "contained" : "outlined"}
            className={viewMode === "grid" ? "bg-primary!" : ""}
            onClick={() => setViewMode("grid")}
            startIcon={<LayoutGrid size={16} />}
          >
            Grid
          </Button>
          <Button
            size="small"
            variant={viewMode === "list" ? "contained" : "outlined"}
            className={viewMode === "list" ? "bg-primary!" : ""}
            onClick={() => setViewMode("list")}
            startIcon={<List size={16} />}
          >
            List
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {rows.map((device: any) => (
            <DeviceCard
              key={device.id}
              device={device}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        <div className="w-full overflow-x-auto mt-4">
          <div className="min-w-275" style={{ height: 650 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              pagination
              pageSizeOptions={[5, 10, 20, 50]}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              paginationMode="server"
              rowCount={data?.pagination?.total ?? 0}
              loading={isLoading || isFetching}
              disableRowSelectionOnClick
              disableColumnSelector
              getRowHeight={() => "auto"}
              sx={{
                "& .MuiDataGrid-cell:focus": { outline: "none" },
                "& .MuiDataGrid-cell": { alignItems: "center" },
              }}
            />
          </div>
        </div>
      )}


      {/* Edit Dialogbox */}
      <EditDeviceDialog
        open={open}
        onClose={() => setOpen(false)}
        device={selected}
        onUpdate={handleUpdate}
      />

      {/* Delete Dialogbox */}
      <DeleteConfirmDialog
        open={!!selectedId}
        onCancel={() => setSelectedId(null)}
        onConfirm={handleConfirmDelete}
        // loading={deleteMutation.isLoading}
        message="Are you sure you want to delete this device?"
      />

    </div>
  )
}

export default Devices
