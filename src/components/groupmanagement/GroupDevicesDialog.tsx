import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { IoIosCloseCircle } from "react-icons/io";
import { useGroupViewMember } from "../../service/useGroupManagement";
import type { ViewGroupItem } from "../../types/groupManagement";

interface GroupDevicesDialogProps {
    open: boolean;
    onClose: () => void;
    groupID: string;
}

const GroupDevicesDialog: React.FC<GroupDevicesDialogProps> = ({
    open,
    onClose,
    groupID
}) => {
    const columns: GridColDef[] = [
        // { field: "group_name", headerName: "Group Name", flex: 1 },
        { field: "name", headerName: "User Name", flex: 1 },
        {
            field: "wiegand_flag",
            headerName: "Status",
            flex: 1,
            renderCell: ({ row }) =>
                <h3>{row.wiegand_flag === 1 ? "Allowed" : "Rejected"}</h3>
        },
    ];

    const [page, setPage] = useState(0); // MUI uses 0-index
    const [limit, setLimit] = useState(10);

    const { data, isFetching } = useGroupViewMember(page + 1, limit, groupID);

    const rows: ViewGroupItem[] = data?.data ?? [];
    const total = data?.pagination?.total ?? 0;
    const groupNameDevice = data?.device?.[0]?.device_name;
    

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Members in {groupNameDevice}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                >
                    <IoIosCloseCircle color="red" />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <div style={{ height: 400, width: "100%" }}>
                    <DataGrid
                        rows={rows.map(r => ({ ...r, id: r.id }))} // ensure id exists
                        columns={columns}
                        loading={isFetching}
                        pagination
                        paginationMode="server"
                        rowCount={total}
                        pageSizeOptions={[5, 10, 20]}
                        paginationModel={{ page, pageSize: limit }}
                        onPaginationModelChange={(model: GridPaginationModel) => {
                            setPage(model.page);
                            setLimit(model.pageSize);
                        }}
                        disableRowSelectionOnClick
                        sx={{ "& .MuiDataGrid-cell:focus": { outline: "none" } }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GroupDevicesDialog;
