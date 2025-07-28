// Adapted from https://react-spectrum.adobe.com/react-aria/DateRangePicker.html

import {
  DateValue,
  ValidationResult,
  Button,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DateSegment,
  Dialog,
  FieldError,
  Heading,
  Group,
  Label,
  Popover,
  RangeCalendar,
  DateRangePicker,
} from 'react-aria-components';
import { useTheme } from '@mui/material/styles';
import { today, getLocalTimeZone } from '@internationalized/date';
import { useState, useRef } from 'react';
import './DateRangePicker.css';

type DefaultDateRangeOptions = 'today' | 'week' | 'month' | 'year';

export interface RangeValue {
  start: DateValue;
  end: DateValue;
}

interface AllyviaDateRangePickerProps {
  onChange: (value: RangeValue | null) => void;
  errorMessage?: string | ((validation: ValidationResult) => string);
  label?: string;
  value?: RangeValue;
}

export function AllyviaDateRangePicker({ value, label, errorMessage, onChange }: AllyviaDateRangePickerProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedValue, setFocusedValue] = useState<DateValue | undefined>(value?.end);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set CSS custom properties for the theme colors
  const calendarStyle = {
    '--primary-main': theme.palette.primary.main,
    '--primary-light': theme.palette.primary.light,
    '--primary-dark': theme.palette.primary.dark,
    '--text-disabled': theme.palette.text.disabled,
    '--hover-color': theme.palette.grey[100],
  } as React.CSSProperties;

  const closeWithDelay = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 500);
  };

  const handleQuickSelect = (period: DefaultDateRangeOptions) => {
    const todayDate = today(getLocalTimeZone());
    
    if (period === 'today') {
      onChange({
        start: todayDate,
        end: todayDate,
      });
    } else {
      const periodMap = {
        week: { weeks: 1 },
        month: { months: 1 },
        year: { years: 1 }
      };
      
      const startDate = todayDate.subtract(periodMap[period]);

      onChange({
        start: startDate,
        end: todayDate,
      });
    }
    
    closeWithDelay();
  };

  const handleRangeChange = (newValue: RangeValue | null) => {
    onChange(newValue);
    if (newValue && newValue.start && newValue.end) {
      closeWithDelay();
    }
  };



  const makeDateRangeButton = ({ label }: { label: DefaultDateRangeOptions }) => {
    return(
      <button
                onClick={() => handleQuickSelect(label)}
                className="date-range-picker-quick-button"
                style={{
                  border: `1px solid ${theme.palette.primary.light}`,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.primary.main
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.palette.primary.light;
                  e.currentTarget.style.color = theme.palette.primary.dark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.palette.background.paper;
                  e.currentTarget.style.color = theme.palette.primary.main;
                }}
              >
                {label === 'today' ? 'Today' : `1 ${label.charAt(0).toUpperCase() + label.slice(1)}`}
              </button>
    )
  }



  return (
    <DateRangePicker 
      onChange={handleRangeChange} 
      value={value} 
      className="date-range-picker"
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
        setIsOpen(open);
        if (open && value?.end) {
          setFocusedValue(value.end);
        }
      }}
    >
      <Label className="date-range-picker-label" style={{ color: theme.palette.primary.dark }}>
        {label}
      </Label>
      <Group className="date-range-picker-group" style={{ 
        border: `1px solid ${theme.palette.primary.light}`, 
        backgroundColor: theme.palette.background.paper
      }}>
        <DateInput slot="start" className="date-range-picker-input" style={{ color: theme.palette.primary.dark }}>
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <span aria-hidden="true" className="date-range-picker-separator" style={{ color: theme.palette.primary.main }}>–</span>
        <DateInput slot="end" className="date-range-picker-input" style={{ color: theme.palette.primary.dark }}>
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <Button className="date-range-picker-button" style={{ color: theme.palette.primary.main }}>
          ▼
        </Button>
        <span className="date-range-picker-dropdown-icon" style={{ color: theme.palette.primary.main }}>
          ▼
        </span>
      </Group>
      <FieldError className="date-range-picker-error" style={{ color: theme.palette.error.main }}>
        {errorMessage}
      </FieldError>
      <Popover className="date-range-picker-popover" style={{ 
          backgroundColor: theme.palette.background.paper, 
          border: `1px solid ${theme.palette.grey[200]}`
      }}>
        <Dialog >
          <RangeCalendar
            focusedValue={focusedValue}
            onFocusChange={setFocusedValue}
          >
            <header className="date-range-picker-header">
              <Button slot="previous" className="date-range-picker-nav-button" style={{ color: theme.palette.primary.main }}>
                ◀
              </Button>
              <Heading className="date-range-picker-heading" style={{ color: theme.palette.primary.dark }} />
              <Button slot="next" className="date-range-picker-nav-button" style={{ color: theme.palette.primary.main }}>
                ▶
              </Button>
            </header>
            <CalendarGrid className="date-range-picker-grid" style={{ ...calendarStyle }}>
              {(date) => (
                <CalendarCell 
                  date={date} 
                  style={{ color: theme.palette.text.primary }}
                  className="calendar-cell date-range-picker-cell"
                >
                  {({ formattedDate, isOutsideMonth }) => (
                    <span className={isOutsideMonth ? 'outside-month' : ''}>
                      {formattedDate}
                    </span>
                  )}
                </CalendarCell>
              )}
            </CalendarGrid>
          </RangeCalendar>
          <div className="date-range-picker-quick-select" style={{ borderTop: `1px solid ${theme.palette.grey[200]}` }}>
            {['today', 'week', 'month', 'year'].map((period) => (
              makeDateRangeButton({ label: period as DefaultDateRangeOptions })
            ))}
          </div>
        </Dialog>
      </Popover>
    </DateRangePicker>
  );
}

