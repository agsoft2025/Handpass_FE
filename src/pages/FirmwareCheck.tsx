import { useForm } from "react-hook-form";
import { Box, Container, Typography, TextField, Button, Paper, Alert, CircularProgress } from "@mui/material";
import { useFirmwareCheck } from "../service/useFirmware";
import type { FirmwareCheckData } from "../types/firmwareTypes";

const FirmwareCheck = () => {
  const firmwareCheck = useFirmwareCheck();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FirmwareCheckData>();

  const onSubmit = (data: FirmwareCheckData) => {
    firmwareCheck.mutate(data, {
      onSuccess: (response) => {
        console.log("Firmware check response:", response);
        // Handle success - show update availability
      },
      onError: (error) => {
        console.error("Firmware check failed:", error);
        // Handle error
      },
    });
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 6 }}>
          <Typography variant="h4" component="h1" align="center" fontWeight="bold" gutterBottom>
            Firmware Check
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <TextField
                id="sn"
                label="Device Serial Number"
                placeholder="Enter device serial number"
                fullWidth
                {...register("sn", {
                  required: "Serial number is required",
                })}
                error={!!errors.sn}
                helperText={errors.sn?.message}
              />
            </Box>

            <Box>
              <TextField
                id="version"
                label="Current Firmware Version"
                placeholder="Enter current firmware version"
                fullWidth
                {...register("version", {
                  required: "Firmware version is required",
                })}
                error={!!errors.version}
                helperText={errors.version?.message}
              />
            </Box>

            <Button 
              type="submit" 
              variant="contained" 
              fullWidth 
              size="large"
              disabled={firmwareCheck.isPending}
            >
              {firmwareCheck.isPending ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Checking...
                </>
              ) : (
                "Check for Updates"
              )}
            </Button>

            {firmwareCheck.data && (
              <Alert 
                severity={firmwareCheck.data.updateAvailable ? "info" : "success"}
                sx={{ mt: 2 }}
              >
                {firmwareCheck.data.message}
                {firmwareCheck.data.updateAvailable && firmwareCheck.data.latestVersion && (
                  <div>
                    Latest version: {firmwareCheck.data.latestVersion}
                  </div>
                )}
              </Alert>
            )}

            {firmwareCheck.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Failed to check firmware. Please try again.
              </Alert>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default FirmwareCheck;
