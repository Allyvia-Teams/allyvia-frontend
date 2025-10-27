import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  FormControlLabel,
  Switch,
  MenuItem
} from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { ChevronLeft, ChevronRight, Refresh as RefreshIcon } from '@mui/icons-material';
import MainCard from 'ui-component/cards/MainCard';
import TimesheetSelector from './TimesheetSelector';
import { useSelector, useDispatch } from 'store';
import { EmployeeListItem } from 'types/employee';
import { formatDate as formatDateUtil } from 'utils/dateUtils';
import { TimeEntry, Shift, getShifts, createShift, deleteShift } from 'api/employee.api';
import {
  fetchAllEmployeesTimeEntries,
  fetchEmployeeTimeEntries,
  fetchTimeEntries,
  clearTimeTrackingError,
  deleteTimeEntryAsync
} from 'store/slices/employee';
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
  const kioskEmail = useSelector((state) => state.kiosk.email as string | null);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursorDate, setCursorDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [creatingForDay, setCreatingForDay] = useState<Date | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignAllDay, setAssignAllDay] = useState(true);
  const [assignEmployeeId, setAssignEmployeeId] = useState<string | null>(null);
  const [assignDateYmd, setAssignDateYmd] = useState<string>('');
  const [startHour, setStartHour] = useState<string>('09');
  const [startMinute, setStartMinute] = useState<string>('00');
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [endHour, setEndHour] = useState<string>('05');
  const [endMinute, setEndMinute] = useState<string>('00');
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('PM');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  // Calendar-like time editor states
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  const [editingStartHour, setEditingStartHour] = useState(false);
  const [editingStartMinute, setEditingStartMinute] = useState(false);
  const [startHourInput, setStartHourInput] = useState('');
  const [startMinuteInput, setStartMinuteInput] = useState('');
  const [startHourError, setStartHourError] = useState('');
  const [startMinuteError, setStartMinuteError] = useState('');
  const [editingEndHour, setEditingEndHour] = useState(false);
  const [editingEndMinute, setEditingEndMinute] = useState(false);
  const [endHourInput, setEndHourInput] = useState('');
  const [endMinuteInput, setEndMinuteInput] = useState('');
  const [endHourError, setEndHourError] = useState('');
  const [endMinuteError, setEndMinuteError] = useState('');
  const [localEmployeeNames, setLocalEmployeeNames] = useState<Record<string, string>>({});
  const [localEmployeeEmails, setLocalEmployeeEmails] = useState<Record<string, string>>({});
  const [kioskNameOverrides, setKioskNameOverrides] = useState<Record<string, string>>({});
  const [kioskNameByEmail, setKioskNameByEmail] = useState<Record<string, string>>({});

  const { timeEntries, loading, error } = timeTracking;

  const employeeById = useMemo(() => {
    const map: Record<string, EmployeeListItem> = {};
    allEmployees.forEach((emp) => {
      map[emp.id] = emp;
    });
    return map;
  }, [allEmployees]);

  // Fetch missing employee names/emails by ID when time entries reference unknown employees
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
              return [id, emp.full_name, emp.email || ''] as const;
            } catch (err) {
              return [id, 'Unknown', ''] as const;
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
        setLocalEmployeeEmails((prev) => {
          const next = { ...prev } as Record<string, string>;
          results.forEach(([id, _name, email]) => {
            if (email && !next[id]) next[id] = email;
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
      const raw2 = localStorage.getItem('kioskNameByEmail');
      const parsed2 = raw2 ? (JSON.parse(raw2) as Record<string, string>) : {};
      setKioskNameByEmail(parsed2 || {});
    } catch {}
  }, [kioskIsAuthenticated, kioskDisplayName, kioskEmail]);

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
    // Prefer server-sent identity to avoid mismatch across contexts
    const serverFull = (entry as any).employee_full_name as string | undefined;
    const serverEmail = (entry as any).employee_email as string | undefined;
    if (serverFull) {
      try {
        console.log('[CAL][label][server]', { employee: entry.employee, serverFull, serverEmail });
      } catch {}
      return serverFull;
    }
    if (isAdmin) {
      if (selectedEmployee && selectedEmployee.id !== 'all') {
        try {
          console.log('[CAL][label][admin] fixed-selected', {
            employee: entry.employee,
            selectedEmployeeId: selectedEmployee.id,
            label: selectedEmployee.full_name
          });
        } catch {}
        return selectedEmployee.full_name;
      }
      const byId = kioskNameOverrides[entry.employee];
      const emailForEntry = (employeeById[entry.employee]?.email || localEmployeeEmails[entry.employee] || serverEmail || '').toLowerCase();
      const byEmail = emailForEntry ? kioskNameByEmail[emailForEntry] : undefined;
      const empFull = employeeById[entry.employee]?.full_name;
      const local = localEmployeeNames[entry.employee];
      const label = byId || byEmail || empFull || local || serverFull || 'Unknown';
      try {
        console.log('[CAL][label][admin]', {
          employee: entry.employee,
          label,
          sources: {
            byId,
            byEmail,
            empFull,
            local,
            emailForEntry
          }
        });
      } catch {}
      return label;
    }
    // Member view: prefer kiosk display name when kiosk session is active
    if (kioskIsAuthenticated && kioskDisplayName) {
      try {
        console.log('[CAL][label][member] kioskDisplayName', {
          employee: entry.employee,
          label: kioskDisplayName
        });
      } catch {}
      return kioskDisplayName;
    }
    // Otherwise show the logged-in user's name (avoid company name strings)
    const userName = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.first_name || user?.last_name;
    const fallback = userName || user?.email || 'You';
    try {
      console.log('[CAL][label][member] userName', {
        employee: entry.employee,
        label: fallback
      });
    } catch {}
    return fallback;
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
    // Fetch planned shifts in the same range
    (async () => {
      try {
        const res = await getShifts({
          start,
          end,
          employee_id: isAdmin && selectedEmployee && selectedEmployee.id !== 'all' ? selectedEmployee.id : undefined,
          me: !isAdmin
        });
        setShifts(res.data);
      } catch (e) {
        // ignore
      }
    })();
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

  const shiftsByDay = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    shifts.forEach((s) => {
      const key = formatDateUtil(s.start, 'YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [shifts]);

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
        kiosk: { isAuthenticated: kioskIsAuthenticated, displayName: kioskDisplayName, email: kioskEmail },
        overrides: { byId: kioskNameOverrides, byEmail: kioskNameByEmail }
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
    kioskDisplayName,
    kioskEmail,
    kioskNameOverrides,
    kioskNameByEmail
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
    setActiveShift(null);
  };

  const onDeleteActive = async () => {
    if (!activeEntry) return;
    try {
      await dispatch(deleteTimeEntryAsync(activeEntry.id) as any);
      closePopover();
      // Refresh range to keep admin and kiosk calendars in sync
      fetchRange();
    } catch {}
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
          onClick={(evt) => {
            evt.stopPropagation();
            handleEntryClick(e, evt.currentTarget);
          }}
          variant="filled"
        />
      </Tooltip>
    );
  };

  const renderShift = (s: Shift) => {
    const label = s.employee_full_name || employeeById[s.employee]?.full_name || localEmployeeNames[s.employee] || 'Shift';
    const time = `${formatDateUtil(s.start, 'time')}–${formatDateUtil(s.end, 'time')}`;
    return (
      <Tooltip key={`shift-${s.id}`} title={s.note || time} placement="top">
        <Chip
          size="small"
          color="info"
          variant="outlined"
          label={`${label}`}
          sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
          onClick={(evt) => {
            evt.stopPropagation();
            // inline openEditShift
            const start = new Date(s.start);
            const end = new Date(s.end);
            const pad = (n: number) => String(n).padStart(2, '0');
            const to12 = (h24: number): { h: string; ampm: 'AM' | 'PM' } => {
              const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
              let h12 = h24 % 12;
              if (h12 === 0) h12 = 12;
              return { h: pad(h12), ampm };
            };
            const st = to12(start.getHours());
            const en = to12(end.getHours());
            setAssignDateYmd(formatDateUtil(start, 'YYYY-MM-DD'));
            setStartHour(st.h);
            setStartMinute(pad(start.getMinutes()));
            setStartAmPm(st.ampm);
            setEndHour(en.h);
            setEndMinute(pad(end.getMinutes()));
            setEndAmPm(en.ampm);
            const isAllDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() >= 58;
            setAssignAllDay(isAllDay);
            setAssignEmployeeId(s.employee);
            setEditShift(s);
            setAssignOpen(true);
          }}
        />
      </Tooltip>
    );
  };

  const openAssignForDate = (d: Date) => {
    if (!isAdmin) return;
    const ymd = formatDateUtil(d, 'YYYY-MM-DD');
    setAssignAllDay(false);
    setAssignDateYmd(ymd);
    setStartHour('09');
    setStartMinute('00');
    setStartAmPm('AM');
    setEndHour('05');
    setEndMinute('00');
    setEndAmPm('PM');
    setAssignEmployeeId(selectedEmployee && selectedEmployee.id !== 'all' ? selectedEmployee.id : allEmployees[0]?.id || null);
    setEditShift(null);
    setAssignOpen(true);
  };

  const submitAssign = async () => {
    if (!assignEmployeeId) return;
    const to24h = (h12: string, min: string, ampm: 'AM' | 'PM') => {
      let h = parseInt(h12, 10) % 12;
      if (ampm === 'PM') h += 12;
      const hh = String(h).padStart(2, '0');
      return `${hh}:${min}:00`;
    };
    const base = assignDateYmd || formatDateUtil(new Date(), 'YYYY-MM-DD');
    const startISO = assignAllDay ? `${base}T00:00:00` : `${base}T${to24h(startHour, startMinute, startAmPm)}`;
    const endISO = assignAllDay ? `${base}T23:59:00` : `${base}T${to24h(endHour, endMinute, endAmPm)}`;
    try {
      if (editShift) {
        // simplest approach: delete + recreate; backend doesn't have PUT; OK for now
        await deleteShift(editShift.id);
        const resp = await createShift({ employee: assignEmployeeId, start: startISO, end: endISO });
        setShifts((prev) => [...prev.filter((x) => x.id !== editShift.id), resp.data]);
        setEditShift(null);
      } else {
        const resp = await createShift({ employee: assignEmployeeId, start: startISO, end: endISO });
        setShifts((prev) => [...prev, resp.data]);
      }
      setAssignOpen(false);
    } catch (e) {}
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
              onClick={() => openAssignForDate(d)}
            >
              <Typography variant="subtitle2" color={today ? 'primary.main' : 'text.secondary'} sx={{ mb: 0.5 }}>
                {dayLabel(d)}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>{(shiftsByDay[ymd] || []).map((s) => renderShift(s))}</Box>
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
          {activeEntry && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {getEntryDisplayName(activeEntry)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {`${formatDateUtil(activeEntry.clock_in, 'time')} - ${activeEntry.clock_out ? formatDateUtil(activeEntry.clock_out, 'time') : '—'}`}
              </Typography>
              {/* Admin deletion for time entries is disabled here to keep destructive actions inside dedicated dialogs */}
            </>
          )}
        </Box>
      </Popover>

      {/* Assign Shift Dialog (Admin) */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editShift ? 'Edit Shift' : 'Assign Shift'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ mt: 1 }}>
            <Autocomplete
              options={allEmployees}
              getOptionLabel={(opt) => opt.full_name}
              value={allEmployees.find((e) => e.id === assignEmployeeId) || null}
              onChange={(_, val) => setAssignEmployeeId(val?.id || null)}
              renderInput={(params) => <TextField {...params} label="Employee" />}
            />
          </Box>
          {!assignAllDay && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                value={`${startHour}:${startMinute} ${startAmPm} - ${endHour}:${endMinute} ${endAmPm}`}
                InputProps={{ readOnly: true, sx: { fontSize: 22, color: 'primary.main', py: 1.5 } }}
                helperText="Click to select start and end time"
                onClick={() => setTimePickerOpen(true)}
              />
            </Box>
          )}
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Switch checked={assignAllDay} onChange={(_, v) => setAssignAllDay(v)} />}
            label="All Day Shift"
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          {editShift ? (
            <Button
              color="error"
              onClick={async () => {
                try {
                  if (!editShift) return;
                  await deleteShift(editShift.id);
                  setShifts((prev) => prev.filter((x) => x.id !== editShift.id));
                  setAssignOpen(false);
                  setEditShift(null);
                } catch {}
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Box>
            <Button onClick={() => setAssignOpen(false)} sx={{ mr: 1 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={submitAssign} disabled={!assignEmployeeId}>
              {editShift ? 'Save' : 'Add Shift'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Time Picker Dialog matching Calendar style */}
      <Dialog open={timePickerOpen} onClose={() => setTimePickerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ textAlign: 'center', pb: 1, color: 'text.secondary' }}>SELECT TIME</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Start Time */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                Start Time
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Box
                  sx={{
                    width: 100,
                    height: 72,
                    backgroundColor: activeField === 'start' ? 'primary.light' : 'grey.100',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: activeField === 'start' ? 'primary.main' : 'text.primary',
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: editingStartHour ? 2 : 0,
                    borderColor: 'primary.main'
                  }}
                  onClick={() => {
                    setActiveField('start');
                    setEditingStartHour(true);
                    setEditingStartMinute(false);
                  }}
                >
                  {editingStartHour ? (
                    <input
                      type="text"
                      value={startHourInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setStartHourInput(value);
                        setStartHourError('');
                        if (value) {
                          const h = parseInt(value, 10);
                          if (h >= 1 && h <= 12) setStartHour(String(h).padStart(2, '0'));
                          else {
                            setStartHourError('Hour 1-12');
                          }
                        }
                      }}
                      onFocus={() => {
                        setStartHourInput(String(parseInt(startHour, 10)));
                        setStartHourError('');
                      }}
                      onBlur={() => {
                        setEditingStartHour(false);
                        setStartHourInput('');
                        setStartHourError('');
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none'
                      }}
                      autoFocus
                    />
                  ) : (
                    startHour
                  )}
                </Box>
                <Typography variant="h3">:</Typography>
                <Box
                  sx={{
                    width: 100,
                    height: 72,
                    backgroundColor: activeField === 'start' ? 'primary.light' : 'grey.100',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: activeField === 'start' ? 'primary.main' : 'text.primary',
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: editingStartMinute ? 2 : 0,
                    borderColor: 'primary.main'
                  }}
                  onClick={() => {
                    setActiveField('start');
                    setEditingStartMinute(true);
                    setEditingStartHour(false);
                  }}
                >
                  {editingStartMinute ? (
                    <input
                      type="text"
                      value={startMinuteInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setStartMinuteInput(value);
                        setStartMinuteError('');
                        if (value || value === '0') {
                          const m = parseInt(value || '0', 10);
                          if (m >= 0 && m <= 59) setStartMinute(String(m).padStart(2, '0'));
                          else setStartMinuteError('Minute 0-59');
                        }
                      }}
                      onFocus={() => {
                        setStartMinuteInput(String(parseInt(startMinute, 10)));
                        setStartMinuteError('');
                      }}
                      onBlur={() => {
                        setEditingStartMinute(false);
                        setStartMinuteInput('');
                        setStartMinuteError('');
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none'
                      }}
                      autoFocus
                    />
                  ) : (
                    startMinute
                  )}
                </Box>
                <ToggleButtonGroup exclusive value={startAmPm} onChange={(_, v) => v && setStartAmPm(v)} sx={{ ml: 2 }}>
                  <ToggleButton value="AM">AM</ToggleButton>
                  <ToggleButton value="PM">PM</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              {(startHourError || startMinuteError) && (
                <Typography color="error" variant="caption">
                  {startHourError || startMinuteError}
                </Typography>
              )}
            </Box>

            {/* End Time */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                End Time
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Box
                  sx={{
                    width: 100,
                    height: 72,
                    backgroundColor: activeField === 'end' ? 'primary.light' : 'grey.100',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: activeField === 'end' ? 'primary.main' : 'text.primary',
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: editingEndHour ? 2 : 0,
                    borderColor: 'primary.main'
                  }}
                  onClick={() => {
                    setActiveField('end');
                    setEditingEndHour(true);
                    setEditingEndMinute(false);
                  }}
                >
                  {editingEndHour ? (
                    <input
                      type="text"
                      value={endHourInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setEndHourInput(value);
                        setEndHourError('');
                        if (value) {
                          const h = parseInt(value, 10);
                          if (h >= 1 && h <= 12) setEndHour(String(h).padStart(2, '0'));
                          else setEndHourError('Hour 1-12');
                        }
                      }}
                      onFocus={() => {
                        setEndHourInput(String(parseInt(endHour, 10)));
                        setEndHourError('');
                      }}
                      onBlur={() => {
                        setEditingEndHour(false);
                        setEndHourInput('');
                        setEndHourError('');
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none'
                      }}
                      autoFocus
                    />
                  ) : (
                    endHour
                  )}
                </Box>
                <Typography variant="h3">:</Typography>
                <Box
                  sx={{
                    width: 100,
                    height: 72,
                    backgroundColor: activeField === 'end' ? 'primary.light' : 'grey.100',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: activeField === 'end' ? 'primary.main' : 'text.primary',
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: editingEndMinute ? 2 : 0,
                    borderColor: 'primary.main'
                  }}
                  onClick={() => {
                    setActiveField('end');
                    setEditingEndMinute(true);
                    setEditingEndHour(false);
                  }}
                >
                  {editingEndMinute ? (
                    <input
                      type="text"
                      value={endMinuteInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setEndMinuteInput(value);
                        setEndMinuteError('');
                        if (value || value === '0') {
                          const m = parseInt(value || '0', 10);
                          if (m >= 0 && m <= 59) setEndMinute(String(m).padStart(2, '0'));
                          else setEndMinuteError('Minute 0-59');
                        }
                      }}
                      onFocus={() => {
                        setEndMinuteInput(String(parseInt(endMinute, 10)));
                        setEndMinuteError('');
                      }}
                      onBlur={() => {
                        setEditingEndMinute(false);
                        setEndMinuteInput('');
                        setEndMinuteError('');
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none'
                      }}
                      autoFocus
                    />
                  ) : (
                    endMinute
                  )}
                </Box>
                <ToggleButtonGroup exclusive value={endAmPm} onChange={(_, v) => v && setEndAmPm(v)} sx={{ ml: 2 }}>
                  <ToggleButton value="AM">AM</ToggleButton>
                  <ToggleButton value="PM">PM</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              {(endHourError || endMinuteError) && (
                <Typography color="error" variant="caption">
                  {endHourError || endMinuteError}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimePickerOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setTimePickerOpen(false)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
}
