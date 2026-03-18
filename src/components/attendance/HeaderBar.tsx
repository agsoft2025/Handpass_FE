import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Users,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useUsers } from "../../service/useUsers";
import type { User, AllUsersType } from "./types";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface HeaderBarProps {
  selectedUserId: string | AllUsersType;
  onChangeUser: (id: string) => void;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  lateAfter: string;
  currentMonth: Date;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  todayLabel: string;
}

export function HeaderBar({
  selectedUserId,
  onChangeUser,
  shiftName,
  shiftStart,
  shiftEnd,
  graceMinutes,
  lateAfter,
  currentMonth,
  onPrev,
  onToday,
  onNext,
  todayLabel,
}: HeaderBarProps) {
  // Search state for API
  const [searchQuery, setSearchQuery] = useState("");

  // Debounced search query (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch users from API with debounced search
  const { data: usersData, isLoading } = useUsers(1, 100, debouncedSearchQuery);
  
  // Transform API response to our User format with unique IDs
  const users: User[] = useMemo(() => {
    if (!usersData?.data) return [];
    return usersData.data.map((user: any, index) => ({
      id: user.user_id || user.id || `user-${index}`, // Ensure unique ID
      name: user.name,
    }));
  }, [usersData]);

  // Add "All Users" option
  const allUsersOption: User[] = useMemo(() => [
    { id: "ALL", name: "All Users" },
    ...users,
  ], [users]);

  const selectedUser = useMemo(() => {
    return allUsersOption.find((u) => u.id === selectedUserId) || null;
  }, [selectedUserId, allUsersOption]);

  const selectedUserName = useMemo(() => {
    return selectedUser?.name || "User";
  }, [selectedUser]);

  const handleUserChange = (_event: any, newValue: User | null) => {
    if (newValue) {
      onChangeUser(newValue.id);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value); // Update search query for API
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl">
      <div className="p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Section - Title and Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm border border-white/30">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">Attendance Calendar</h1>
                <p className="text-sm text-white/80 mt-0.5">Track and manage employee attendance</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-white/90">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/70">User:</span>
                <span className="font-semibold text-white bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm border border-white/30">
                  {selectedUserName}
                </span>
                <span className="text-white/70">•</span>
                <span className="text-white/70">Shift:</span>
                <span className="font-semibold text-black bg-gradient-to-r from-yellow-200 to-orange-200 text-orange-900 px-2 py-1 rounded-full">
                  {shiftName}
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/70">Hours:</span>
                <span className="font-mono text-white bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm border border-white/30">
                  {shiftStart}–{shiftEnd}
                </span>
                <span className="text-white/70">•</span>
                <span className="text-white/70">Grace:</span>
                <span className="font-semibold text-black bg-gradient-to-r from-emerald-200 to-teal-200 text-emerald-900 px-2 py-1 rounded-full">
                  {graceMinutes} min
                </span>
                <span className="text-white/70">•</span>
                <span className="text-white/70">Late after:</span>
                <span className="font-semibold text-yellow-300 bg-gradient-to-r from-amber-300 to-orange-300 text-amber-900 px-2 py-1 rounded-full">
                  {lateAfter}
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/70">Month:</span>
                <span className="font-semibold text-white bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm border border-white/30">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <span className="text-white/70">•</span>
                <span className="text-white/70">Demo time:</span>
                <span className="font-mono text-xs text-emerald-300 bg-emerald-900/30 px-2 py-1 rounded-full backdrop-blur-sm border border-emerald-400/30">
                  {todayLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section - Controls */}
          <div className="flex flex-col gap-3 lg:items-end">
            {/* User Selector with MUI Autocomplete */}
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/20 px-4 py-2.5 mb-4 backdrop-blur-sm">
                <Users className="h-4 w-4 text-white/90" />
                <Autocomplete
                  options={allUsersOption}
                  getOptionLabel={(option: User) => option.name}
                  value={selectedUser}
                  onChange={handleUserChange}
                  loading={isLoading}
                  loadingText="Loading users..."
                  noOptionsText="No users found"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search users..."
                      variant="standard"
                      onChange={(e) => handleSearchChange(e.target.value)}
                      InputProps={{
                        ...params.InputProps,
                        className: "text-white placeholder-white/60",
                        style: {
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600,
                        }
                      }}
                      sx={{
                        '& .MuiInputBase-root': {
                          '&::before': {
                            borderBottom: 'none',
                            },
                          '&::after': {
                            borderBottom: 'none',
                            },
                        },
                        '& .MuiInput-input': {
                          color: 'white',
                          '&::placeholder': {
                            color: 'rgba(255, 255, 255, 0.6)',
                            opacity: 1,
                          },
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                      }}
                    />
                  )}
                  sx={{
                    width: 200,
                    '& .MuiAutocomplete-option': {
                      color: '#1e293b',
                      backgroundColor: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: 'rgba(99, 102, 241, 0.16)',
                      },
                    },
                    '& .MuiAutocomplete-listbox': {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '12px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    },
                    '& .MuiPaper-root': {
                      backgroundColor: 'transparent',
                    },
                  }}
                />
              </div>

            {/* Navigation Controls */}
            <div className="flex gap-2">
              <button
                className="group rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-sm font-semibold transition-all hover:bg-white/30 hover:scale-105 active:scale-95 backdrop-blur-sm"
                onClick={onPrev}
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="group rounded-xl border border-white/30 bg-white/20 px-4 py-2 text-sm font-semibold transition-all hover:bg-white/30 hover:scale-105 active:scale-95 backdrop-blur-sm"
                onClick={onToday}
                title="Go to Today"
              >
                <Home className="h-4 w-4 mr-1.5 inline" />
                Today
              </button>
              <button
                className="group rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-sm font-semibold transition-all hover:bg-white/30 hover:scale-105 active:scale-95 backdrop-blur-sm"
                onClick={onNext}
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
