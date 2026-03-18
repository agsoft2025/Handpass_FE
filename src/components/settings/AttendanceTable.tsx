import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useAttenence } from '../../service/useSettings';

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AttendanceTable() {
    const { data, isFetching } = useAttenence();

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID',flex:1 },
        { field: 'work_start_time', headerName: 'Start Time',flex:1 },
        { field: 'work_end_time', headerName: 'End Time',flex:1 },
        {
            field: "weekly_holidays",
            headerName: "Weekly Holidays",
            flex:1,
            renderCell: (params: any) => {
                const value = params.row.weekly_holidays as number[] | undefined;
                return value ? value.sort().map((day) => WEEKDAYS[day]).join(", ") : "";
            },
        },
        {
            field: 'is_active',
            headerName: 'Active',
            flex:1,
            renderCell: (params)=> params.row.is_active ? <span className='bg-green-500 py-2 px-4 rounded-2xl text-white'>Active</span> : <span className='bg-red-500 py-2 px-4 rounded-2xl text-white'>InActive</span>
        },
        {
            field: 'updated_at',
            headerName: 'Updated At',
            flex:1,
            renderCell: (params) => new Date(params.row.updated_at as string).toLocaleString()
        }
    ];

    return (
        <div style={{ height: 400, width: '100%' }}>
            <DataGrid
                rows={data?.data ? [data.data] : []}
                columns={columns}
                loading={isFetching}
                disableRowSelectionOnClick
                disableColumnSelector
                sx={{
                    "& .MuiDataGrid-cell:focus": { outline: "none" },
                }}
                getRowId={(row) => row.id}
                pageSizeOptions={[5, 10, 20]}
            />
        </div>
    );
}
