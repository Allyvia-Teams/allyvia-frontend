import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography, IconButton, Chip, Tooltip, Popover } from '@mui/material';
import { ChevronLeft, ChevronRight, Refresh as RefreshIcon } from '@mui/icons-material';
import MainCard from 'ui-component/cards/MainCard';
import TimesheetSelector from './TimesheetSelector';
import { useSelector, useDispatch } from 'store';
import { EmployeeListItem } from 'types/employee';
import { formatDate as formatDateUtil } from 'utils/dateUtils';
import { TimeEntry } from 'api/employee.api';
import { fetchAllEmployeesTimeEntries, fetchEmployeeTimeEntries, fetchTimeEntries, clearTimeTrackingError } from 'store/slices/employee';
import { employeeAPI } from 'api/employee.api';
import useAuth from 'hooks/useAuth';

interface TimesheetCalendarProps {
  isAdmin: boolean;
  refreshTrigger?: number;
}

type ViewMode = 'month' | 'week';

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfMonth = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return d;
};

export default function TimesheetCalendar({ isAdmin, refreshTrigger }: TimesheetCalendarProps) {
  const dispatch = useDispatch();
  const { allEmployees, loading: employeesLoading, timeTracking } = useSelector((state) => state.employee);
  const { user } = useAuth();
  const companyId = useSelector((state) => state.auth.currentRole?.company_id as string | undefined);
  const kioskIsAuthenticated = useSelector((state) => state.kiosk.isAuthenticated);
  const kioskDisplayName = useSelector((state) => state.kiosk.displayName as string | null);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursorDate, setCursorDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [localEmployeeNames, setLocalEmployeeNames] = useState<Record<string, string>>({});
  const [kioskNameOverrides, setKioskNameOverrides] = useState<Record<string, string>>({});

  const { timeEntries, loading, error } = timeTracking;

  const employeeById = useMemo(() => {
    const map: Record<string, EmployeeListItem> = {};
    allEmployees.forEach((emp) => {
      map[emp.id] = emp;
    });
    return map;
  }, [allEmployees]);

  // Fetch missing employee names by ID when time entries reference unknown employees
  useEffect(() => {
    if (!companyId) return;
    const uniqueIds = Array.from(new Set(timeTracking.timeEntries.map((e) => e.employee)));
    const missingIds = uniqueIds.filter((id) => !employeeById[id] && !localEmployeeNames[id]);
    if (missingIds.length === 0) return;

    const fetchNames = async () => {
      try {
        const results = await Promise.all(
          missingIds.map(async (id) => {
            try {
              const emp = await employeeAPI.getEmployee(id, companyId);
              return [id, emp.full_name] as const;
            } catch (err) {
              return [id, 'Unknown'] as const;
            }
          })
        );
        setLocalEmployeeNames((prev) => {
          const next = { ...prev } as Record<string, string>;
          results.forEach(([id, name]) => {
            if (!next[id]) next[id] = name;
          });
          return next;
        });
      } catch (e) {
        // noop
      }
    };

    fetchNames();
  }, [companyId, timeTracking.timeEntries, employeeById, localEmployeeNames]);

  // Load kiosk display_name overrides from localStorage so admin views can show kiosk-set names
  useEffect(() => {
    try {
      const raw = localStorage.getItem('kioskNameOverrides');
      const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      setKioskNameOverrides(parsed || {});
    } catch {}
  }, [kioskIsAuthenticated, kioskDisplayName]);

  // Additionally, for member view, look up employee by current user's email to get saved full name
  useEffect(() => {
    if (isAdmin) return;
    if (!companyId || !user?.email) return;

    const fetchByEmail = async () => {
      try {
        const list = await employeeAPI.getEmployees(companyId, user.email);
        if (Array.isArray(list) && list.length) {
          setLocalEmployeeNames((prev) => {
            const next = { ...prev } as Record<string, string>;
            list.forEach((emp) => {
              next[emp.id] = emp.full_name;
            });
            return next;
          });
        }
      } catch (_) {
        // ignore
      }
    };

    fetchByEmail();
  }, [isAdmin, companyId, user?.email]);

  const getEntryDisplayName = (entry: TimeEntry): string => {
    if (isAdmin) {
      if (selectedEmployee && selectedEmployee.id !== 'all') {
        return selectedEmployee.full_name;
      }
      return (
        kioskNameOverrides[entry.employee] || employeeById[entry.employee]?.full_name || localEmployeeNames[entry.employee] || 'Unknown'
      );
    }
    // Member view: prefer kiosk display name when kiosk session is active
    if (kioskIsAuthenticated && kioskDisplayName) {
      return kioskDisplayName;
    }
    // Otherwise show the logged-in user's name (avoid company name strings)
    const userName = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.first_name || user?.last_name;
    return userName || user?.email || 'You';
  };

  // Default admin selection to "All"
  useEffect(() => {
    if (isAdmin && allEmployees.length > 0 && !selectedEmployee) {
      const allOption: EmployeeListItem = {
        id: 'all',
        first_name: 'All',
        last_name: 'Employees',
        full_name: 'All Employees',
        email: 'all@employees.com',
        status: 'active',
        is_active: true
      };
      setSelectedEmployee(allOption);
    }
  }, [isAdmin, allEmployees, selectedEmployee]);

  const range = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(cursorDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const start = startOfMonth(cursorDate);
    const end = endOfMonth(cursorDate);
    return { start, end };
  }, [viewMode, cursorDate]);

  const fetchRange = useCallback(() => {
    dispatch(clearTimeTrackingError());
    const start = formatDateUtil(range.start, 'YYYY-MM-DD');
    const end = formatDateUtil(range.end, 'YYYY-MM-DD');

    if (isAdmin && selectedEmployee) {
      if (selectedEmployee.id === 'all') {
        dispatch(fetchAllEmployeesTimeEntries({ start, end }));
      } else {
        dispatch(fetchEmployeeTimeEntries({ employee_id: selectedEmployee.id, start, end }));
      }
    } else {
      dispatch(fetchTimeEntries({ start, end }));
    }
  }, [dispatch, isAdmin, selectedEmployee, range.start, range.end]);

  useEffect(() => {
    fetchRange();
  }, [fetchRange]);

  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchRange();
    }
  }, [refreshTrigger, fetchRange]);

  // Build calendar slots
  const daysGrid = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(cursorDate);
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }

    const start = startOfWeek(startOfMonth(cursorDate));
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [viewMode, cursorDate]);

  const entriesByDay = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    timeEntries.forEach((e) => {
      const key = formatDateUtil(e.clock_in, 'YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [timeEntries]);

  // Debug: log how names are resolved for calendar chips
  useEffect(() => {
    try {
      const sample = timeEntries.slice(0, 10).map((e) => ({
        id: e.id,
        employee: e.employee,
        label: getEntryDisplayName(e)
      }));
      console.log('[CAL] entries sample', sample, {
        isAdmin,
        selectedEmployeeId: selectedEmployee?.id,
        user: { email: user?.email, first_name: user?.first_name, last_name: user?.last_name },
        kiosk: { isAuthenticated: kioskIsAuthenticated, displayName: kioskDisplayName }
      });
    } catch {}
  }, [
    timeEntries,
    employeeById,
    localEmployeeNames,
    isAdmin,
    selectedEmployee,
    user?.email,
    user?.first_name,
    user?.last_name,
    kioskIsAuthenticated,
    kioskDisplayName
  ]);

  const goPrev = () => {
    const d = new Date(cursorDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCursorDate(d);
  };

  const goNext = () => {
    const d = new Date(cursorDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCursorDate(d);
  };

  const goToday = () => setCursorDate(new Date());

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric' });
  const monthLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleEntryClick = (entry: TimeEntry, target: HTMLElement) => {
    setActiveEntry(entry);
    setPopoverAnchor(target);
  };

  const closePopover = () => {
    setPopoverAnchor(null);
    setActiveEntry(null);
  };

  const renderEntry = (e: TimeEntry) => {
    const inTime = e.clock_in ? formatDateUtil(e.clock_in, 'time') : '—';
    const outTime = e.clock_out ? formatDateUtil(e.clock_out, 'time') : '—';
    const nameLabel = getEntryDisplayName(e);
    return (
      <Tooltip key={e.id} title={e.note || ''} placement="top">
        <Chip
          size="small"
          label={nameLabel}
          sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
          onClick={(evt) => handleEntryClick(e, evt.currentTarget)}
          variant="filled"
        />
      </Tooltip>
    );
  };

  return (
    <MainCard
      title={
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton onClick={goPrev} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography variant="h3" fontWeight={700} onClick={goToday} sx={{ cursor: 'pointer' }}>
              {monthLabel(cursorDate)}
            </Typography>
            <IconButton onClick={goNext} size="small">
              <ChevronRight />
            </IconButton>
            <IconButton onClick={fetchRange} size="small" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Stack>

          <Stack direction="row" alignItems="center" gap={2}>
            {/* View toggle kept minimal – default Month */}
            {/* Employee selector for admins */}
            {isAdmin && (
              <Box sx={{ minWidth: 220 }}>
                <TimesheetSelector
                  employees={(() => {
                    // Build a merged selector list that includes unknown employees referenced by time entries
                    const seen = new Set<string>();
                    const merged: EmployeeListItem[] = [];
                    for (const e of allEmployees) {
                      if (!seen.has(e.id)) {
                        seen.add(e.id);
                        merged.push(e);
                      }
                    }
                    const unknownIds = Array.from(new Set(timeEntries.map((t) => t.employee))).filter((id) => !seen.has(id));
                    for (const id of unknownIds) {
                      const full = employeeById[id]?.full_name || localEmployeeNames[id] || 'Unknown';
                      const [first, ...rest] = full.split(' ');
                      const last = rest.join(' ');
                      merged.push({
                        id,
                        first_name: first || 'Unknown',
                        last_name: last || '',
                        full_name: full,
                        email: '',
                        status: 'active',
                        is_active: true
                      });
                    }
                    return merged;
                  })()}
                  selectedEmployee={selectedEmployee}
                  onEmployeeChange={setSelectedEmployee}
                  loading={employeesLoading}
                />
              </Box>
            )}
          </Stack>
        </Stack>
      }
      sx={{ borderRadius: 3 }}
    >
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Calendar grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Box key={d} sx={{ px: 1, py: 0.5, fontWeight: 600, color: 'text.secondary' }}>
            {d}
          </Box>
        ))}

        {daysGrid.map((d, idx) => {
          const ymd = formatDateUtil(d, 'YYYY-MM-DD');
          const isCurMonth = d.getMonth() === cursorDate.getMonth();
          const today = isSameDay(d, new Date());
          const entries = entriesByDay[ymd] || [];
          return (
            <Box
              key={`${ymd}-${idx}`}
              sx={{
                border: '1px solid',
                borderColor: today ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 1,
                minHeight: 96,
                bgcolor: isCurMonth ? 'background.paper' : 'grey.50'
              }}
            >
              <Typography variant="subtitle2" color={today ? 'primary.main' : 'text.secondary'} sx={{ mb: 0.5 }}>
                {dayLabel(d)}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>{entries.map((e) => renderEntry(e))}</Box>
            </Box>
          );
        })}
      </Box>
      <Popover
        open={Boolean(popoverAnchor) && Boolean(activeEntry)}
        anchorEl={popoverAnchor}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, maxWidth: 260 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {activeEntry ? getEntryDisplayName(activeEntry) : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeEntry
              ? `${formatDateUtil(activeEntry.clock_in, 'time')} - ${activeEntry.clock_out ? formatDateUtil(activeEntry.clock_out, 'time') : '—'}`
              : ''}
          </Typography>
        </Box>
      </Popover>
    </MainCard>
  );
}
