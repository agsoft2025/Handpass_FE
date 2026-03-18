
import { useReportsPolling } from "../service/useReport";
import type { ReportPayload } from "../types/reportTypes";
import ReportsForm from "../components/reports/ReportsForm";
import { DataGrid } from "@mui/x-data-grid";
import { useMemo, useState } from "react";

const columns = [
  { field: "sn", headerName: "Serial Number", flex: 1 },
  { field: "name", headerName: "Name", flex: 1 },
  { field: "user_id", headerName: "User ID", flex: 1 },
  { field: "palm_type", headerName: "Palm Type", flex: 1 },
  { field: "device_date_time", headerName: "Device Time", flex: 1 },
  { field: "created_at", headerName: "Created At", flex: 1 },
];

const Reports = () => {

  const [filters, setFilters] = useState<ReportPayload | null>(null);

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const pollingFilter = useMemo(() => {
    if (!filters) return undefined;

    return {
      ...filters,
      format: "json",
      name: filters.name?.name ?? null,
    } as ReportPayload;
  }, [filters]);


  const { data: reportsData, isFetching } = useReportsPolling(pollingFilter ?? undefined);

  const rows = reportsData?.data?.map((item, index) => ({
    id: item.id || index,  // DataGrid requires id
    sn: item.sn,
    name: item.name,
    user_id: item.user_id,
    palm_type: item.palm_type,
    device_date_time: item.device_date_time,
    created_at: item.created_at,
  })) || [];

  return (
    <div>
      <h1 className='text-primary font-extrabold text-4xl mb-2'>System Reports</h1>
      <p>Detailed logs of access attempts and enrollments.</p>

      <ReportsForm onFilterChange={setFilters} />

      <div style={{ height: 500, width: "100%" }}>
        <h1 className="text-primary text-2xl font-bold mb-2">Reports</h1>
        <DataGrid
          rows={rows}
          columns={columns}
          pagination
          paginationMode="server"
          rowCount={reportsData?.totalCount || 0}
          paginationModel={{ page, pageSize: limit }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setLimit(model.pageSize);
          }}
          pageSizeOptions={[5, 10, 20]}
          loading={isFetching}
          disableRowSelectionOnClick
          disableColumnSelector
          sx={{
            "& .MuiDataGrid-cell:focus": { outline: "none" },
          }}
        />
      </div>

    </div>
  );
};

export default Reports;
