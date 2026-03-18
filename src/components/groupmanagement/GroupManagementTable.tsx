import { useState } from "react";
import { DataGrid, type GridRenderCellParams, type GridPaginationModel } from "@mui/x-data-grid";
import { useCreateGroup, useGroupManagent } from "../../service/useGroupManagement"; // your API hook
import type { Group } from "../../types/groupManagement";
import GroupDevicesDialog from "./GroupDevicesDialog";
import { useForm } from "react-hook-form";
import GroupManagementModal from "./GroupManagementModal";
import { useDevices } from "../../service/useDevice";
import { Eye } from "lucide-react";

const GroupManagementTable = () => {

    const {
        register: registerGroup,
        handleSubmit: handleSubmitGroup,
        control: controlGroup,
        formState: { errors: groupErrors }
    } = useForm({
        defaultValues: {
            group_name: "",
            description: "",
            device_id: "",
            is_active: true
        }
    });

    // add group
    const [groupDialog, setGroupDialog] = useState(false);
    const [editingGroup] = useState<Group | null>(null);
    const { data: devices } = useDevices();
    const createGroup = useCreateGroup();

    const [page, setPage] = useState(0); // 0-indexed for MUI
    const [limit, setLimit] = useState(10);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectGroupID, setSelectedGroupID] = useState("");

    // Fetch groups with pagination
    const { data, isFetching } = useGroupManagent(page + 1, limit); // Assuming API accepts page & limit
    const rows: Group[] = data?.data ?? [];

    const groupColumns = [
        {
            field: "device_name",
            headerName: "Group Name",
            flex: 1,
            renderCell: (params: GridRenderCellParams<Group>) => {
                return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{params.value}</span>
                    </div>
                );
            },
        },
         {
            field: "device_sn",
            headerName: "Serial No",
            flex: 1,
            renderCell: (params: GridRenderCellParams<Group>) => {
                const sn = params.row?.sn || "No SN";
                return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <strong>{sn}</strong>
                    </div>
                );
            },
        },
        { field: "description", headerName: "Description", flex: 2 },
        {
            field: "is_active",
            headerName: "Status",
            flex: 0.5,
            renderCell: (params: GridRenderCellParams<Group>) => (
                <span className={params.value ? "text-green-600" : "text-red-600"}>
                    {params.value ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            renderCell: (params: GridRenderCellParams<Group>) => (
                <button className="text-blue-600 hover:underline" onClick={() => handleViewClick(params.row)}
            >
                 <Eye />
            </button>
            ),
        },
    ];

    const handleViewClick = (group: Group) => {
        setSelectedGroupID(group.id)
        setDialogOpen(true);
    };

    const saveGroup = (formData: any) => {
        const payload: any = {
            group_name: formData.group_name,
            description: formData.description,
            device_id: formData.device_id,
            is_active: formData.is_active
        };
        createGroup.mutate(payload)
    }

    return (
        <>
            {/* <div className="flex justify-end">
                <Button className="bg-primary! text-white! mb-2!" onClick={openAddGroup}>Add Group</Button>
            </div> */}
            <div style={{ height: 500, width: "100%" }}>
                <DataGrid
                    rows={rows?.map((r) => ({ ...r, id: r.id }))}
                    columns={groupColumns}
                    pagination
                    paginationMode="server"
                    rowCount={data?.pagination?.total ?? 0}
                    pageSizeOptions={[5, 10, 20]}
                    paginationModel={{ page, pageSize: limit }}
                    onPaginationModelChange={(model: GridPaginationModel) => {
                        setPage(model.page);
                        setLimit(model.pageSize);
                    }}
                    loading={isFetching}
                    disableRowSelectionOnClick
                    disableColumnSelector
                    sx={{
                        "& .MuiDataGrid-cell:focus": { outline: "none" },
                    }}
                />

                {/* Device dialog */}
                <GroupDevicesDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    groupID={selectGroupID}
                />

            </div>

            <GroupManagementModal
                open={groupDialog}
                onClose={() => setGroupDialog(false)}
                editingGroup={!!editingGroup}
                devices={devices?.data as any}
                controlGroup={controlGroup}
                registerGroup={registerGroup}
                groupErrors={groupErrors}
                handleSubmitGroup={handleSubmitGroup}
                saveGroup={saveGroup}
            />
        </>
    );
};

export default GroupManagementTable;
