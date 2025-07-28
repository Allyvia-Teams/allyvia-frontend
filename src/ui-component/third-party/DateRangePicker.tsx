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

  const handleQuickSelect = (period: 'week' | 'month' | 'year') => {
    const todayDate = today(getLocalTimeZone());
    let startDate: DateValue;

    switch (period) {
      case 'week':
        startDate = todayDate.subtract({ weeks: 1 });
        break;
      case 'month':
        startDate = todayDate.subtract({ months: 1 });
        break;
      case 'year':
        startDate = todayDate.subtract({ years: 1 });
        break;
    }

    onChange({
      start: startDate,
      end: todayDate,
    });
    
    closeWithDelay();
  };

  const handleRangeChange = (newValue: RangeValue | null) => {
    onChange(newValue);
    if (newValue && newValue.start && newValue.end) {
      closeWithDelay();
    }
  };

  return (
    <DateRangePicker 
      onChange={handleRangeChange} 
      value={value} 
      style={{ fontFamily: 'inherit' }}
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
      <Label style={{ color: theme.palette.primary.dark, fontWeight: '500', marginBottom: '8px', display: 'block' }}>
        {label}
      </Label>
      <Group style={{ 
        display: 'flex', 
        alignItems: 'center', 
        border: `1px solid ${theme.palette.primary.light}`, 
        borderRadius: '8px', 
        padding: '8px 12px',
        backgroundColor: theme.palette.background.paper,
        gap: '8px',
        cursor: 'pointer',
        position: 'relative'
      }}>
        <DateInput slot="start" style={{ outline: 'none', border: 'none', color: theme.palette.primary.dark }}>
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <span aria-hidden="true" style={{ color: theme.palette.primary.main }}>–</span>
        <DateInput slot="end" style={{ outline: 'none', border: 'none', color: theme.palette.primary.dark }}>
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <Button style={{ 
          background: 'none', 
          border: 'none', 
          color: theme.palette.primary.main, 
          cursor: 'pointer',
          padding: '4px',
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          opacity: 0,
          zIndex: 1
        }}>
          ▼
        </Button>
        <span style={{ 
          color: theme.palette.primary.main,
          fontSize: '12px',
          pointerEvents: 'none'
        }}>
          ▼
        </span>
      </Group>
      <FieldError style={{ color: theme.palette.error.main, fontSize: '14px', marginTop: '4px' }}>
        {errorMessage}
      </FieldError>
      <Popover 
        style={{ 
          backgroundColor: theme.palette.background.paper, 
          border: `1px solid ${theme.palette.grey[200]}`, 
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '16px'
      }}>
        <Dialog>
          <RangeCalendar 
            focusedValue={focusedValue}
            onFocusChange={setFocusedValue}
          >
            <header style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <Button slot="previous" style={{ 
                background: 'none', 
                border: 'none', 
                color: theme.palette.primary.main, 
                cursor: 'pointer',
                fontSize: '18px',
                padding: '8px'
              }}>
                ◀
              </Button>
              <Heading style={{ color: theme.palette.primary.dark, fontWeight: '600' }} />
              <Button slot="next" style={{ 
                background: 'none', 
                border: 'none', 
                color: theme.palette.primary.main, 
                cursor: 'pointer',
                fontSize: '18px',
                padding: '8px'
              }}>
                ▶
              </Button>
            </header>
            <CalendarGrid style={{ 
              padding: '20px',
              ...calendarStyle
            }}>
              {(date) => (
                <CalendarCell 
                  date={date} 
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'none',
                    color: theme.palette.text.primary,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  className="calendar-cell"
                >
                  {({ formattedDate, isOutsideMonth }) => (
                    <span className={isOutsideMonth ? 'outside-month' : ''}>
                      {isOutsideMonth ? '' : formattedDate}
                    </span>
                  )}
                </CalendarCell>
              )}
            </CalendarGrid>
          </RangeCalendar>
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${theme.palette.grey[200]}`,
          }}>
            <button
              onClick={() => handleQuickSelect('week')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: `1px solid ${theme.palette.primary.light}`,
                borderRadius: '6px',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.primary.main,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
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
              1 Week
            </button>
            <button
              onClick={() => handleQuickSelect('month')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: `1px solid ${theme.palette.primary.light}`,
                borderRadius: '6px',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.primary.main,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
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
              1 Month
            </button>
            <button
              onClick={() => handleQuickSelect('year')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: `1px solid ${theme.palette.primary.light}`,
                borderRadius: '6px',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.primary.main,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
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
              1 Year
            </button>
          </div>
        </Dialog>
      </Popover>
    </DateRangePicker>
  );
}
