import React, { useState, useEffect } from 'react';
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

// Event interface
interface Event {
  id: number;
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

// Mock data for calendars
const initialCalendars = [
  {
    id: 'personal',
    name: 'Personal',
    color: '#673ab7',
    icon: <HomeIcon />,
    checked: true
  },
  {
    id: 'employee',
    name: 'Employee',
    color: '#69A1EA',
    icon: <PersonIcon />,
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

// Mock data for events in August 2025
const initialEvents: Event[] = [
  {
    id: 1,
    title: 'All Day Event',
    date: '2025-08-01',
    time: 'All day',
    calendar: 'personal',
    color: '#673ab7',
    allDay: true,
    description: 'This is an all day event'
  },
  {
    id: 2,
    title: 'Long Event',
    date: '2025-08-08',
    endDate: '2025-08-09',
    time: 'All day',
    calendar: 'employee',
    color: '#69A1EA',
    multiDay: true,
    description: 'A long event spanning multiple days'
  },
  {
    id: 3,
    title: 'Repeating Event',
    date: '2025-08-09',
    time: '10:00 AM',
    calendar: 'personal',
    color: '#673ab7',
    description: 'A repeating event'
  },
  {
    id: 4,
    title: 'Conference',
    date: '2025-08-11',
    endDate: '2025-08-12',
    time: 'All day',
    calendar: 'employee',
    color: '#69A1EA',
    multiDay: true,
    description: 'Annual company conference'
  },
  {
    id: 5,
    title: 'Meeting',
    date: '2025-08-12',
    time: '2:00 PM',
    calendar: 'employee',
    color: '#69A1EA',
    description: 'Team meeting'
  },
  {
    id: 6,
    title: 'Lunch',
    date: '2025-08-12',
    time: '12:00 PM',
    calendar: 'personal',
    color: '#673ab7',
    description: 'Lunch with colleagues'
  },
  {
    id: 7,
    title: 'Birthday Party',
    date: '2025-08-13',
    time: '6:00 PM',
    calendar: 'personal',
    color: '#673ab7',
    description: 'Birthday celebration'
  },
  {
    id: 8,
    title: 'Meeting',
    date: '2025-08-14',
    time: '10:00 AM',
    calendar: 'employee',
    color: '#69A1EA',
    description: 'Project review meeting'
  },
  {
    id: 9,
    title: 'Happy Hour',
    date: '2025-08-14',
    time: '5:00 PM',
    calendar: 'personal',
    color: '#673ab7',
    description: 'Friday happy hour'
  },
  {
    id: 10,
    title: 'Dinner',
    date: '2025-08-15',
    time: '7:00 PM',
    calendar: 'personal',
    color: '#673ab7',
    description: 'Dinner with friends'
  },
  {
    id: 11,
    title: 'Repeating Event',
    date: '2025-08-16',
    time: '10:00 AM',
    calendar: 'personal',
    color: '#673ab7',
    description: 'Weekly repeating event'
  },
  {
    id: 12,
    title: 'Click for Google',
    date: '2025-08-28',
    time: 'All day',
    calendar: 'employee',
    color: '#69A1EA',
    allDay: true,
    description: 'Google calendar integration'
  }
];

// ==============================|| CALENDAR PAGE ||============================== //

export default function CalendarPage() {
  const theme = useTheme();
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(['personal', 'employee']);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 7, 1)); // August 2025
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

  // Auto-scroll to current time when switching to week or day view
  useEffect(() => {
    if (viewMode === 'week' || viewMode === 'day') {
      scrollToCurrentTimeOnViewChange();
    }
  }, [viewMode]);

  const handleCalendarToggle = (calendarId: string) => {
    setSelectedCalendars(prev => 
      prev.includes(calendarId) 
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
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

  const handleDeleteEvent = (event: Event) => {
    setEventToDelete(event);
    setShowDeleteDialog(true);
  };

  const confirmDeleteEvent = (deleteSeries: boolean = false) => {
    if (eventToDelete) {
      if (eventToDelete.multiDay && !deleteSeries) {
        // Delete only the current day's instance
        setEvents(prev => prev.filter(event => event.id !== eventToDelete.id));
      } else {
        // Delete the entire series
        setEvents(prev => prev.filter(event => event.id !== eventToDelete.id));
      }
      setShowDeleteDialog(false);
      setEventToDelete(null);
    }
  };

  const validateTimeFormat = (time: string): boolean => {
    if (time === 'All day') return true;
    
    // Regex for time format: HH:MM AM/PM (e.g., "2:30 PM", "14:30 AM")
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
    return timeRegex.test(time);
  };

  const handleSaveEvent = (eventData: Partial<Event>) => {
    // Validate time format
    if (eventData.time && !eventData.allDay && !validateTimeFormat(eventData.time)) {
      alert('Please enter time in format: HH:MM AM/PM (e.g., "2:30 PM")');
      return;
    }

    if (editingEvent) {
      // Update existing event
      setEvents(prev => prev.map(event => 
        event.id === editingEvent.id ? { ...event, ...eventData } : event
      ));
    } else {
      // Add new event
      const newEvent: Event = {
        id: Date.now(),
        title: eventData.title || '',
        date: eventData.date || selectedDate?.toISOString().split('T')[0] || '',
        endDate: eventData.endDate,
        time: eventData.time || 'All day',
        calendar: eventData.calendar || 'personal',
        color: eventData.color || '#673ab7',
        multiDay: !!(eventData.endDate && eventData.date !== eventData.endDate),
        allDay: eventData.allDay,
        description: eventData.description
      };
      setEvents(prev => [...prev, newEvent]);
    }
    setOpenEventDialog(false);
    setEditingEvent(null);
    setSelectedDate(null);
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
    return events.filter(event => {
      if (event.multiDay) {
        const eventStart = new Date(event.date);
        const eventEnd = new Date(event.endDate!);
        return date >= eventStart && date <= eventEnd;
      }
      return event.date === dateString;
    });
  };

  const getMultiDayEvents = () => {
    return events.filter(event => event.multiDay);
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
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
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
    return currentHour + (currentMinute / 60);
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
    
    setMockCalendars((prev: any[]) => prev.map((cal: any) => 
      cal.id === editingCalendar.id 
        ? { 
            ...cal, 
            name: calendarData.name,
            color: calendarData.color,
            icon: iconMap[calendarData.icon] || <HomeIcon />,
            url: calendarData.url || ''
          }
        : cal
    ));
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
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
      {/* Day Headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <Box key={day} sx={{ p: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
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
              minHeight: 120,
              border: 1,
              borderColor: 'divider',
              p: 1,
              backgroundColor: day.isCurrentMonth ? 'background.paper' : 'action.hover',
              position: 'relative',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: day.isCurrentMonth ? 'action.hover' : 'action.selected'
              }
            }}
            onClick={() => handleAddEvent(day.date)}
          >
            <Typography
              variant="body2"
              sx={{
                color: day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                fontWeight: isToday(day.date) ? 'bold' : 'normal',
                mb: 1,
                textAlign: 'center',
                ...(isToday(day.date) && {
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                })
              }}
            >
              {formatDate(day.date)}
            </Typography>

            {/* Events */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {visibleEvents.map((event) => (
                <Box
                  key={event.id}
                  sx={{
                    backgroundColor: event.color,
                    color: 'black',
                    p: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    '&:hover': {
                      opacity: 0.8
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
                  <Typography variant="caption" noWrap sx={{ fontWeight: 'bold', color: 'white' }}>
                    {event.title}
                  </Typography>
                  {event.time !== 'All day' && (
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {event.time}
                    </Typography>
                  )}
                </Box>
              ))}
              {moreEvents > 0 && (
                <Typography variant="caption" color="textSecondary">
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
        <Box sx={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', flex: 1, overflow: 'auto', borderTop: 1, borderColor: 'divider' }}>
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
                const hourEvents = events.filter(event => {
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
                          color: 'white',
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
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white' }}>
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
          <Box sx={{ 
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
          }}>
            All Day
          </Box>
          
          {weekDays.map((day, dayIndex) => {
            const events = getEventsForDate(day);
            const allDayEvents = events.filter(event => event.allDay);
            
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
                      color: 'white',
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
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white' }}>
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
                  .filter(event => {
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
                        color: 'black',
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
                                             <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white' }}>
                         {event.time} - {event.title}
                       </Typography>
                    </Box>
                  ))}
              </Box>
            ))}

            {/* All-day events */}
            {dayEvents
              .filter(event => event.allDay)
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
                    color: 'black',
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
                                     <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white' }}>
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
          .filter(event => selectedCalendars.includes(event.calendar))
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
                secondary={`${new Date(event.date).toLocaleDateString()} • ${event.time} • ${mockCalendars.find(cal => cal.id === event.calendar)?.name}`}
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
                  color: 'white',
                  '& .MuiButton-startIcon': {
                    color: 'white'
                  }
                }}
                onClick={() => handleAddEvent(new Date())}
              >
                New event
              </Button>

              {/* Mini Calendar */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {formatMonthYear(currentDate)}
                </Typography>
                <Grid container spacing={1}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <Grid size={{ xs: 12/7 }} key={day}>
                      <Typography variant="caption" align="center" display="block">
                        {day}
                      </Typography>
                    </Grid>
                  ))}
                  {getDaysInMonth(currentDate).slice(0, 35).map((day, index) => (
                    <Grid size={{ xs: 12/7 }} key={index}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          backgroundColor: isToday(day.date) ? theme.palette.primary.main : 'transparent',
                          color: isToday(day.date) ? 'white' : day.isCurrentMonth ? 'text.primary' : 'text.disabled',
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
                      <IconButton 
                        size="small"
                        onClick={() => setShowAddCalendarDialog(true)}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Manage Calendars">
                      <IconButton 
                        size="small"
                        onClick={() => setShowManageCalendarsDialog(true)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                {mockCalendars.map((calendar) => (
                  <FormControlLabel
                    key={calendar.id}
                    control={
                      <Checkbox
                        checked={selectedCalendars.includes(calendar.id)}
                        onChange={() => handleCalendarToggle(calendar.id)}
                        sx={{
                          color: calendar.color,
                          '&.Mui-checked': {
                            color: calendar.color,
                          },
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          color: calendar.color,
                          backgroundColor: `${calendar.color}20`,
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
                  color: 'white',
                  '&:hover': { 
                    backgroundColor: theme.palette.secondary.dark,
                    color: 'white'
                  }
                }}
              >
                Today
              </Button>
              <IconButton onClick={() => navigateMonth('next')}>
                <NavigateNextIcon />
              </IconButton>
            </Box>
            
            <Typography variant="h4">
              {getDateRangeDisplay()}
            </Typography>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton 
                value="month"
                sx={{
                  backgroundColor: viewMode === 'month' ? theme.palette.secondary.main : 'white',
                  color: viewMode === 'month' ? 'white' : 'black',
                  '&:hover': {
                    backgroundColor: viewMode === 'month' ? theme.palette.secondary.dark : '#f5f5f5'
                  }
                }}
              >
                Month
              </ToggleButton>
              <ToggleButton 
                value="week"
                sx={{
                  backgroundColor: viewMode === 'week' ? theme.palette.secondary.main : 'white',
                  color: viewMode === 'week' ? 'white' : 'black',
                  '&:hover': {
                    backgroundColor: viewMode === 'week' ? theme.palette.secondary.dark : '#f5f5f5'
                  }
                }}
              >
                Week
              </ToggleButton>
              <ToggleButton 
                value="day"
                sx={{
                  backgroundColor: viewMode === 'day' ? theme.palette.secondary.main : 'white',
                  color: viewMode === 'day' ? 'white' : 'black',
                  '&:hover': {
                    backgroundColor: viewMode === 'day' ? theme.palette.secondary.dark : '#f5f5f5'
                  }
                }}
              >
                Day
              </ToggleButton>
              <ToggleButton 
                value="list"
                sx={{
                  backgroundColor: viewMode === 'list' ? theme.palette.secondary.main : 'white',
                  color: viewMode === 'list' ? 'white' : 'black',
                  '&:hover': {
                    backgroundColor: viewMode === 'list' ? theme.palette.secondary.dark : '#f5f5f5'
                  }
                }}
              >
                List
              </ToggleButton>
            </ToggleButtonGroup>
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
          <Typography>
            Are you sure you want to delete "{eventToDelete?.title}"?
          </Typography>
          {eventToDelete?.multiDay && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                This is a multi-day event. What would you like to delete?
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button 
                  onClick={() => confirmDeleteEvent(false)} 
                  variant="outlined" 
                  color="error"
                  fullWidth
                >
                  Delete this day only
                </Button>
                <Button 
                  onClick={() => confirmDeleteEvent(true)} 
                  color="error" 
                  variant="contained"
                  fullWidth
                >
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
  onTimeSelect: (callback: (time: string) => void) => void;
}

function EventDialog({ open, onClose, onSave, onDelete, event, calendars, selectedDate, onTimeSelect }: EventDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    endDate: '',
    time: 'All day',
    calendar: 'personal',
    color: '#673ab7',
    allDay: false,
    description: ''
  });

  // Update form data when event changes
  React.useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        date: event.date || '',
        endDate: event.endDate || '',
        time: event.time || 'All day',
        calendar: event.calendar || 'personal',
        color: event.color || '#673ab7',
        allDay: event.allDay || false,
        description: event.description || ''
      });
    } else {
      setFormData({
        title: '',
        date: selectedDate?.toISOString().split('T')[0] || '',
        endDate: '',
        time: 'All day',
        calendar: 'personal',
        color: '#673ab7',
        allDay: false,
        description: ''
      });
    }
  }, [event, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const colorOptions = [
    { value: '#673ab7', label: 'Purple' },
    { value: '#69A1EA', label: 'Blue' },
    { value: '#00e676', label: 'Green' },
    { value: '#ffab91', label: 'Orange' },
    { value: '#f44336', label: 'Red' }
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
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
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
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                fullWidth
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Box>

            <MuiFormControlLabel
              control={
                <Switch
                  checked={formData.allDay}
                  onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                />
              }
              label="All Day Event"
            />

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
                onChange={(e) => setFormData({ ...formData, calendar: e.target.value })}
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
              <Select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                label="Color"
              >
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
    setStartHour(prev => {
      if (increment) {
        return prev >= 12 ? 1 : prev + 1;
      } else {
        return prev <= 1 ? 12 : prev - 1;
      }
    });
  };

  const handleStartMinuteChange = (increment: boolean) => {
    setStartMinute(prev => {
      if (increment) {
        return prev >= 55 ? 0 : prev + 5;
      } else {
        return prev <= 0 ? 55 : prev - 5;
      }
    });
  };

  const handleEndHourChange = (increment: boolean) => {
    setEndHour(prev => {
      if (increment) {
        return prev >= 12 ? 1 : prev + 1;
      } else {
        return prev <= 1 ? 12 : prev - 1;
      }
    });
  };

  const handleEndMinuteChange = (increment: boolean) => {
    setEndMinute(prev => {
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
      <DialogTitle sx={{ textAlign: 'center', pb: 1, color: 'text.secondary' }}>
        SELECT TIME
      </DialogTitle>
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
                          color: 'white',
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
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'text.primary' }}>:</Typography>

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
                          color: 'white',
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
                          color: 'white',
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
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'text.primary' }}>:</Typography>

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
                          color: 'white',
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
    color: calendar?.color || '#673ab7',
    icon: calendar?.icon || 'home',
    url: calendar?.url || ''
  });

  const colorOptions = [
    { value: '#673ab7', label: 'Purple' },
    { value: '#69A1EA', label: 'Blue' },
    { value: '#00e676', label: 'Green' },
    { value: '#ffab91', label: 'Orange' },
    { value: '#f44336', label: 'Red' },
    { value: '#9c27b0', label: 'Deep Purple' },
    { value: '#2196f3', label: 'Light Blue' },
    { value: '#4caf50', label: 'Light Green' }
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
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
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
              <Select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                label="Color"
              >
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
              <Select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                label="Icon"
              >
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
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
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
                <Box sx={{ 
                  color: calendar.color,
                  backgroundColor: `${calendar.color}20`,
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
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
                <IconButton
                  size="small"
                  onClick={() => onEdit(calendar)}
                  sx={{ color: 'primary.main' }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(calendar.id)}
                  sx={{ color: 'error.main' }}
                >
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