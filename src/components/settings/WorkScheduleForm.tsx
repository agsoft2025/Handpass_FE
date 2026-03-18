import { useForm, Controller } from "react-hook-form";
import { TextField, Chip, Box } from "@mui/material";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { createAttendance } from "../../service/useSettings";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const schema = yup.object({
    work_start_time: yup.string().required("Start time is required"),
    work_end_time: yup.string().required("End time is required"),
    weekly_holidays: yup
        .array()
        .of(yup.number().min(0).max(6))
        .required("Weekly holidays required")
}).required();

export default function WorkScheduleForm() {
    const createAttenenceMutation = createAttendance();
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            work_start_time: "",
            work_end_time: "",
            weekly_holidays: []
        }
    });

    const onSubmit = (data: any) => {
        createAttenenceMutation.mutate(data, {
            onSuccess: () => {
                reset({
                    work_start_time: "",
                    work_end_time: "",
                    weekly_holidays: []
                });
            },
        })
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-[1fr_1fr_2fr_0.5fr] gap-4 items-center shadow-md p-5 mb-5">
            {/* work_start_time */}
            <Controller
                name="work_start_time"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Start Time"
                        type="time"
                        fullWidth
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.work_start_time}
                        helperText={errors.work_start_time?.message}
                    />
                )}
            />

            {/* work_end_time */}
            <Controller
                name="work_end_time"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="End Time"
                        type="time"
                        fullWidth
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.work_end_time}
                        helperText={errors.work_end_time?.message}
                    />
                )}
            />

            {/* weekly_holidays */}
            <Controller
                name="weekly_holidays"
                control={control}
                render={({ field }) => (
                    <Box mt={2}>
                        <label>Choose days</label>
                        <Box mt={1} display="flex" gap={1}>
                            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                                <Chip
                                    key={day}
                                    label={WEEKDAYS[day]}
                                    color={field.value.includes(day) ? "primary" : "default"}
                                    onClick={() => {
                                        const exists = field.value.includes(day);
                                        const newValue = exists
                                            ? field.value.filter((d: any) => d !== day)
                                            : [...field.value, day];
                                        field.onChange(newValue);
                                    }}
                                />
                            ))}
                        </Box>
                        {errors.weekly_holidays && (
                            <div style={{ color: "red", fontSize: 12 }}>
                                {errors.weekly_holidays.message as string}
                            </div>
                        )}
                    </Box>
                )}
            />


            <button type="submit" className="bg-primary text-white rounded-md h-15 w-35">Schedule</button>
        </form>
    );
}
