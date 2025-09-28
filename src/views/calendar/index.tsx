import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel as MuiFormControlLabel,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Event as EventIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Today as TodayIcon,
  Cake as CakeIcon,
  Work as WorkIcon,
  Home as HomeIcon,
  Group as GroupIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { COLORS } from '../../styles/colors';
import useAuth from 'hooks/useAuth';
import axiosServices from 'utils/axios';
import { enqueueSnackbar } from 'notistack';

// API configuration
const API_BASE_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api/v1';

// Event interface
interface Event {
  id: string; // Google event ID
  title: string;
  date: string;
  endDate?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  calendar: string;
  color: string;
  multiDay?: boolean;
  allDay?: boolean;
  description?: string;
}

// Always have local Allyvia calendar; add Google entry when connected
const initialCalendars: any[] = [
  {
    id: 'allyvia',
    name: 'Allyvia',
    color: COLORS.deepPurple500,
    icon: <HomeIcon />,
    checked: true
  }
];

// Mock data for calendar groups
const calendarGroups = [
  {
    id: 'my-day',
    name: 'My Day',
    icon: <EventIcon />,
    selected: true
  },
  {
    id: 'my-life',
    name: 'My life',
    icon: <EventIcon />,
    selected: false
  }
];

// No mock events; will be loaded from Google
const initialEvents: Event[] = [];

// ==============================|| CALENDAR PAGE ||============================== //

export default function CalendarPage() {
  const theme = useTheme();
  const { isLoggedIn, user } = useAuth();
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(['allyvia']);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [timeSelectorCallback, setTimeSelectorCallback] = useState<((time: string) => void) | null>(null);
  const [showAddCalendarDialog, setShowAddCalendarDialog] = useState(false);
  const [showManageCalendarsDialog, setShowManageCalendarsDialog] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<any>(null);
  const [mockCalendars, setMockCalendars] = useState(initialCalendars);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalLoading, setGcalLoading] = useState(false);
  const lastUpdatedIdRef = useRef<string | null>(null);

  // Toast helper matching requested API
  const toast = {
    show: (message: string, severity: 'error' | 'success' | 'info' | 'warning' = 'info') =>
      enqueueSnackbar(message, { variant: severity, autoHideDuration: 2000 })
  };

  const ensureGoogleCalendarInList = () => {
    setMockCalendars((prev: any[]) => {
      const exists = prev.some((c) => c.id === 'google');
      if (exists) return prev;
      return [
        ...prev,
        {
          id: 'google',
          name: 'Google Calendar',
          color: COLORS.brandBlue,
          icon: <EventIcon />,
          checked: true
        }
      ];
    });
    setSelectedCalendars((prev) => (prev.includes('google') ? prev : [...prev, 'google']));
  };

  const toIso = (d: Date) => d.toISOString();

  const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    // timeMin at 00:00:00Z and timeMax at end of day
    const timeMin = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0));
    const timeMax = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59));
    return { timeMin: toIso(timeMin), timeMax: toIso(timeMax) };
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const formatLocalDateYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const mapGoogleEvents = (items: any[]): Event[] => {
    return items.map((it, idx) => {
      const isAllDay = !!it?.start?.date && !it?.start?.dateTime;
      // Parse all-day dates as LOCAL midnight to avoid UTC shifting to previous day
      const start = it?.start?.dateTime ? new Date(it.start.dateTime) : parseISOAsLocal(it.start.date);
      const endRaw = it?.end?.dateTime ? new Date(it.end.dateTime) : parseISOAsLocal(it.end?.date || it.start.date);
      // Google all-day end.date is exclusive; adjust to previous local day
      const end = isAllDay && it?.end?.date ? new Date(endRaw.getTime() - 24 * 60 * 60 * 1000) : endRaw;

      // Heuristic: some updates return timed 00:00 -> 00:00 next day; treat as all-day
      const startIsMidnight = start.getHours() === 0 && start.getMinutes() === 0;
      const endIsMidnight = end.getHours() === 0 && end.getMinutes() === 0;
      const spansToNextDay = formatLocalDateYMD(end) !== formatLocalDateYMD(start);
      const inferredAllDay = isAllDay || (startIsMidnight && endIsMidnight && spansToNextDay);

      // Use LOCAL calendar date (not UTC) so days match user's timezone
      const startDateStr = formatLocalDateYMD(start);
      const endDateStr = formatLocalDateYMD(inferredAllDay && it?.end ? new Date(end.getTime() - (isAllDay ? 0 : 0)) : end);
      const multiDay = startDateStr !== endDateStr;

      return {
        id: it.id || `${Date.now()}-${idx}`,
        title: it.summary || '(No title)',
        date: startDateStr,
        endDate: multiDay ? endDateStr : undefined,
        time: inferredAllDay ? 'All day' : formatTime(start),
        startTime: inferredAllDay ? undefined : formatTime(start),
        endTime: inferredAllDay ? undefined : formatTime(end),
        calendar: 'google',
        color: COLORS.brandBlue,
        multiDay,
        allDay: inferredAllDay,
        description: it.description || ''
      } as Event;
    });
  };

  const parseISOAsLocal = (iso: string): Date => {
    if (!iso) return new Date(NaN);
    // If timezone info is present, let Date parse it normally
    if (/Z|[+-]\d{2}:?\d{2}$/.test(iso)) return new Date(iso);
    // Fallback: parse as local time to avoid timezone shifts (Safari compatibility)
    const [d, t] = iso.split('T');
    const [y, m, day] = d.split('-').map((n) => parseInt(n, 10));
    const [hh = '0', mm = '0', ss = '0'] = (t || '').split(':');
    return new Date(y, (m || 1) - 1, day || 1, parseInt(hh, 10) || 0, parseInt(mm, 10) || 0, parseInt(ss, 10) || 0);
  };

  const mapLocalEvents = (items: any[]): Event[] => {
    return items.map((it, idx) => {
      const isAllDay = !!it.allDay;
      // Backend may return UTC-aware strings like "+00:00"; strip tz to treat as local
      const stripTz = (s?: string) => (s ? s.replace(/(Z|[+-]\d{2}:?\d{2})$/, '') : s);
      const start = parseISOAsLocal(stripTz(it.start) as string);
      const end = parseISOAsLocal(stripTz(it.end) as string);
      const startDateStr = formatLocalDateYMD(start);
      const endDateStr = formatLocalDateYMD(end);
      const multiDay = startDateStr !== endDateStr;
      return {
        id: `local-${it.id ?? `${Date.now()}-${idx}`}`,
        title: it.title || '(No title)',
        date: startDateStr,
        endDate: multiDay ? endDateStr : undefined,
        time: isAllDay ? 'All day' : formatTime(start),
        startTime: isAllDay ? undefined : formatTime(start),
        endTime: isAllDay ? undefined : formatTime(end),
        calendar: 'allyvia',
        color: COLORS.deepPurple500,
        multiDay,
        allDay: isAllDay,
        description: it.description || ''
      } as Event;
    });
  };

  // Auto-scroll to current time when switching to week or day view
  useEffect(() => {
    if (viewMode === 'week' || viewMode === 'day') {
      scrollToCurrentTimeOnViewChange();
    }
  }, [viewMode]);

  // Detect Google Calendar connection result via query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal') === 'connected') {
      setGcalConnected(true);
      ensureGoogleCalendarInList();
      const tk = params.get('gcal_token');
      if (tk) {
        // Persist across reloads
        localStorage.setItem('gcal_token', tk);
      }
      // Clean the URL param so it doesn't persist on refresh
      params.delete('gcal');
      params.delete('gcal_token');
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    } else if (params.get('gcal') === 'cancelled') {
      // User denied or reduced permissions; show guidance and continue with local events
      toast.show('To connect Google Calendar, click Connect Google Calendar and allow calendar access.', 'warning');
      params.delete('gcal');
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
    // Also check connection status from backend in case user is already connected
    (async () => {
      try {
        // If we already have a persisted token, consider connected optimistically
        const storedToken = localStorage.getItem('gcal_token');
        if (storedToken) {
          setGcalConnected(true);
          ensureGoogleCalendarInList();
        }
        const res = await axiosServices.get(`${API_BASE_URL}/calendar/connected/`, {
          withCredentials: true,
          params: { gcal_token: storedToken || undefined },
          headers: storedToken ? { 'X-Gcal-Token': storedToken } : undefined
        });
        if (res?.data?.connected) {
          setGcalConnected(true);
          ensureGoogleCalendarInList();
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const { timeMin, timeMax } = getMonthRange(currentDate);
      let mappedGoogle: Event[] = [];
      if (gcalConnected) {
        const gcalToken = localStorage.getItem('gcal_token');
        const res = await axiosServices.get(`${API_BASE_URL}/calendar/events/`, {
          params: { timeMin, timeMax, calendarId: 'primary', maxResults: 2500, gcal_token: gcalToken || undefined },
          withCredentials: true,
          headers: gcalToken ? { 'X-Gcal-Token': gcalToken } : undefined
        });
        const items = res?.data?.items || [];
        console.log('[Calendar] Fetch Google items', items.length);
        if (lastUpdatedIdRef.current) {
          const raw = items.find((it: any) => it.id === lastUpdatedIdRef.current);
          if (raw) {
            const rawStart = (raw.start && (raw.start.dateTime || raw.start.date)) || null;
            const rawEnd = (raw.end && (raw.end.dateTime || raw.end.date)) || null;
            console.log('[Calendar] Raw Google event after update', raw.id, {
              start: rawStart,
              end: rawEnd,
              allDay: !!raw.start?.date && !raw.start?.dateTime
            });
          }
        }
        mappedGoogle = mapGoogleEvents(items);
        if (lastUpdatedIdRef.current) {
          const mapped = mappedGoogle.find((it) => it.id === lastUpdatedIdRef.current);
          if (mapped)
            console.log('[Calendar] Mapped Google event after update', {
              id: mapped.id,
              date: mapped.date,
              endDate: mapped.endDate,
              time: mapped.time,
              allDay: mapped.allDay
            });
        }
        console.log('[Calendar] Mapped Google items', mappedGoogle.length);
        ensureGoogleCalendarInList();
      }

      // Always fetch local Allyvia events
      console.log('[Calendar] Fetch local events params', { timeMin, timeMax, userId: user?.id });
      const localRes = await axiosServices.get(`${API_BASE_URL}/calendar/local-events/`, {
        params: { timeMin, timeMax },
        withCredentials: true,
        headers: user?.id ? { 'X-User-Id': String(user.id) } : undefined
      });
      console.log('[Calendar] Fetch local events response', localRes.status, localRes.data);
      const localItems = localRes?.data?.items || [];
      const mappedLocal = mapLocalEvents(localItems);
      console.log('[Calendar] Mapped Local items', mappedLocal.length);

      setEvents([...mappedLocal, ...mappedGoogle]);
    } catch (e) {
      console.error(e);
    }
  }, [gcalConnected, currentDate, user?.id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!gcalConnected) return;
    const POLL_MS = 30000;
    const tick = () => {
      if (document.visibilityState === 'visible') fetchEvents();
    };
    const id = window.setInterval(tick, POLL_MS);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, [gcalConnected, fetchEvents]);

  const handleConnectGoogle = async () => {
    try {
      setGcalLoading(true);
      const next = `${window.location.origin}/calendar`;

      // For social login, we don't need to pass user_id - the backend will handle user creation/login
      const userIdParam = user?.id ? `&user_id=${encodeURIComponent(String(user.id))}` : '';
      const resp = await fetch(`${API_BASE_URL}/calendar/auth-url/?next=${encodeURIComponent(next)}${userIdParam}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(user?.id ? { 'X-User-Id': String(user.id) } : {})
        }
      });

      if (!resp.ok) throw new Error('Failed to get auth url');
      const data = await resp.json();
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (e) {
      console.error(e);
      toast.show('Unable to start Google OAuth. Check backend logs.', 'error');
    } finally {
      setGcalLoading(false);
    }
  };

  const handleCalendarToggle = (calendarId: string) => {
    setSelectedCalendars((prev) => (prev.includes(calendarId) ? prev.filter((id) => id !== calendarId) : [...prev, calendarId]));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
      } else if (viewMode === 'week') {
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() + 7);
        }
      } else if (viewMode === 'day') {
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 1);
        } else {
          newDate.setDate(newDate.getDate() + 1);
        }
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newViewMode: string | null) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const getDateRangeDisplay = () => {
    if (viewMode === 'month') {
      return formatMonthYear(currentDate);
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return formatMonthYear(currentDate);
  };

  const handleAddEvent = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setOpenEventDialog(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setOpenEventDialog(true);
  };

  const handleDeleteEvent = async (event: Event) => {
    try {
      if (event.calendar === 'google') {
        if (!gcalConnected) {
          toast.show('Connect Google Calendar to delete Google events', 'warning');
          return;
        }
        const gcalToken = localStorage.getItem('gcal_token');
        await axiosServices.delete(`${API_BASE_URL}/calendar/events/${event.id}/`, {
          withCredentials: true,
          headers: gcalToken ? { 'X-Gcal-Token': gcalToken } : undefined,
          params: { calendarId: 'primary', gcal_token: gcalToken || undefined }
        });
      } else {
        const localId = event.id.replace('local-', '');
        console.log('[Calendar] Delete local event request', { localId, userId: user?.id });
        await axiosServices.delete(`${API_BASE_URL}/calendar/local-events/${localId}/`, {
          withCredentials: true,
          headers: user?.id ? { 'X-User-Id': String(user.id) } : undefined
        });
      }
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      toast.show('Event deleted', 'success');
      fetchEvents();
    } catch (e) {
      console.error(e);
      toast.show('Failed to delete event', 'error');
    }
  };

  const confirmDeleteEvent = (deleteSeries: boolean = false) => {
    if (eventToDelete) {
      if (eventToDelete.multiDay && !deleteSeries) {
        // Delete only the current day's instance
        setEvents((prev) => prev.filter((event) => event.id !== eventToDelete.id));
      } else {
        // Delete the entire series
        setEvents((prev) => prev.filter((event) => event.id !== eventToDelete.id));
      }
      setShowDeleteDialog(false);
      setEventToDelete(null);
      toast.show('Event deleted', 'success');
    }
  };

  const validateTimeFormat = (time: string): boolean => {
    if (time === 'All day') return true;
    const single = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
    const range = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)\s?-\s?(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
    return single.test(time) || range.test(time);
  };

  const to24Hour = (hhmmAmPm: string): { hours: number; minutes: number } => {
    const match = hhmmAmPm.trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match) return { hours: 0, minutes: 0 };
    let h = parseInt(match[1], 10) % 12;
    const m = parseInt(match[2], 10);
    if (/pm/i.test(match[3])) h += 12;
    return { hours: h, minutes: m };
  };

  const buildStartEndISO = (dateStr: string, timeStr: string, endDateStr?: string): { startISO: string; endISO: string } => {
    if (timeStr.toLowerCase() === 'all day') {
      // CORRECTED: For all-day events, return only the date string (YYYY-MM-DD).
      // Google's API requires the end date to be exclusive (one day after the actual end).
      const startDay = new Date(`${dateStr}T00:00:00`);
      const endBase = new Date(`${endDateStr || dateStr}T00:00:00`);

      // Ensure we are using the correct end date for the calculation
      const effectiveEndDate = new Date(endBase.getTime());
      effectiveEndDate.setDate(effectiveEndDate.getDate() + 1);

      const formatToYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const startISO = formatToYMD(startDay);
      const endISO = formatToYMD(effectiveEndDate);

      return { startISO, endISO };
    }

    // This logic for timed events is correct and remains unchanged.
    if (timeStr.includes('-')) {
      const [startText, endText] = timeStr.split('-').map((s) => s.trim());
      const { hours: sh, minutes: sm } = to24Hour(startText);
      const { hours: eh, minutes: em } = to24Hour(endText);
      const startISO = `${dateStr}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`;
      const ed = endDateStr || dateStr;
      const endISO = `${ed}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;
      return { startISO, endISO };
    }

    const { hours, minutes } = to24Hour(timeStr);
    const sh = String(hours).padStart(2, '0');
    const sm = String(minutes).padStart(2, '0');
    const startISO = `${dateStr}T${sh}:${sm}:00`;

    // default +1 hour, keep same date unless crossing midnight
    const plus = new Date(`${dateStr}T${sh}:${sm}:00`);
    plus.setHours(plus.getHours() + 1);

    const ed = `${plus.getFullYear()}-${String(plus.getMonth() + 1).padStart(2, '0')}-${String(plus.getDate()).padStart(2, '0')}`;
    const endISO = `${ed}T${String(plus.getHours()).padStart(2, '0')}:${String(plus.getMinutes()).padStart(2, '0')}:00`;

    return { startISO, endISO };
  };

  const handleSaveEvent = async (eventData: Partial<Event>) => {
    if (eventData.time && !eventData.allDay && !validateTimeFormat(eventData.time)) {
      toast.show('Please enter time as HH:MM AM/PM or Start - End (e.g., "2:30 PM" or "2:30 PM - 3:30 PM")', 'warning');
      return;
    }

    try {
      const gcalToken = localStorage.getItem('gcal_token');
      if (editingEvent) {
        const baseDate = eventData.date || editingEvent.date;
        const allDayEffective = !!(eventData.allDay ?? editingEvent.allDay ?? (eventData.time || editingEvent.time) === 'All day');
        let endDateForBuild = eventData.endDate || editingEvent.endDate;
        const { startISO, endISO } = buildStartEndISO(
          baseDate!,
          allDayEffective ? 'All day' : eventData.time || editingEvent.time,
          endDateForBuild
        );
        lastUpdatedIdRef.current = editingEvent.id;
        console.log('[Calendar] handleSaveEvent editing', {
          baseDate,
          time: allDayEffective ? 'All day' : eventData.time || editingEvent.time,
          endDate: endDateForBuild,
          startISO,
          endISO,
          allDay: allDayEffective,
          calendar: editingEvent.calendar,
          id: editingEvent.id
        });

        if (editingEvent.calendar === 'google') {
          // NOTE: The logic below for payloadStart/End is now redundant because buildStartEndISO handles it,
          // but we can leave it as a safeguard. The important thing is buildStartEndISO is now correct.
          let payloadStart: string = startISO;
          let payloadEnd: string = endISO;
          if (allDayEffective) {
            payloadStart = startISO; // Already in YYYY-MM-DD format from the fixed function
            payloadEnd = endISO; // Already in YYYY-MM-DD format from the fixed function
          }

          const payload = {
            title: eventData.title ?? editingEvent.title,
            description: eventData.description ?? editingEvent.description,
            start: payloadStart,
            end: payloadEnd,
            calendarId: 'primary',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            allDay: allDayEffective,
            calendar: eventData.calendar && eventData.calendar !== 'google' ? eventData.calendar : undefined
          };
          console.log('[Calendar] Update google event request', editingEvent.id, payload);
          const resp = await axiosServices.put(`${API_BASE_URL}/calendar/events/${editingEvent.id}/`, payload, {
            withCredentials: true,
            headers: gcalToken ? { 'X-Gcal-Token': gcalToken } : undefined,
            params: { gcal_token: gcalToken || undefined }
          });
          console.log('[Calendar] Update google event response', resp.status, resp.data?.start, resp.data?.end);
          if ((resp.data as any)?.migratedTo === 'allyvia') {
            setSelectedCalendars((prev) => (prev.includes('allyvia') ? prev : [...prev, 'allyvia']));
            fetchEvents();
          } else {
            const updated = mapGoogleEvents([resp.data])[0];
            console.log('[Calendar] Mapped updated google event', updated);
            const looksSame =
              updated.date === (editingEvent.date || '') &&
              (updated.endDate || '') === (editingEvent.endDate || '') &&
              (updated.time || '') === (editingEvent.time || '');
            if (looksSame) {
              const optimistic: Event = {
                ...editingEvent,
                title: payload.title || editingEvent.title,
                description: payload.description || editingEvent.description,
                date: baseDate!,
                endDate: endDateForBuild || editingEvent.endDate,
                time: allDayEffective ? 'All day' : (eventData.time || editingEvent.time)!,
                startTime: allDayEffective ? undefined : (eventData.time || editingEvent.startTime)!,
                endTime: allDayEffective ? undefined : editingEvent.endTime,
                allDay: allDayEffective
              } as Event;
              console.log('[Calendar] Optimistic update for google event', optimistic);
              setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? optimistic : e)));
            } else {
              setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? updated : e)));
            }
          }
        } else {
          const localId = editingEvent.id.replace('local-', '');
          const payload = {
            title: eventData.title ?? editingEvent.title,
            description: eventData.description ?? editingEvent.description,
            start: startISO,
            end: endISO,
            allDay: allDayEffective,
            calendar: eventData.calendar && eventData.calendar !== 'allyvia' ? eventData.calendar : undefined
          };
          console.log('[Calendar] Update local event request', { id: localId, payload, userId: user?.id });
          const resp = await axiosServices.put(`${API_BASE_URL}/calendar/local-events/${localId}/`, payload, {
            withCredentials: true,
            headers: user?.id ? { 'X-User-Id': String(user.id) } : undefined
          });
          console.log('[Calendar] Update local event response', resp.status, resp.data);
          if ((resp.data as any)?.migratedTo === 'google') {
            ensureGoogleCalendarInList();
            setSelectedCalendars((prev) => (prev.includes('google') ? prev : [...prev, 'google']));
            fetchEvents();
          } else {
            const updated = mapLocalEvents([resp.data])[0];
            setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? updated : e)));
          }
        }
        const navDate = new Date((eventData.date || editingEvent.date || startISO.split('T')[0]) + 'T00:00:00');
        setCurrentDate(navDate);
        await new Promise((r) => setTimeout(r, 500));
        await fetchEvents();
      } else {
        const baseDate = (eventData.date || selectedDate?.toISOString().split('T')[0])!;
        const { startISO, endISO } = buildStartEndISO(baseDate, eventData.time || '09:00 AM', eventData.endDate);
        const targetCal = eventData.calendar || 'allyvia';
        console.log('[Calendar] handleSaveEvent targetCal', targetCal, 'gcalConnected', gcalConnected);
        if (targetCal === 'google') {
          const resp = await axiosServices.post(
            `${API_BASE_URL}/calendar/events/`,
            {
              title: eventData.title || '',
              description: eventData.description || '',
              start: startISO,
              end: endISO,
              calendarId: 'primary',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              allDay: !!eventData.allDay
            },
            {
              withCredentials: true,
              headers: gcalToken ? { 'X-Gcal-Token': gcalToken } : undefined,
              params: { gcal_token: gcalToken || undefined }
            }
          );
          const created = mapGoogleEvents([resp.data])[0];
          setEvents((prev) => [...prev, created]);
        } else {
          console.log('[Calendar] Create local event request', {
            title: eventData.title,
            startISO,
            endISO,
            allDay: !!eventData.allDay,
            userId: user?.id
          });
          const resp = await axiosServices.post(
            `${API_BASE_URL}/calendar/local-events/`,
            {
              title: eventData.title || '',
              description: eventData.description || '',
              start: startISO,
              end: endISO,
              allDay: !!eventData.allDay
            },
            { withCredentials: true, headers: user?.id ? { 'X-User-Id': String(user.id) } : undefined }
          );
          console.log('[Calendar] Create local event response', resp.status, resp.data);
          const created = mapLocalEvents([resp.data])[0];
          setEvents((prev) => [...prev, created]);
        }
        const navDate = new Date((eventData.date || baseDate || startISO.split('T')[0]) + 'T00:00:00');
        setCurrentDate(navDate);
        await new Promise((r) => setTimeout(r, 500));
        await fetchEvents();
      }
    } catch (e) {
      console.error(e);
      toast.show('Failed to save event', 'error');
    } finally {
      setOpenEventDialog(false);
      setEditingEvent(null);
      setSelectedDate(null);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add days from previous month
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }

    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events
      .filter((e) => selectedCalendars.includes(e.calendar))
      .filter((event) => {
        if (event.multiDay) {
          const eventStart = new Date(event.date);
          const eventEnd = new Date(event.endDate!);
          return date >= eventStart && date <= eventEnd;
        }
        return event.date === dateString;
      });
  };

  const getMultiDayEvents = () => {
    return events.filter((event) => event.multiDay && selectedCalendars.includes(event.calendar));
  };

  const isEventStart = (event: Event, date: Date) => {
    if (!event.multiDay) return false;
    const eventStart = new Date(event.date);
    return date.getTime() === eventStart.getTime();
  };

  const isEventEnd = (event: Event, date: Date) => {
    if (!event.multiDay) return false;
    const eventEnd = new Date(event.endDate!);
    return date.getTime() === eventEnd.getTime();
  };

  const formatDate = (date: Date) => {
    return date.getDate();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    return currentHour + currentMinute / 60;
  };

  const scrollToCurrentTime = () => {
    const currentTimePosition = getCurrentTimePosition();
    const hourElement = document.querySelector(`[data-hour="${Math.floor(currentTimePosition)}"]`);
    if (hourElement) {
      hourElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToCurrentTimeOnViewChange = () => {
    setTimeout(() => {
      scrollToCurrentTime();
    }, 100);
  };

  const handleAddCalendar = (calendarData: any) => {
    const iconMap: { [key: string]: any } = {
      home: <HomeIcon />,
      work: <WorkIcon />,
      person: <PersonIcon />,
      event: <EventIcon />,
      cake: <CakeIcon />,
      business: <BusinessIcon />
    };

    const newCalendar = {
      id: Date.now().toString(),
      name: calendarData.name,
      color: calendarData.color,
      icon: iconMap[calendarData.icon] || <HomeIcon />,
      url: calendarData.url || '',
      checked: true
    };
    setMockCalendars((prev: any[]) => [...prev, newCalendar]);
    setShowAddCalendarDialog(false);
  };

  const handleEditCalendar = (calendarData: any) => {
    const iconMap: { [key: string]: any } = {
      home: <HomeIcon />,
      work: <WorkIcon />,
      person: <PersonIcon />,
      event: <EventIcon />,
      cake: <CakeIcon />,
      business: <BusinessIcon />
    };

    setMockCalendars((prev: any[]) =>
      prev.map((cal: any) =>
        cal.id === editingCalendar.id
          ? {
              ...cal,
              name: calendarData.name,
              color: calendarData.color,
              icon: iconMap[calendarData.icon] || <HomeIcon />,
              url: calendarData.url || ''
            }
          : cal
      )
    );
    setEditingCalendar(null);
    setShowManageCalendarsDialog(false);
  };

  const handleDeleteCalendar = (calendarId: string) => {
    setMockCalendars((prev: any[]) => prev.filter((cal: any) => cal.id !== calendarId));
    // Also remove from selected calendars if it was selected
    setSelectedCalendars((prev: string[]) => prev.filter((id: string) => id !== calendarId));
  };

  const calendarDays = getDaysInMonth(currentDate);

  // Render different view modes
  const renderMonthView = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', columnGap: 1, rowGap: 1 }}>
      {/* Day Headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <Box key={day} sx={{ py: 1, textAlign: 'center', borderBottom: 1, borderColor: 'divider', minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ letterSpacing: 0.5, color: 'text.secondary', textTransform: 'uppercase' }}>
            {day}
          </Typography>
        </Box>
      ))}

      {/* Calendar Days */}
      {calendarDays.map((day, index) => {
        const events = getEventsForDate(day.date);
        const visibleEvents = events.slice(0, 3);
        const moreEvents = events.length - 3;

        return (
          <Box
            key={index}
            sx={{
              minHeight: 136,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              p: 1,
              backgroundColor: day.isCurrentMonth ? 'background.paper' : 'action.hover',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
              minWidth: 0,
              '&:hover': {
                backgroundColor: day.isCurrentMonth ? 'action.hover' : 'action.selected',
                boxShadow: 1
              }
            }}
            onClick={() => handleAddEvent(day.date)}
          >
            {/* Date number in top-right */}
            <Box sx={{ position: 'absolute', top: 6, right: 8 }}>
              <Typography
                variant="body2"
                sx={{
                  color: day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                  fontWeight: isToday(day.date) ? 700 : 500,
                  px: isToday(day.date) ? 1 : 0,
                  borderRadius: isToday(day.date) ? 1 : 0,
                  lineHeight: 1.5,
                  ...(isToday(day.date) && {
                    backgroundColor: theme.palette.primary.main,
                    color: COLORS.white
                  })
                }}
              >
                {formatDate(day.date)}
              </Typography>
            </Box>

            {/* Events */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 3 }}>
              {visibleEvents.map((event) => (
                <Box
                  key={event.id}
                  sx={{
                    backgroundColor: event.color,
                    color: COLORS.white,
                    px: 0.75,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    fontWeight: 600,
                    '&:hover': {
                      opacity: 0.9
                    },
                    // Multi-day event styling
                    ...(event.multiDay && {
                      borderTopLeftRadius: isEventStart(event, day.date) ? 4 : 0,
                      borderBottomLeftRadius: isEventStart(event, day.date) ? 4 : 0,
                      borderTopRightRadius: isEventEnd(event, day.date) ? 4 : 0,
                      borderBottomRightRadius: isEventEnd(event, day.date) ? 4 : 0,
                      marginLeft: isEventStart(event, day.date) ? 0 : -1,
                      marginRight: isEventEnd(event, day.date) ? 0 : -1,
                      zIndex: 1,
                      position: 'relative'
                    })
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditEvent(event);
                  }}
                >
                  {event.time !== 'All day' && (
                    <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.white }}>
                      {event.time}
                    </Typography>
                  )}
                  <Typography variant="caption" noWrap sx={{ fontWeight: 700, color: COLORS.white }}>
                    {event.title}
                  </Typography>
                </Box>
              ))}
              {moreEvents > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  +{moreEvents} more
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
        {/* Week Header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ p: 2, textAlign: 'center', borderRight: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="textSecondary">
              Time
            </Typography>
          </Box>
          {weekDays.map((day, index) => (
            <Box key={index} sx={{ p: 2, textAlign: 'center', borderRight: index < 6 ? 1 : 0, borderColor: 'divider' }}>
              <Typography variant="body2" color="textSecondary">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: isToday(day) ? 'bold' : 'normal',
                  color: isToday(day) ? theme.palette.primary.main : 'text.primary'
                }}
              >
                {day.getDate()}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Week Grid with Time */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '80px repeat(7, 1fr)',
            flex: 1,
            overflow: 'auto',
            borderTop: 1,
            borderColor: 'divider'
          }}
        >
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              {/* Time Column */}
              <Box
                sx={{
                  height: 60,
                  borderBottom: 1,
                  borderColor: 'divider',
                  borderRight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  backgroundColor: 'background.paper',
                  position: 'relative'
                }}
                data-hour={hour}
              >
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                {/* Current time indicator */}
                {Math.floor(getCurrentTimePosition()) === hour && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${(getCurrentTimePosition() - hour) * 60}px`,
                      height: 2,
                      backgroundColor: theme.palette.error.main,
                      zIndex: 10,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme.palette.error.dark
                      }
                    }}
                    onClick={scrollToCurrentTime}
                  />
                )}
              </Box>

              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => {
                const events = getEventsForDate(day);
                const hourEvents = events.filter((event) => {
                  if (event.allDay) return false;
                  const eventHour = parseInt(event.time.split(':')[0]);
                  return eventHour === hour;
                });

                return (
                  <Box
                    key={dayIndex}
                    sx={{
                      height: 60,
                      borderBottom: 1,
                      borderRight: dayIndex < 6 ? 1 : 0,
                      borderColor: 'divider',
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => {
                      const newDate = new Date(day);
                      newDate.setHours(hour, 0, 0, 0);
                      handleAddEvent(newDate);
                    }}
                  >
                    {/* Current time indicator */}
                    {Math.floor(getCurrentTimePosition()) === hour && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `${(getCurrentTimePosition() - hour) * 60}px`,
                          height: 2,
                          backgroundColor: theme.palette.error.main,
                          zIndex: 10,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: theme.palette.error.dark
                          }
                        }}
                        onClick={scrollToCurrentTime}
                      />
                    )}
                    {hourEvents.map((event) => (
                      <Box
                        key={event.id}
                        sx={{
                          position: 'absolute',
                          left: 4,
                          right: 4,
                          top: 2,
                          bottom: 2,
                          backgroundColor: event.color,
                          color: COLORS.white,
                          p: 0.5,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          zIndex: 1,
                          overflow: 'hidden',
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: COLORS.white }}>
                          {event.title}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </React.Fragment>
          ))}

          {/* All-day events row */}
          <Box
            sx={{
              height: 40,
              borderBottom: 1,
              borderColor: 'divider',
              borderRight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              color: 'text.secondary',
              backgroundColor: 'background.paper'
            }}
          >
            All Day
          </Box>

          {weekDays.map((day, dayIndex) => {
            const events = getEventsForDate(day);
            const allDayEvents = events.filter((event) => event.allDay);

            return (
              <Box
                key={dayIndex}
                sx={{
                  height: 40,
                  borderBottom: 1,
                  borderRight: dayIndex < 6 ? 1 : 0,
                  borderColor: 'divider',
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
                onClick={() => handleAddEvent(day)}
              >
                {allDayEvents.map((event) => (
                  <Box
                    key={event.id}
                    sx={{
                      position: 'absolute',
                      left: 4,
                      right: 4,
                      top: 2,
                      bottom: 2,
                      backgroundColor: event.color,
                      color: COLORS.white,
                      p: 0.5,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      zIndex: 1,
                      overflow: 'hidden',
                      '&:hover': {
                        opacity: 0.8
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEvent(event);
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: COLORS.white }}>
                      {event.title}
                    </Typography>
                  </Box>
                ))}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
        {/* Day Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {dayEvents.length} events today
          </Typography>
        </Box>

        {/* Day Timeline */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'auto' }}>
          {/* Time Column */}
          <Box sx={{ width: 80, borderRight: 1, borderColor: 'divider' }}>
            {hours.map((hour) => (
              <Box
                key={hour}
                sx={{
                  height: 60,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  position: 'relative'
                }}
                data-hour={hour}
              >
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                {/* Current time indicator */}
                {Math.floor(getCurrentTimePosition()) === hour && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${(getCurrentTimePosition() - hour) * 60}px`,
                      height: 2,
                      backgroundColor: theme.palette.error.main,
                      zIndex: 10,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme.palette.error.dark
                      }
                    }}
                    onClick={scrollToCurrentTime}
                  />
                )}
              </Box>
            ))}
          </Box>

          {/* Events Column */}
          <Box sx={{ flex: 1, position: 'relative' }}>
            {hours.map((hour) => (
              <Box
                key={hour}
                sx={{
                  height: 60,
                  borderBottom: 1,
                  borderColor: 'divider',
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setHours(hour, 0, 0, 0);
                  handleAddEvent(newDate);
                }}
              >
                {/* Current time indicator */}
                {Math.floor(getCurrentTimePosition()) === hour && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${(getCurrentTimePosition() - hour) * 60}px`,
                      height: 2,
                      backgroundColor: theme.palette.error.main,
                      zIndex: 10,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme.palette.error.dark
                      }
                    }}
                    onClick={scrollToCurrentTime}
                  />
                )}
                {/* Events for this hour */}
                {dayEvents
                  .filter((event) => {
                    if (event.allDay) return false;
                    const eventHour = parseInt(event.time.split(':')[0]);
                    return eventHour === hour;
                  })
                  .map((event) => (
                    <Box
                      key={event.id}
                      sx={{
                        position: 'absolute',
                        left: 8,
                        right: 8,
                        top: 4,
                        bottom: 4,
                        backgroundColor: event.color,
                        color: COLORS.black,
                        p: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        zIndex: 1,
                        '&:hover': {
                          opacity: 0.8
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEvent(event);
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: COLORS.white }}>
                        {event.time} - {event.title}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            ))}

            {/* All-day events */}
            {dayEvents
              .filter((event) => event.allDay)
              .map((event, index) => (
                <Box
                  key={event.id}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 8,
                    right: 8,
                    height: 40,
                    backgroundColor: event.color,
                    color: COLORS.black,
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    zIndex: 2,
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditEvent(event);
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: COLORS.white }}>
                    All Day - {event.title}
                  </Typography>
                </Box>
              ))}
          </Box>
        </Box>
      </Box>
    );
  };

  const renderListView = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        List View
      </Typography>
      <List>
        {events
          .filter((event) => selectedCalendars.includes(event.calendar))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((event) => (
            <ListItem
              key={event.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => handleEditEvent(event)}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: event.color
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={event.title}
                secondary={`${new Date(event.date).toLocaleDateString()} • ${event.time} • ${mockCalendars.find((cal) => cal.id === event.calendar)?.name}`}
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEvent(event);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
      </List>
    </Box>
  );

  const renderCurrentView = () => {
    switch (viewMode) {
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      case 'list':
        return renderListView();
      default:
        return renderMonthView();
    }
  };

  // Default new-event calendar to Allyvia; user can change to Google in the dialog
  const defaultCalendarId = 'allyvia';

  return (
    <MainCard title="Calendar">
      <Grid container spacing={3}>
        {/* Left Sidebar */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              {/* New Event Button */}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                fullWidth
                sx={{
                  mb: 3,
                  color: COLORS.white,
                  '& .MuiButton-startIcon': { color: COLORS.white }
                }}
                onClick={() => handleAddEvent(new Date())}
              >
                New Event
              </Button>

              {/* Mini Calendar */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {formatMonthYear(currentDate)}
                </Typography>
                <Grid container spacing={1}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <Grid size={{ xs: 12 / 7 }} key={day}>
                      <Typography variant="caption" align="center" display="block">
                        {day}
                      </Typography>
                    </Grid>
                  ))}
                  {getDaysInMonth(currentDate)
                    .slice(0, 35)
                    .map((day, index) => (
                      <Grid size={{ xs: 12 / 7 }} key={index}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            backgroundColor: isToday(day.date) ? theme.palette.primary.main : 'transparent',
                            color: isToday(day.date) ? COLORS.white : day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: isToday(day.date) ? 'bold' : 'normal',
                            '&:hover': {
                              backgroundColor: isToday(day.date) ? theme.palette.primary.main : 'action.hover'
                            }
                          }}
                          onClick={() => {
                            setCurrentDate(day.date);
                            setViewMode('day');
                          }}
                        >
                          {formatDate(day.date)}
                        </Box>
                      </Grid>
                    ))}
                </Grid>
              </Box>

              {/* Calendars */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">Calendars</Typography>
                  <Box>
                    <Tooltip title="Add Calendar">
                      <IconButton size="small" onClick={() => setShowAddCalendarDialog(true)}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Manage Calendars">
                      <IconButton size="small" onClick={() => setShowManageCalendarsDialog(true)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                {(gcalConnected ? mockCalendars : mockCalendars.filter((c: any) => c.id === 'allyvia')).map((calendar) => (
                  <FormControlLabel
                    key={calendar.id}
                    control={
                      <Checkbox
                        checked={selectedCalendars.includes(calendar.id)}
                        onChange={() => handleCalendarToggle(calendar.id)}
                        sx={{
                          color: calendar.color,
                          '&.Mui-checked': {
                            color: calendar.color
                          }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            color: calendar.color,
                            backgroundColor: `${calendar.color}20`,
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {calendar.icon}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {calendar.name}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      mb: 1,
                      width: '100%',
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: selectedCalendars.includes(calendar.id) ? `${calendar.color}10` : 'transparent',
                      '&:hover': {
                        backgroundColor: `${calendar.color}10`
                      }
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Calendar View */}
        <Grid size={{ xs: 12, md: 9 }}>
          {/* Calendar Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => navigateMonth('prev')}>
                <NavigateBeforeIcon />
              </IconButton>
              <Button
                variant="contained"
                size="small"
                onClick={goToToday}
                sx={{
                  backgroundColor: theme.palette.secondary.main,
                  color: COLORS.white,
                  '&:hover': {
                    backgroundColor: theme.palette.secondary.dark,
                    color: COLORS.white
                  }
                }}
              >
                Today
              </Button>
              <IconButton onClick={() => navigateMonth('next')}>
                <NavigateNextIcon />
              </IconButton>
            </Box>

            <Typography variant="h4" sx={{ minWidth: 180 }}>
              {getDateRangeDisplay()}
            </Typography>

            <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} size="small">
              <ToggleButton
                value="month"
                sx={{
                  backgroundColor: viewMode === 'month' ? theme.palette.secondary.main : COLORS.white,
                  color: viewMode === 'month' ? COLORS.white : COLORS.black,
                  '&:hover': {
                    backgroundColor: viewMode === 'month' ? theme.palette.secondary.dark : COLORS.greyF5
                  }
                }}
              >
                Month
              </ToggleButton>
              <ToggleButton
                value="week"
                sx={{
                  backgroundColor: viewMode === 'week' ? theme.palette.secondary.main : COLORS.white,
                  color: viewMode === 'week' ? COLORS.white : COLORS.black,
                  '&:hover': {
                    backgroundColor: viewMode === 'week' ? theme.palette.secondary.dark : COLORS.greyF5
                  }
                }}
              >
                Week
              </ToggleButton>
              <ToggleButton
                value="day"
                sx={{
                  backgroundColor: viewMode === 'day' ? theme.palette.secondary.main : COLORS.white,
                  color: viewMode === 'day' ? COLORS.white : COLORS.black,
                  '&:hover': {
                    backgroundColor: viewMode === 'day' ? theme.palette.secondary.dark : COLORS.greyF5
                  }
                }}
              >
                Day
              </ToggleButton>
              <ToggleButton
                value="list"
                sx={{
                  backgroundColor: viewMode === 'list' ? theme.palette.secondary.main : COLORS.white,
                  color: viewMode === 'list' ? COLORS.white : COLORS.black,
                  '&:hover': {
                    backgroundColor: viewMode === 'list' ? theme.palette.secondary.dark : COLORS.greyF5
                  }
                }}
              >
                List
              </ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isLoggedIn ? (
                // Show "Sign in with Google" for logged-out users
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  onClick={handleConnectGoogle}
                  disabled={gcalLoading}
                  startIcon={<PersonIcon />}
                  sx={{
                    backgroundColor: '#4285f4',
                    '&:hover': { backgroundColor: '#3367d6' }
                  }}
                >
                  {gcalLoading ? 'Signing in...' : 'Sign in with Google'}
                </Button>
              ) : (
                // Show connection status for logged-in users
                <>
                  {!gcalConnected ? (
                    <Button variant="outlined" size="small" onClick={handleConnectGoogle} disabled={gcalLoading}>
                      {gcalLoading ? 'Connecting…' : 'Connect Google Calendar'}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={async () => {
                        try {
                          const gcalToken = localStorage.getItem('gcal_token');
                          await axiosServices.post(`${API_BASE_URL}/calendar/disconnect/`, null, {
                            withCredentials: true,
                            params: { gcal_token: gcalToken || undefined },
                            headers: gcalToken ? { 'X-Gcal-Token': gcalToken } : undefined
                          });
                        } catch (e) {
                          // ignore errors
                        } finally {
                          localStorage.removeItem('gcal_token');
                          setGcalConnected(false);
                          setEvents([]);
                        }
                      }}
                    >
                      Disconnect Calendar
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Box>

          {/* Calendar Content */}
          {renderCurrentView()}
        </Grid>
      </Grid>

      {/* Event Dialog */}
      <EventDialog
        open={openEventDialog}
        onClose={() => setOpenEventDialog(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={editingEvent}
        calendars={mockCalendars}
        selectedDate={selectedDate}
        defaultCalendarId={defaultCalendarId}
        onTimeSelect={(callback) => {
          setTimeSelectorCallback(() => callback);
          setShowTimeSelector(true);
        }}
      />

      {/* Time Selector */}
      <TimeSelector
        open={showTimeSelector}
        onClose={() => setShowTimeSelector(false)}
        onConfirm={(startTime, endTime) => {
          if (timeSelectorCallback) {
            timeSelectorCallback(`${startTime} - ${endTime}`);
          }
          setShowTimeSelector(false);
        }}
        initialStartTime={editingEvent?.time?.split(' - ')[0]}
        initialEndTime={editingEvent?.time?.split(' - ')[1]}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{eventToDelete?.title}"?</Typography>
          {eventToDelete?.multiDay && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                This is a multi-day event. What would you like to delete?
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button onClick={() => confirmDeleteEvent(false)} variant="outlined" color="error" fullWidth>
                  Delete this day only
                </Button>
                <Button onClick={() => confirmDeleteEvent(true)} color="error" variant="contained" fullWidth>
                  Delete entire series
                </Button>
              </Box>
            </Box>
          )}
          {!eventToDelete?.multiDay && (
            <DialogActions>
              <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button onClick={() => confirmDeleteEvent(true)} color="error" variant="contained">
                Delete
              </Button>
            </DialogActions>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Calendar Dialog */}
      <CalendarDialog
        open={showAddCalendarDialog}
        onClose={() => setShowAddCalendarDialog(false)}
        onSave={handleAddCalendar}
        title="Add New Calendar"
      />

      {/* Manage Calendars Dialog */}
      <ManageCalendarsDialog
        open={showManageCalendarsDialog}
        onClose={() => setShowManageCalendarsDialog(false)}
        calendars={mockCalendars}
        onEdit={(calendar: any) => {
          setEditingCalendar(calendar);
          setShowManageCalendarsDialog(false);
          setShowAddCalendarDialog(true);
        }}
        onDelete={handleDeleteCalendar}
      />

      {/* Edit Calendar Dialog */}
      {editingCalendar && (
        <CalendarDialog
          open={showAddCalendarDialog && editingCalendar}
          onClose={() => {
            setShowAddCalendarDialog(false);
            setEditingCalendar(null);
          }}
          onSave={handleEditCalendar}
          calendar={editingCalendar}
          title="Edit Calendar"
        />
      )}
    </MainCard>
  );
}

// Event Dialog Component
interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<Event>) => void;
  onDelete: (event: Event) => void;
  event: Event | null;
  calendars: any[];
  selectedDate: Date | null;
  defaultCalendarId?: string;
  onTimeSelect: (callback: (time: string) => void) => void;
}

// Event Dialog Component (Corrected Version)
interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<Event>) => void;
  onDelete: (event: Event) => void;
  event: Event | null;
  calendars: any[];
  selectedDate: Date | null;
  defaultCalendarId?: string;
  onTimeSelect: (callback: (time: string) => void) => void;
}

function EventDialog({
  open,
  onClose,
  onSave,
  onDelete,
  event,
  calendars,
  selectedDate,
  defaultCalendarId,
  onTimeSelect
}: EventDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    endDate: '',
    time: 'All day',
    calendar: defaultCalendarId || 'allyvia',
    color: COLORS.brandBlue,
    allDay: true, // Start with a consistent state
    description: ''
  });

  // Update form data when event changes
  React.useEffect(() => {
    if (event) {
      // Logic for editing an existing event (remains the same)
      const cal = event.calendar || defaultCalendarId || 'allyvia';
      const allyviaColor = calendars.find((c: any) => c.id === 'allyvia')?.color || COLORS.deepPurple500;
      const googleColor = calendars.find((c: any) => c.id === 'google')?.color || COLORS.brandBlue;
      setFormData({
        title: event.title || '',
        date: event.date || '',
        endDate: event.endDate || '',
        time: event.time || 'All day',
        calendar: cal,
        color: cal === 'allyvia' ? allyviaColor : googleColor,
        allDay: event.allDay || false,
        description: event.description || ''
      });
    } else {
      // creating new event fixing bug
      const allyviaColor = calendars.find((c: any) => c.id === 'allyvia')?.color || COLORS.deepPurple500;
      setFormData({
        title: '',
        date: selectedDate?.toISOString().split('T')[0] || '',
        endDate: '',
        time: 'All day', // The text is "All day"
        calendar: defaultCalendarId || 'allyvia',
        color: (defaultCalendarId || 'allyvia') === 'allyvia' ? allyviaColor : COLORS.brandBlue,
        allDay: true, // <-- AND the boolean is now TRUE
        description: ''
      });
    }
  }, [event, selectedDate, defaultCalendarId, calendars]); // Added calendars to dependency array

  const handleAllDayToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setFormData({
      ...formData,
      allDay: isChecked,
      time: isChecked ? 'All day' : '09:00 AM' // Set a default time when unchecked
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Calendar] Submitting event with calendar', formData.calendar, formData);
    onSave(formData);
  };

  const colorOptions = [
    { value: COLORS.deepPurple500, label: 'Purple' },
    { value: COLORS.brandBlue, label: 'Blue' },
    { value: COLORS.greenA700, label: 'Green' },
    { value: COLORS.orange200, label: 'Orange' },
    { value: COLORS.red500, label: 'Red' }
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          zIndex: 1400
        },
        '& .MuiDialogContent-root': {
          overflow: 'visible'
        }
      }}
    >
      <DialogTitle>
        {event ? 'Edit Event' : 'Add New Event'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, py: 2, overflow: 'visible' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Event Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                fullWidth
                required
                InputLabelProps={{
                  shrink: true
                }}
              />
              <TextField
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => {
                  console.log('[Calendar] Dialog endDate changed', { from: formData.endDate, to: e.target.value });
                  setFormData({ ...formData, endDate: e.target.value });
                }}
                fullWidth
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Box>

            <MuiFormControlLabel control={<Switch checked={formData.allDay} onChange={handleAllDayToggle} />} label="All Day Event" />

            {!formData.allDay && (
              <Box>
                <Button
                  variant="outlined"
                  onClick={() => {
                    onTimeSelect((time: string) => {
                      setFormData({ ...formData, time });
                    });
                  }}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  {formData.time === 'All day' ? 'Select Start & End Time' : formData.time}
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  Click to select start and end time
                </Typography>
              </Box>
            )}

            <FormControl fullWidth>
              <InputLabel>Calendar</InputLabel>
              <Select
                value={formData.calendar}
                onChange={(e) => {
                  const value = e.target.value as string;
                  console.log('[Calendar] Dialog calendar changed to', value);
                  const allyviaColor = calendars.find((c: any) => c.id === 'allyvia')?.color || COLORS.deepPurple500;
                  const googleColor = calendars.find((c: any) => c.id === 'google')?.color || COLORS.brandBlue;
                  setFormData({ ...formData, calendar: value, color: value === 'allyvia' ? allyviaColor : googleColor });
                }}
                label="Calendar"
              >
                {calendars.map((calendar) => (
                  <MenuItem key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Color</InputLabel>
              <Select value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} label="Color">
                {colorOptions.map((color) => (
                  <MenuItem key={color.value} value={color.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          backgroundColor: color.value,
                          borderRadius: 1
                        }}
                      />
                      {color.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          {event && (
            <Button
              onClick={() => {
                onClose();
                onDelete(event);
              }}
              color="error"
              variant="outlined"
              sx={{ mr: 'auto' }}
            >
              Delete Event
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {event ? 'Update' : 'Add'} Event
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Time Selector Component
interface TimeSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (startTime: string, endTime: string) => void;
  initialStartTime?: string;
  initialEndTime?: string;
}

function TimeSelector({ open, onClose, onConfirm, initialStartTime, initialEndTime }: TimeSelectorProps) {
  const [startHour, setStartHour] = useState(7);
  const [startMinute, setStartMinute] = useState(0);
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [endHour, setEndHour] = useState(8);
  const [endMinute, setEndMinute] = useState(0);
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('AM');
  const [startTimeText, setStartTimeText] = useState('');
  const [endTimeText, setEndTimeText] = useState('');
  const [activeField, setActiveField] = useState<'start' | 'end'>('start');
  const [editingStartHour, setEditingStartHour] = useState(false);
  const [editingStartMinute, setEditingStartMinute] = useState(false);
  const [editingEndHour, setEditingEndHour] = useState(false);
  const [editingEndMinute, setEditingEndMinute] = useState(false);
  const [startHourInput, setStartHourInput] = useState('');
  const [startMinuteInput, setStartMinuteInput] = useState('');
  const [endHourInput, setEndHourInput] = useState('');
  const [endMinuteInput, setEndMinuteInput] = useState('');
  const [startHourError, setStartHourError] = useState('');
  const [startMinuteError, setStartMinuteError] = useState('');
  const [endHourError, setEndHourError] = useState('');
  const [endMinuteError, setEndMinuteError] = useState('');
  const [showAddCalendarDialog, setShowAddCalendarDialog] = useState(false);
  const [showManageCalendarsDialog, setShowManageCalendarsDialog] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<any>(null);
  const [mockCalendars, setMockCalendars] = useState(initialCalendars);

  useEffect(() => {
    if (initialStartTime && initialStartTime !== 'All day') {
      const timeMatch = initialStartTime.match(/(\d+):(\d+)\s?(AM|PM)/i);
      if (timeMatch) {
        setStartHour(parseInt(timeMatch[1]));
        setStartMinute(parseInt(timeMatch[2]));
        setStartAmPm(timeMatch[3].toUpperCase() as 'AM' | 'PM');
        setStartTimeText(initialStartTime);
      }
    }
    if (initialEndTime && initialEndTime !== 'All day') {
      const timeMatch = initialEndTime.match(/(\d+):(\d+)\s?(AM|PM)/i);
      if (timeMatch) {
        setEndHour(parseInt(timeMatch[1]));
        setEndMinute(parseInt(timeMatch[2]));
        setEndAmPm(timeMatch[3].toUpperCase() as 'AM' | 'PM');
        setEndTimeText(initialEndTime);
      }
    }
  }, [initialStartTime, initialEndTime]);

  const handleConfirm = () => {
    const startFormattedHour = startHour.toString().padStart(2, '0');
    const startFormattedMinute = startMinute.toString().padStart(2, '0');
    const startTimeString = `${startFormattedHour}:${startFormattedMinute} ${startAmPm}`;

    const endFormattedHour = endHour.toString().padStart(2, '0');
    const endFormattedMinute = endMinute.toString().padStart(2, '0');
    const endTimeString = `${endFormattedHour}:${endFormattedMinute} ${endAmPm}`;

    onConfirm(startTimeString, endTimeString);
    onClose();
  };

  const handleStartHourChange = (increment: boolean) => {
    setStartHour((prev) => {
      if (increment) {
        return prev >= 12 ? 1 : prev + 1;
      } else {
        return prev <= 1 ? 12 : prev - 1;
      }
    });
  };

  const handleStartMinuteChange = (increment: boolean) => {
    setStartMinute((prev) => {
      if (increment) {
        return prev >= 55 ? 0 : prev + 5;
      } else {
        return prev <= 0 ? 55 : prev - 5;
      }
    });
  };

  const handleEndHourChange = (increment: boolean) => {
    setEndHour((prev) => {
      if (increment) {
        return prev >= 12 ? 1 : prev + 1;
      } else {
        return prev <= 1 ? 12 : prev - 1;
      }
    });
  };

  const handleEndMinuteChange = (increment: boolean) => {
    setEndMinute((prev) => {
      if (increment) {
        return prev >= 55 ? 0 : prev + 5;
      } else {
        return prev <= 0 ? 55 : prev - 5;
      }
    });
  };

  const parseTimeText = (text: string) => {
    const timeMatch = text.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const amPm = timeMatch[3].toUpperCase() as 'AM' | 'PM';
      return { hour, minute, amPm };
    }
    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1, color: 'text.secondary' }}>SELECT TIME</DialogTitle>
      <DialogContent sx={{ textAlign: 'center', py: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Start Time Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Start Time
            </Typography>

            {/* Digital Time Display */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
              {/* Hour Box */}
              <Box
                sx={{
                  width: 80,
                  height: 60,
                  backgroundColor: activeField === 'start' ? 'primary.light' : 'grey.100',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
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
                  <Box sx={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={startHourInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setStartHourInput(value);
                        setStartHourError('');

                        if (value && !isNaN(parseInt(value))) {
                          const hour = parseInt(value);
                          if (hour >= 1 && hour <= 12) {
                            setStartHour(hour);
                            setStartTimeText(`${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} ${startAmPm}`);
                          } else {
                            setStartHourError('Hour must be 1-12');
                            setStartHourInput('');
                          }
                        }
                      }}
                      onFocus={() => {
                        setStartHourInput(startHour.toString());
                        setStartHourError('');
                      }}
                      onBlur={() => {
                        setEditingStartHour(false);
                        setStartHourInput('');
                        setStartHourError('');
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          setEditingStartHour(false);
                          setStartHourInput('');
                          setStartHourError('');
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        outline: 'none',
                        color: startHourError ? 'error.main' : 'inherit'
                      }}
                      autoFocus
                    />
                    {startHourError && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'error.main',
                          color: COLORS.white,
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          animation: 'fadeIn 0.2s ease-in-out',
                          '@keyframes fadeIn': {
                            from: { opacity: 0, transform: 'translateX(-50%) translateY(-5px)' },
                            to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' }
                          }
                        }}
                      >
                        {startHourError}
                      </Box>
                    )}
                  </Box>
                ) : (
                  startHour.toString().padStart(2, '0')
                )}
              </Box>

              {/* Colon */}
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                :
              </Typography>

              {/* Minute Box */}
              <Box
                sx={{
                  width: 80,
                  height: 60,
                  backgroundColor: activeField === 'start' ? 'primary.light' : 'grey.100',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
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
                  <Box sx={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={startMinuteInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setStartMinuteInput(value);
                        setStartMinuteError('');

                        if (value && !isNaN(parseInt(value))) {
                          const minute = parseInt(value);
                          if (minute >= 0 && minute <= 59) {
                            setStartMinute(minute);
                            setStartTimeText(`${startHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${startAmPm}`);
                          } else {
                            setStartMinuteError('Minute must be 0-59');
                            setStartMinuteInput('');
                          }
                        }
                      }}
                      onFocus={() => {
                        setStartMinuteInput(startMinute.toString());
                        setStartMinuteError('');
                      }}
                      onBlur={() => {
                        setEditingStartMinute(false);
                        setStartMinuteInput('');
                        setStartMinuteError('');
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          setEditingStartMinute(false);
                          setStartMinuteInput('');
                          setStartMinuteError('');
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        outline: 'none',
                        color: startMinuteError ? 'error.main' : 'inherit'
                      }}
                      autoFocus
                    />
                    {startMinuteError && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'error.main',
                          color: COLORS.white,
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          animation: 'fadeIn 0.2s ease-in-out',
                          '@keyframes fadeIn': {
                            from: { opacity: 0, transform: 'translateX(-50%) translateY(-5px)' },
                            to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' }
                          }
                        }}
                      >
                        {startMinuteError}
                      </Box>
                    )}
                  </Box>
                ) : (
                  startMinute.toString().padStart(2, '0')
                )}
              </Box>

              {/* AM/PM Toggle */}
              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 2 }}>
                <Box
                  sx={{
                    width: 60,
                    height: 30,
                    backgroundColor: startAmPm === 'AM' ? 'primary.light' : 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: startAmPm === 'AM' ? 'primary.main' : 'text.secondary',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}
                  onClick={() => setStartAmPm('AM')}
                >
                  AM
                </Box>
                <Box
                  sx={{
                    width: 60,
                    height: 30,
                    backgroundColor: startAmPm === 'PM' ? 'primary.light' : 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: startAmPm === 'PM' ? 'primary.main' : 'text.secondary',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}
                  onClick={() => setStartAmPm('PM')}
                >
                  PM
                </Box>
              </Box>
            </Box>
          </Box>

          {/* End Time Section */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              End Time
            </Typography>

            {/* Digital Time Display */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
              {/* Hour Box */}
              <Box
                sx={{
                  width: 80,
                  height: 60,
                  backgroundColor: activeField === 'end' ? 'primary.light' : 'grey.100',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
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
                  <Box sx={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={endHourInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setEndHourInput(value);
                        setEndHourError('');

                        if (value && !isNaN(parseInt(value))) {
                          const hour = parseInt(value);
                          if (hour >= 1 && hour <= 12) {
                            setEndHour(hour);
                            setEndTimeText(`${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')} ${endAmPm}`);
                          } else {
                            setEndHourError('Hour must be 1-12');
                            setEndHourInput('');
                          }
                        }
                      }}
                      onFocus={() => {
                        setEndHourInput(endHour.toString());
                        setEndHourError('');
                      }}
                      onBlur={() => {
                        setEditingEndHour(false);
                        setEndHourInput('');
                        setEndHourError('');
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          setEditingEndHour(false);
                          setEndHourInput('');
                          setEndHourError('');
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        outline: 'none',
                        color: endHourError ? 'error.main' : 'inherit'
                      }}
                      autoFocus
                    />
                    {endHourError && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'error.main',
                          color: COLORS.white,
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          animation: 'fadeIn 0.2s ease-in-out',
                          '@keyframes fadeIn': {
                            from: { opacity: 0, transform: 'translateX(-50%) translateY(-5px)' },
                            to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' }
                          }
                        }}
                      >
                        {endHourError}
                      </Box>
                    )}
                  </Box>
                ) : (
                  endHour.toString().padStart(2, '0')
                )}
              </Box>

              {/* Colon */}
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                :
              </Typography>

              {/* Minute Box */}
              <Box
                sx={{
                  width: 80,
                  height: 60,
                  backgroundColor: activeField === 'end' ? 'primary.light' : 'grey.100',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
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
                  <Box sx={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={endMinuteInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setEndMinuteInput(value);
                        setEndMinuteError('');

                        if (value && !isNaN(parseInt(value))) {
                          const minute = parseInt(value);
                          if (minute >= 0 && minute <= 59) {
                            setEndMinute(minute);
                            setEndTimeText(`${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${endAmPm}`);
                          } else {
                            setEndMinuteError('Minute must be 0-59');
                            setEndMinuteInput('');
                          }
                        }
                      }}
                      onFocus={() => {
                        setEndMinuteInput(endMinute.toString());
                        setEndMinuteError('');
                      }}
                      onBlur={() => {
                        setEditingEndMinute(false);
                        setEndMinuteInput('');
                        setEndMinuteError('');
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          setEditingEndMinute(false);
                          setEndMinuteInput('');
                          setEndMinuteError('');
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        outline: 'none',
                        color: endMinuteError ? 'error.main' : 'inherit'
                      }}
                      autoFocus
                    />
                    {endMinuteError && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'error.main',
                          color: COLORS.white,
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          animation: 'fadeIn 0.2s ease-in-out',
                          '@keyframes fadeIn': {
                            from: { opacity: 0, transform: 'translateX(-50%) translateY(-5px)' },
                            to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' }
                          }
                        }}
                      >
                        {endMinuteError}
                      </Box>
                    )}
                  </Box>
                ) : (
                  endMinute.toString().padStart(2, '0')
                )}
              </Box>

              {/* AM/PM Toggle */}
              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 2 }}>
                <Box
                  sx={{
                    width: 60,
                    height: 30,
                    backgroundColor: endAmPm === 'AM' ? 'primary.light' : 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: endAmPm === 'AM' ? 'primary.main' : 'text.secondary',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}
                  onClick={() => setEndAmPm('AM')}
                >
                  AM
                </Box>
                <Box
                  sx={{
                    width: 60,
                    height: 30,
                    backgroundColor: endAmPm === 'PM' ? 'primary.light' : 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: endAmPm === 'PM' ? 'primary.main' : 'text.secondary',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}
                  onClick={() => setEndAmPm('PM')}
                >
                  PM
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <IconButton
            onClick={() => {
              const now = new Date();
              const currentHour = now.getHours() > 12 ? now.getHours() - 12 : now.getHours() || 12;
              const currentMinute = Math.floor(now.getMinutes() / 5) * 5;
              const currentAmPm = now.getHours() >= 12 ? 'PM' : 'AM';

              setStartHour(currentHour);
              setStartMinute(currentMinute);
              setStartAmPm(currentAmPm);
              setStartTimeText(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} ${currentAmPm}`);

              // Set end time to 1 hour later
              const endHour = currentHour === 12 ? 1 : currentHour + 1;
              setEndHour(endHour);
              setEndMinute(currentMinute);
              setEndAmPm(currentAmPm);
              setEndTimeText(`${endHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} ${currentAmPm}`);
            }}
            sx={{ color: 'primary.main' }}
          >
            <TodayIcon />
          </IconButton>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button onClick={onClose} sx={{ color: 'primary.main' }}>
              CANCEL
            </Button>
            <Button onClick={handleConfirm} sx={{ color: 'primary.main' }}>
              OK
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// Calendar Dialog Components
interface CalendarDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (calendarData: any) => void;
  calendar?: any;
  title: string;
}

function CalendarDialog({ open, onClose, onSave, calendar, title }: CalendarDialogProps) {
  const [formData, setFormData] = useState({
    name: calendar?.name || '',
    color: calendar?.color || COLORS.deepPurple500,
    icon: calendar?.icon || 'home',
    url: calendar?.url || ''
  });

  const colorOptions = [
    { value: COLORS.deepPurple500, label: 'Purple' },
    { value: COLORS.brandBlue, label: 'Blue' },
    { value: COLORS.greenA700, label: 'Green' },
    { value: COLORS.orange200, label: 'Orange' },
    { value: COLORS.red500, label: 'Red' },
    { value: COLORS.deepPurple900, label: 'Deep Purple' },
    { value: COLORS.primaryBlue, label: 'Light Blue' },
    { value: COLORS.lightGreen500, label: 'Light Green' }
  ];

  const iconOptions = [
    { value: 'home', label: 'Home', icon: <HomeIcon /> },
    { value: 'work', label: 'Work', icon: <WorkIcon /> },
    { value: 'person', label: 'Person', icon: <PersonIcon /> },
    { value: 'event', label: 'Event', icon: <EventIcon /> },
    { value: 'cake', label: 'Birthday', icon: <CakeIcon /> },
    { value: 'business', label: 'Business', icon: <BusinessIcon /> }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {title}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Calendar Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Color</InputLabel>
              <Select value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} label="Color">
                {colorOptions.map((color) => (
                  <MenuItem key={color.value} value={color.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          backgroundColor: color.value,
                          borderRadius: 1
                        }}
                      />
                      {color.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Icon</InputLabel>
              <Select value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} label="Icon">
                {iconOptions.map((iconOption) => (
                  <MenuItem key={iconOption.value} value={iconOption.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {iconOption.icon}
                      {iconOption.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="External Calendar URL (Optional)"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              fullWidth
              placeholder="https://calendar.google.com/..."
              helperText="Enter URL to sync with external calendar"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {calendar ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Manage Calendars Dialog
function ManageCalendarsDialog({ open, onClose, calendars, onEdit, onDelete }: any) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Manage Calendars
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {calendars.map((calendar: any) => (
            <Box
              key={calendar.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'background.paper'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    color: calendar.color,
                    backgroundColor: `${calendar.color}20`,
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {calendar.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    {calendar.name}
                  </Typography>
                  {calendar.url && (
                    <Typography variant="caption" color="textSecondary">
                      External: {calendar.url}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton size="small" onClick={() => onEdit(calendar)} sx={{ color: 'primary.main' }}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(calendar.id)} sx={{ color: 'error.main' }}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
