import { MonitorSmartphone, Globe, Cpu, Pencil, Trash } from "lucide-react";
import type { Device } from "../../types/deviceTypes";

interface DeviceCardProps {
  device: Device;
  onEdit?: (device: Device) => void;
  onDelete?: (device: Device) => void;
}

export function DeviceCard({ device, onEdit, onDelete }: DeviceCardProps) {
  const isOnline = device.online_status === 1;

  return (
    <div className="bg-white border border-primary rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-transform p-5 flex flex-col gap-4">

      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <MonitorSmartphone size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">
              {device.device_name || "Unnamed Device"}
            </h2>
            <p className="text-xs text-gray-500">SN: {device.sn}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Status Chip */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isOnline
              ? "bg-green-100 text-green-600"
              : "bg-gray-200 text-gray-700"
              }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
            />
            {isOnline ? "Online" : "Offline"}
          </span>

          <div className="flex items-center gap-2">
            {/* Edit Button */}
            <button
              onClick={() => onEdit?.(device)}
              className="p-1 rounded hover:bg-gray-100 transition"
            >
              <Pencil size={16} className="text-primary" />
            </button>
            {/* Delete Button */}
            <button
              onClick={() => onDelete?.(device)}
              className="p-1 rounded hover:bg-gray-100 transition"
            >
              <Trash size={16} className="text-red-600" />
            </button>

          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-gray-500" />
          <span className="font-medium">IP:</span>
          <span className="text-gray-700">{device.device_ip}</span>
        </div>

        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-gray-500" />
          <span className="font-medium">Firmware:</span>
          <span className="text-gray-700">{device.firmware_version}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 flex-wrap text-xs mt-1">
        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">
          Created: {new Date(device.created_at).toLocaleDateString()}
        </span>
        <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">
          Updated: {new Date(device.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
