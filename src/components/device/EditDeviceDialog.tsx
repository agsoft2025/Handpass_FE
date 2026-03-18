import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";
import React, { useState } from "react";

interface EditDeviceDialogProps {
  open: boolean;
  onClose: () => void;
  device: any | null;
  onUpdate: (id: string, name: string) => void;
}

export default function EditDeviceDialog({ open, onClose, device, onUpdate }: EditDeviceDialogProps) {
  const [name, setName] = useState(device?.device_name || "");

  // Sync if device changes
  React.useEffect(() => {
    setName(device?.device_name || "");
  }, [device]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Edit Device</DialogTitle>

      <DialogContent>
        <TextField
          label="Device Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{ mt: 1 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onUpdate(device.id, name)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
