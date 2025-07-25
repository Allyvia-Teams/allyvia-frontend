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


  return (
    <DateRangePicker onChange={onChange} value={value} style={{ fontFamily: 'inherit' }}>
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
        isNonModal={true}
        style={{ 
          backgroundColor: theme.palette.background.paper, 
          border: `1px solid ${theme.palette.grey[200]}`, 
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '16px'
      }}>
        <Dialog>
          <RangeCalendar>
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
              padding: '20px'
            }}>
              {(date) => <CalendarCell 
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
                  position: 'relative'
                }}
                className="calendar-cell"
              />}
            </CalendarGrid>
            <style>{`
              .calendar-cell:hover {
                background-color: ${theme.palette.grey[100]} !important;
              }
              
              .calendar-cell[data-selected] {
                background-color: ${theme.palette.primary.main} !important;
                color: white !important;
              }
              
              .calendar-cell[data-selection-start] {
                background-color: ${theme.palette.primary.main} !important;
                color: white !important;
                border-top-left-radius: 6px !important;
                border-bottom-left-radius: 6px !important;
              }
              
              .calendar-cell[data-selection-end] {
                background-color: ${theme.palette.primary.main} !important;
                color: white !important;
                border-top-right-radius: 6px !important;
                border-bottom-right-radius: 6px !important;
              }
              
              .calendar-cell[data-range-selection] {
                background-color: ${theme.palette.primary.light} !important;
                color: ${theme.palette.primary.dark} !important;
                border-radius: 0 !important;
              }
              
              .calendar-cell[data-outside-month] {
                color: ${theme.palette.text.disabled} !important;
              }
              
              .calendar-cell[data-unavailable] {
                color: ${theme.palette.text.disabled} !important;
                cursor: not-allowed !important;
              }
            `}</style>
          </RangeCalendar>
        </Dialog>
      </Popover>
    </DateRangePicker>
  );
}
