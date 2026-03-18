import { useDashboard } from "../service/useDashboard";

interface StatCardProps {
  label: string;
  value: number | string;
  className?: string;
}


const Dashboard = () => {
  const { data } = useDashboard();
  const dashboardData = data?.data ?? {
    totalUsers: 0,
    activeDevices: 0,
    todayGranted: 0,
    todayDenied: 0,
    recentLogs: [],
  };


  function StatCard({ label, value, className }: StatCardProps) {
    return (
      <div className={`p-4 rounded-lg shadow bg-white ${className || ""}`}>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-sm text-black font-bold">{label}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Users" value={dashboardData.totalUsers ?? 0} className="text-black bg-secondary!" />
        <StatCard label="Active Devices" value={dashboardData.activeDevices ?? 0} className="text-black bg-[#e67e22]!" />
        <StatCard label="Today Granted" value={dashboardData.todayGranted ?? 0} className="text-black bg-[#9b59b6]!" />
        <StatCard label="Today Denied" value={dashboardData.todayDenied ?? 0} className="text-black bg-[#fbc531]!" />
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-5 top-0 bottom-0 w-1 bg-gray-200 rounded" />

          <div className="flex flex-col gap-6">
            {dashboardData?.recentLogs.map((log) => (
              <div key={log.id} className="relative flex items-start">
                {/* Dot */}
                <div className="absolute left-3 top-2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />

                {/* Card */}
                <div className="ml-8 flex-1 bg-linear-to-r from-white to-gray-50 p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">{log.name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>ID: {log.user_id}</span>
                    <span>SN: {log.sn}</span>
                  </div>

                  <div className="mt-2">
                    <span className={`px-2 py-1 text-xs rounded-md uppercase tracking-wide ${log.palm_type === "left"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-green-100 text-green-700"
                      }`}>
                      {log.palm_type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


    </div>
  )
}

export default Dashboard