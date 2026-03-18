import { DataGrid } from "@mui/x-data-grid";
import { IoCloseCircle, IoTrash } from "react-icons/io5";
import { useState } from "react";
import { useCreateGroup, useDeleteGroupForThatUser, useDeleteUserWithGroup, useFetchUserWithGroup } from "../../service/useUsers";
import { Edit } from 'lucide-react';
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Checkbox, Autocomplete } from "@mui/material";
import { useGroupManagent } from "../../service/useGroupManagement";

const GroupRelatedUsers = () => {
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);

    const { data, isFetching } = useFetchUserWithGroup({ page: page + 1, limit });
    const deleteMutation = useDeleteGroupForThatUser();
    const deleteUserFromTheGroupMutation = useDeleteUserWithGroup();
    const [openModal, setOpenModal] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const { data: deviceOption } = useGroupManagent();
    const createGroupForUser = useCreateGroup();

    const rows = data?.data ?? [];
    
    const groupOptions = deviceOption?.data?.map((g: any) => ({
        id: g.id,
        label: g.device_name
    })) ?? [];


    // ---- Column Definition ----
    const usersColumn = [
        {
            field: "name",
            headerName: "User Name",
            flex: 1,
        },
        {
            field: "groupsColumn",
            headerName: "Group",
            flex: 1,
            sortable: false,
            renderCell: (params: any) => {
                const groups = params.row.devices ?? [];
                
                if (groups.length === 0) return "-";

                return (
                    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                        {groups.map((val: any, index: number) => (
                            <div key={val.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                {index + 1}. {val.name} ({val.sn})
                                <span
                                    style={{ cursor: "pointer", color: "red" }}
                                    onClick={() => handleDeleteGroupByUser(val.id,params.row.id)}
                                >
                                    <IoCloseCircle />
                                </span>
                            </div>
                        ))}
                    </div>
                );
            },
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            renderCell: (params: any) => (
                <>
                    <IconButton onClick={() => openEditUser(params.row)}>
                        <Edit className="text-primary!" />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(params.row.id)}>
                        <IoTrash className="text-red-600" />
                    </IconButton>
                </>
            ),
        },
    ];

    // ---- Temporary handlers (replace with your logic) ----
    const handleDelete = (id: string) => {
        deleteUserFromTheGroupMutation.mutate(String(id));
    };
    const handleDeleteGroupByUser = async (groupId: string,userId:any) => {       
        deleteMutation.mutate({groupId:String(groupId),userId});
    };

    const openEditUser = (row: any) => {        
        setSelectedUser(row);
        setSelectedGroups(
            row.devices?.map((g: any) => ({
                id: g.id,
                label: g.name
            })) ?? []
        );
        // preload existing groups
        setOpenModal(true);
    };

    const filteredOptions = groupOptions.filter(
  (opt: any) => !selectedGroups.some((g) => g.id === opt.id)
);

    const handleSave = () => {
        const payload = {
            user_id: selectedUser.id,
            group_ids: selectedGroups.map(g => g.id)
        };

        createGroupForUser.mutate(payload, {
            onSuccess: () => {
                setOpenModal(false);
            }
        });
    };

    return (
        <div style={{ height: 600, width: "100%" }}>
            <DataGrid
                rows={rows.map((r) => ({ ...r, id: r.id }))} // required id field
                columns={usersColumn}
                pagination
                paginationMode="server"
                rowCount={data?.pagination?.total ?? 0}
                pageSizeOptions={[5, 10, 20]}
                paginationModel={{ page, pageSize: limit }}
                onPaginationModelChange={(model: any) => {
                    setPage(model.page);
                    setLimit(model.pageSize);
                }}
                loading={isFetching}
                disableRowSelectionOnClick
                disableColumnSelector
                 getRowHeight={() => 'auto'}
                getRowId={(row) => row.user_id ?? `temp-${Math.random()}`}
                sx={{
                    "& .MuiDataGrid-cell:focus": { outline: "none" },
                }}
            />

            {/* MODAL */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit User Groups</DialogTitle>
                <DialogContent dividers>
                    <Autocomplete
                        multiple
                        disableCloseOnSelect
                        options={filteredOptions}
                        value={selectedGroups}
                        getOptionLabel={(option: any) => option.label}
                        onChange={(_, newValue) => setSelectedGroups(newValue)}
                        renderOption={(props, option, { selected }) => (
                            <li {...props}>
                                <Checkbox checked={selected} style={{ marginRight: 8 }} />
                                {option.label}
                            </li>
                        )}
                        renderInput={(params) => <TextField {...params} label="Select Groups" />}
                    />

                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default GroupRelatedUsers;
