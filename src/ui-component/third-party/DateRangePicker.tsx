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
  DateRangePicker
} from 'react-aria-components';
import { useTheme } from '@mui/material/styles';
import { today, getLocalTimeZone, parseDate } from '@internationalized/date';
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
  style?: React.CSSProperties;
  className?: string;
  sx?: any;
}

export function AllyviaDateRangePicker({ value, label, errorMessage, onChange, style, className, sx }: AllyviaDateRangePickerProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedValue, setFocusedValue] = useState<DateValue | undefined>(value?.end);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Set CSS custom properties for the theme colors
  const calendarStyle = {
    '--primary-main': theme.palette.primary.main,
    '--primary-light': theme.palette.primary.light,
    '--primary-dark': theme.palette.primary.dark,
    '--text-disabled': theme.palette.text.disabled,
    '--hover-color': theme.palette.grey[100]
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
        end: todayDate
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
        end: todayDate
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

  const isValidDateFormat = (dateString: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    return regex.test(dateString);
  };

  const isValidDateRange = (): boolean => {
    if (!startDateInput || !endDateInput || !isValidDateFormat(startDateInput) || !isValidDateFormat(endDateInput)) {
      return false;
    }

    try {
      const [startMonth, startDay, startYear] = startDateInput.split('/');
      const [endMonth, endDay, endYear] = endDateInput.split('/');

      const startDate = parseDate(`${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`);
      const endDate = parseDate(`${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`);

      return startDate.compare(endDate) <= 0;
    } catch (error) {
      return false;
    }
  };

  const formatDateInput = (value: string): string => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');

    // Apply mm/dd/yyyy format
    if (digitsOnly.length >= 8) {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
    } else if (digitsOnly.length >= 4) {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`;
    } else if (digitsOnly.length >= 2) {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
    }
    return digitsOnly;
  };

  const handleDateInputChange = (value: string, setter: (value: string) => void) => {
    const formatted = formatDateInput(value);
    if (formatted.length <= 10) {
      // mm/dd/yyyy = 10 characters
      setter(formatted);
    }
  };

  const handleManualDateChange = () => {
    if (startDateInput && endDateInput && isValidDateFormat(startDateInput) && isValidDateFormat(endDateInput)) {
      try {
        const [startMonth, startDay, startYear] = startDateInput.split('/');
        const [endMonth, endDay, endYear] = endDateInput.split('/');

        const startDate = parseDate(`${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`);
        const endDate = parseDate(`${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`);

        if (startDate.compare(endDate) <= 0) {
          onChange({
            start: startDate,
            end: endDate
          });
          closeWithDelay();
        }
      } catch (error) {
        console.error('Invalid date format:', error);
      }
    }
  };

  const makeDateRangeButton = ({ label }: { label: DefaultDateRangeOptions }) => {
    return (
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
    );
  };

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
      <Group
        className={`date-range-picker-group ${className || ''}`}
        style={{
          border: `1px solid ${theme.palette.primary.light}`,
          backgroundColor: theme.palette.background.paper,
          ...style,
          ...(sx || {})
        }}
      >
        <DateInput slot="start" className="date-range-picker-input" style={{ color: theme.palette.primary.dark }}>
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <span aria-hidden="true" className="date-range-picker-separator" style={{ color: theme.palette.primary.main }}>
          –
        </span>
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
      <Popover
        className="date-range-picker-popover"
        style={{
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.grey[200]}`
        }}
      >
        <Dialog>
          <RangeCalendar focusedValue={focusedValue} onFocusChange={setFocusedValue}>
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
                <CalendarCell date={date} style={{ color: theme.palette.text.primary }} className="calendar-cell date-range-picker-cell">
                  {({ formattedDate, isOutsideMonth }) => <span className={isOutsideMonth ? 'outside-month' : ''}>{formattedDate}</span>}
                </CalendarCell>
              )}
            </CalendarGrid>
          </RangeCalendar>
          {!showManualInput && (
            <div className="date-range-picker-quick-select" style={{ borderTop: `1px solid ${theme.palette.grey[200]}` }}>
              {['today', 'week', 'month', 'year'].map((period) => (
                <div key={period}>{makeDateRangeButton({ label: period as DefaultDateRangeOptions })}</div>
              ))}
            </div>
          )}
          <div className="date-range-picker-manual-section">
            {!showManualInput ? (
              <button
                onClick={() => setShowManualInput(true)}
                className="manual-input-toggle-button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.palette.primary.main,
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                Input dates manually
              </button>
            ) : (
              <div>
                <div
                  style={{ borderTop: `1px solid ${theme.palette.grey[200]}` }}
                  className={`date-range-picker-manual-input ${showManualInput ? 'manual-input-visible' : ''}`}
                >
                  <div className="manual-input-row">
                    <input
                      type="text"
                      placeholder="mm/dd/yyyy"
                      value={startDateInput}
                      onChange={(e) => handleDateInputChange(e.target.value, setStartDateInput)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleManualDateChange();
                        }
                      }}
                      className="manual-date-input"
                      style={{
                        border: `1px solid ${theme.palette.grey[300]}`,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary
                      }}
                    />
                    <span className="manual-input-separator" style={{ color: theme.palette.text.secondary }}>
                      to
                    </span>
                    <input
                      type="text"
                      placeholder="mm/dd/yyyy"
                      value={endDateInput}
                      onChange={(e) => handleDateInputChange(e.target.value, setEndDateInput)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleManualDateChange();
                        }
                      }}
                      className="manual-date-input"
                      style={{
                        border: `1px solid ${theme.palette.grey[300]}`,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary
                      }}
                    />
                    <button
                      onClick={handleManualDateChange}
                      className="manual-input-apply-button"
                      disabled={!isValidDateRange()}
                      style={{
                        border: `1px solid ${theme.palette.primary.main}`,
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        opacity: !isValidDateRange() ? 0.5 : 1
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowManualInput(false)}
                  className="manual-input-toggle-button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.palette.primary.main,
                    cursor: 'pointer',
                    fontSize: '13px',
                    textDecoration: 'underline',
                    marginTop: '8px'
                  }}
                >
                  Show preset ranges
                </button>
              </div>
            )}
          </div>
        </Dialog>
      </Popover>
    </DateRangePicker>
  );
}
