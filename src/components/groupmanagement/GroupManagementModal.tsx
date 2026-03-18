import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { Controller, type UseFormRegister, type FieldErrors, type UseFormHandleSubmit } from "react-hook-form";
import type { Control } from "react-hook-form";

interface Device {
    id: string;
    sn: string;
    // Add other device properties if needed
}

interface GroupFormData {
    group_name: string;
    device_id: string;
    description: string;
    is_active: boolean;
}

interface GroupManagementModalProps {
    open: boolean;
    onClose: () => void;
    editingGroup: boolean;
    devices: Device[];
    controlGroup: Control<GroupFormData>;
    registerGroup: UseFormRegister<GroupFormData>;
    groupErrors: FieldErrors<GroupFormData>;
    handleSubmitGroup: UseFormHandleSubmit<GroupFormData>;
    saveGroup: (data: GroupFormData) => void;
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({
    open,
    onClose,
    editingGroup,
    devices,
    controlGroup,
    registerGroup,
    groupErrors,
    handleSubmitGroup,
    saveGroup,
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmitGroup(saveGroup)}>
                <DialogTitle>
                    {editingGroup ? "Edit Group" : "Add Group"}
                </DialogTitle>

                <DialogContent>
                    {/* Group Name */}
                    <TextField
                        label="Group Name"
                        {...registerGroup("group_name")}
                        error={!!groupErrors.group_name}
                        helperText={groupErrors.group_name?.message}
                        fullWidth
                        margin="dense"
                    />

                    {/* Device Select */}
                    <Controller
                        name="device_id"
                        control={controlGroup}
                        render={({ field }) => {
                            const selectedDevice =
                                devices.find((d) => d.id === field.value) || null;

                            return (
                                <Autocomplete
                                    options={devices}
                                    value={selectedDevice}
                                    getOptionLabel={(option) => option.sn || ""}
                                    isOptionEqualToValue={(a, b) => a.id === b?.id}
                                    onChange={(_, value) =>
                                        field.onChange(value?.id || "")
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Select Device"
                                            fullWidth
                                            margin="dense"
                                            error={!!groupErrors.device_id}
                                            helperText={groupErrors.device_id?.message}
                                        />
                                    )}
                                />
                            );
                        }}
                    />

                    {/* Description */}
                    <TextField
                        label="Description"
                        {...registerGroup("description")}
                        error={!!groupErrors.description}
                        helperText={groupErrors.description?.message}
                        fullWidth
                        multiline
                        rows={3}
                        margin="dense"
                    />
                </DialogContent>

                <DialogActions>
                    <Button variant="outlined" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default GroupManagementModal;