import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormHelperText, Switch, TextField } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect } from "react";

const schema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Enter a valid email").required("Email is required"),
  phone_number: yup
    .string()
    .transform((value) => (value ?? "").replace(/\D/g, ""))
    .max(15, "Phone number is too long")
    .default("")
    .defined(),
  admin_auth: yup
    .number()
    .transform((_value, originalValue) => {
      if (originalValue === "" || originalValue === null || originalValue === undefined) {
        return 0;
      }
      return Number(originalValue);
    })
    .oneOf([0, 1], "Admin Auth must be 0 or 1")
    .required("Admin Auth is required"),
});

type EditUserFormValues = {
  name: string;
  email: string;
  phone_number: string;
  admin_auth: number;
};

type EditUserDialogProps = {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  defaultEmail: string;
  defaultPhoneNumber?: string;
  defaultAdminAuth?: number;
  onSubmit: (values: {
    name: string;
    email: string;
    phone_number?: string;
    admin_auth: number;
  }) => void;
};

export const EditUserDialog = ({
  open,
  onClose,
  defaultName,
  defaultEmail,
  defaultPhoneNumber,
  defaultAdminAuth = 0,
  onSubmit,
}: EditUserDialogProps) => {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      phone_number: defaultPhoneNumber ?? "",
      admin_auth: defaultAdminAuth,
    },
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    reset({
      name: defaultName,
      email: defaultEmail,
      phone_number: defaultPhoneNumber ?? "",
      admin_auth: defaultAdminAuth,
    });
  }, [defaultName, defaultEmail, defaultPhoneNumber, defaultAdminAuth, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit User</DialogTitle>
      <form
        onSubmit={handleSubmit((values) =>
          onSubmit({
            name: values.name,
            email: values.email,
            phone_number: values.phone_number ? values.phone_number.replace(/\D/g, "") : undefined,
            admin_auth: Number(values.admin_auth),
          }),
        )}
      >
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            {...register("name")}
            error={!!errors.name}
            helperText={errors.name?.message?.toString()}
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            {...register("email")}
            error={!!errors.email}
            helperText={errors.email?.message?.toString()}
          />
          <TextField
            label="Phone Number"
            type="number"
            fullWidth
            margin="normal"
            {...register("phone_number")}
            error={!!errors.phone_number}
            helperText={errors.phone_number?.message?.toString()}
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
              onWheel: (e) => e.currentTarget.blur(),
            }}
          />
          <Controller
            control={control}
            name="admin_auth"
            render={({ field }) => (
              <div className="mt-4">
                <FormControlLabel
                  control={
                    <Switch
                      checked={Number(field.value) === 1}
                      onChange={(_, checked) => field.onChange(checked ? 1 : 0)}
                    />
                  }
                  label="Palm Access Without Password"
                />
                <FormHelperText error={!!errors.admin_auth}>
                  {errors.admin_auth?.message?.toString() ??
                    "If enabled, the user can access with palm only. If disabled, password is also required."}
                </FormHelperText>
              </div>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} variant="contained">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
