import  { useEffect, useState } from 'react';
import { Autocomplete, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
// import { DataGrid } from "@mui/x-data-grid";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, Controller, useWatch } from "react-hook-form";
import type { ReportPayload } from '../../types/reportTypes';
import { useUsers } from '../../service/useUsers';
import { useReportsMutation } from '../../service/useReport';
import { useDebounce } from '../../hooks/useDebounce';
import { useDevices } from '../../service/useDevice';

type ReportsFormProps = {
    onFilterChange: (filters: ReportPayload) => void;
}

const schema = yup.object({
    sn: yup.string().nullable(),
    name: yup.object().nullable(),
    start_date: yup.date().nullable(),
    end_date: yup
        .date()
        .nullable()
        .min(
            yup.ref("start_date"),
            "End date cannot be earlier than start date"
        ),
    format: yup.string().nullable(),
});


const ReportsForm = ({ onFilterChange }: ReportsFormProps) => {
    const { control, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            sn: "",
            name: null,
            format: "csv",
            start_date: null,
            end_date: null
        },
    });
    const formValues = useWatch({ control });

    const [searchText, setSearchText] = useState("");
    const debouncedSearch = useDebounce(searchText, 400);
    const { data } = useUsers(1, 4, debouncedSearch);
    const reports = useReportsMutation();
    const { data: device } = useDevices();
    const snOptions = device?.data?.map((item: any) => item.sn) ?? [];

    useEffect(() => {
        const payload: any = {
            ...formValues
        };

        onFilterChange(payload);
    }, [formValues]);


    const onSubmit = (data: any) => {
        const payload: ReportPayload = {
            ...(data),
            format: "csv",
        };

        reports.mutate(payload, {
            onSuccess: (resp) => {
                downloadCSV(resp);
            },
            onError: (err) => {
                console.error("Failed:", err);
            },
        });
    };

    const downloadCSV = (csvText: any) => {
        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "reports.csv";
        link.click();

        URL.revokeObjectURL(url);
    };
    return (
        <div>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="grid grid-cols-5 gap-4 items-end my-4"
            >
                {/* SN Autocomplete */}
                <Controller
                    name="sn"
                    control={control}
                    render={({ field }) => (
                        <Autocomplete
                            options={snOptions}
                            value={field.value ?? null}
                            onChange={(_, value) => field.onChange(value)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Serial Number"
                                    size="small"
                                    error={!!errors.sn}
                                    helperText={errors.sn?.message}
                                    className="w-full"
                                />
                            )}
                            className="w-full"
                        />
                    )}
                />


                {/* Name Autocomplete */}
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <Autocomplete
                            options={data?.data ?? []} // array of UserData
                            getOptionLabel={(option) =>
                                option ? `${option.name} (${option.device_name})` : ""
                            }
                            isOptionEqualToValue={(option, value) => option.id === value?.id} // key matching
                            value={field.value as any} // must be UserData | null
                            inputValue={searchText}
                            onInputChange={(_, value) => setSearchText(value)}
                            onChange={(_, value) => field.onChange(value ?? null)} // set object
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="User Name"
                                    size="small"
                                    error={!!errors.name}
                                    helperText={errors.name?.message}
                                />
                            )}
                        />
                    )}
                />



                <Controller
                    name="start_date"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            label="Start Date"
                            value={field.value ? dayjs(field.value) : null}
                            onChange={(value) => field.onChange(value ? value.toDate() : null)}
                            slotProps={{
                                textField: { size: "small", fullWidth: true }
                            }}
                        />
                    )}
                />


                <Controller
                    name="end_date"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            label="End Date"
                            value={field.value ? dayjs(field.value) : null}
                            onChange={(value) => field.onChange(value ? value.toDate() : null)}
                            slotProps={{
                                textField: { size: "small", fullWidth: true }
                            }}
                        />
                    )}
                />

                {/* Submit */}
                <button
                    type="submit"
                    className="bg-primary text-white px-4 py-2 rounded"
                >
                    Submit
                </button>
            </form>
        </div>
    )
}

export default ReportsForm