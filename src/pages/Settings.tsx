import { AttendanceTable } from '../components/settings/AttendanceTable';
import WorkScheduleForm from '../components/settings/WorkScheduleForm'
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useRegisterUser } from '../service/useAuth';

const Settings = () => {
  const registerUser = useRegisterUser();
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "operator" as "operator" | "admin",
  });

  const canSubmit =
    userForm.name.trim() &&
    userForm.email.trim() &&
    userForm.password.trim() &&
    (userForm.role === "admin" || userForm.role === "operator");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await registerUser.mutateAsync({
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      password: userForm.password,
      role: userForm.role,
    });
    setUserForm({ name: "", email: "", password: "", role: "operator" });
  };

  return (
    <div>
        <h1 className='text-2xl text-primary font-bold'>Attenence Settings</h1>
        <WorkScheduleForm />
        <AttendanceTable />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0E21A0", mb: 1 }}>
            Create Admin/Operator
          </Typography>
          <Box component="form" onSubmit={handleCreateUser} sx={{ display: "grid", gap: 2, maxWidth: 520 }}>
            <TextField
              label="Name"
              value={userForm.name}
              onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
              size="small"
              required
            />
            <TextField
              label="Email"
              value={userForm.email}
              onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
              size="small"
              required
            />
            <TextField
              label="Password"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
              size="small"
              required
            />
            <TextField
              label="Role"
              select
              value={userForm.role}
              onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value as any }))}
              size="small"
              required
            >
              <MenuItem value="operator">Operator</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>

            <Button type="submit" variant="contained" disabled={!canSubmit || registerUser.isPending}>
              {registerUser.isPending ? "Creating..." : "Create"}
            </Button>
          </Box>
        </Box>
    </div>
  )
}

export default Settings