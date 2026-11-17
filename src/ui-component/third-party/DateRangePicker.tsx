// Allyvia's one date-range picker. Named presets on the left, a two-month
// calendar, typed start/end fields, and Apply/Cancel. Built on React Aria
// (https://react-spectrum.adobe.com/react-aria/RangeCalendar.html) for keyboard
// and screen-reader support. The date logic lives in ./dateRangePresets.

import {
  Button,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateValue,
  Dialog,
  DialogTrigger,
  Heading,
  Popover,
  RangeCalendar,
  ValidationResult
} from 'react-aria-components';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { getLocalTimeZone, isSameDay, today } from '@internationalized/date';
import { IconCalendar, IconChevronDown, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useId, useMemo, useState } from 'react';
import {
  dayCount,
  formatRangeLabel,
  formatTypedDate,
  getPresets,
  maskDateInput,
  matchPreset,
  parseTypedDate,
  rangeError
} from './dateRangePresets';
import './DateRangePicker.css';

export interface RangeValue {
  start: DateValue;
  end: DateValue;
}

interface AllyviaDateRangePickerProps {
  onChange: (value: RangeValue | null) => void;
  errorMessage?: string | ((validation: ValidationResult) => string);
  label?: string;
  value?: RangeValue | null;
  style?: React.CSSProperties;
  className?: string;
  sx?: any;
  maxDate?: DateValue;
  minDate?: DateValue;
  placeholder?: string;
}

export function AllyviaDateRangePicker({
  value: controlledValue,
  label,
  errorMessage,
  onChange,
  style,
  className,
  maxDate,
  minDate,
  placeholder = 'Select dates'
}: AllyviaDateRangePickerProps) {
  const theme = useTheme();
  const twoMonths = useMediaQuery('(min-width:780px)');
  const fieldId = useId();

  const [isOpen, setIsOpen] = useState(false);
  // Callers that pass no `value` at all (the item trend in the inventory modal)
  // still need the trigger to show what was picked, so remember it here.
  const [uncontrolledValue, setUncontrolledValue] = useState<RangeValue | null>(null);
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  // The draft is what the calendar shows while the popover is open. Nothing
  // reaches onChange until Apply (or a preset, which applies in one click).
  const [draft, setDraft] = useState<RangeValue | null>(value ?? null);
  const [focusedValue, setFocusedValue] = useState<DateValue | undefined>(value?.end);
  const [startText, setStartText] = useState('');
  const [endText, setEndText] = useState('');

  // Re-read "today" on each open so a tab left open overnight stays right.
  const todayDate = useMemo(() => today(getLocalTimeZone()), [isOpen]);
  const bounds = useMemo(() => ({ minDate, maxDate }), [minDate, maxDate]);
  const presets = useMemo(() => getPresets(todayDate, bounds), [todayDate, bounds]);

  const cssVars = {
    '--drp-primary': theme.palette.primary.main,
    '--drp-primary-dark': theme.palette.primary.dark,
    '--drp-primary-contrast': theme.palette.primary.contrastText,
    '--drp-range': alpha(theme.palette.primary.main, 0.14),
    '--drp-ring': alpha(theme.palette.primary.main, 0.2),
    '--drp-paper': theme.palette.background.paper,
    '--drp-text': theme.palette.text.primary,
    '--drp-muted': theme.palette.text.secondary,
    '--drp-disabled': theme.palette.text.disabled,
    '--drp-border': theme.palette.divider,
    '--drp-hover': theme.palette.action.hover,
    '--drp-error': theme.palette.error.main
  } as React.CSSProperties;

  const loadDraft = (range: RangeValue | null) => {
    setDraft(range);
    setStartText(range ? formatTypedDate(range.start) : '');
    setEndText(range ? formatTypedDate(range.end) : '');
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      loadDraft(value ?? null);
      const anchor = value?.end ?? todayDate;
      setFocusedValue(maxDate && anchor.compare(maxDate) > 0 ? maxDate : anchor);
    }
    setIsOpen(open);
  };

  const commit = (range: RangeValue) => {
    setUncontrolledValue(range);
    onChange(range);
    setIsOpen(false);
  };

  // The typed fields are the source of truth for Apply; the calendar writes
  // into them, and a complete valid pair typed by hand moves the calendar.
  const typedStart = parseTypedDate(startText);
  const typedEnd = parseTypedDate(endText);
  const bothComplete = startText.length === 10 && endText.length === 10;
  const typedError = !bothComplete
    ? null
    : !typedStart || !typedEnd
      ? 'Enter both dates as mm/dd/yyyy.'
      : rangeError(typedStart, typedEnd, bounds);
  const applicable: RangeValue | null = typedStart && typedEnd && !typedError ? { start: typedStart, end: typedEnd } : null;

  const handleTyped = (which: 'start' | 'end', raw: string) => {
    const text = maskDateInput(raw);
    const nextStartText = which === 'start' ? text : startText;
    const nextEndText = which === 'end' ? text : endText;
    setStartText(nextStartText);
    setEndText(nextEndText);
    const s = parseTypedDate(nextStartText);
    const e = parseTypedDate(nextEndText);
    if (s && e && !rangeError(s, e, bounds)) {
      setDraft({ start: s, end: e });
      setFocusedValue(e);
    }
  };

  const applyOnEnter = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && applicable) commit(applicable);
  };

  const committedPreset = matchPreset(value, todayDate, bounds);
  const draftPreset = matchPreset(applicable, todayDate, bounds);
  const summary = applicable
    ? `${dayCount(applicable)} ${dayCount(applicable) === 1 ? 'day' : 'days'} selected`
    : 'Pick a start and an end date';

  const renderGrid = (offsetMonths: number) => (
    <CalendarGrid className="drp-grid" weekdayStyle="short" offset={offsetMonths ? { months: offsetMonths } : undefined}>
      <CalendarGridHeader>{(day) => <CalendarHeaderCell className="drp-weekday">{day.slice(0, 2)}</CalendarHeaderCell>}</CalendarGridHeader>
      <CalendarGridBody>
        {(date) => <CalendarCell date={date} className={`calendar-cell drp-cell${isSameDay(date, todayDate) ? ' drp-today' : ''}`} />}
      </CalendarGridBody>
    </CalendarGrid>
  );

  return (
    <div className="date-range-picker" style={cssVars}>
      {label ? <span className="date-range-picker-label">{label}</span> : null}
      <DialogTrigger isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Button className={`date-range-picker-group drp-trigger ${className || ''}`} style={style} aria-label={label || 'Date range'}>
          <IconCalendar className="drp-trigger-icon" size={18} stroke={1.8} aria-hidden="true" />
          {value ? (
            <span className="drp-trigger-text">
              {committedPreset ? <span className="drp-trigger-preset">{committedPreset.label}</span> : null}
              <span className={committedPreset ? 'drp-trigger-range' : 'drp-trigger-preset'}>{formatRangeLabel(value)}</span>
            </span>
          ) : (
            <span className="drp-trigger-text drp-trigger-range">{placeholder}</span>
          )}
          <IconChevronDown className="drp-trigger-chevron" size={16} stroke={1.8} aria-hidden="true" />
        </Button>
        <Popover className="date-range-picker-popover" placement="bottom end" offset={6} style={cssVars}>
          <Dialog className="drp-dialog" aria-label="Choose a date range">
            <div className="drp-body">
              {presets.length > 0 && (
                <div className="drp-presets" role="group" aria-label="Quick ranges">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="drp-preset"
                      aria-pressed={draftPreset?.id === preset.id}
                      onClick={() => commit(preset.range)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
              <RangeCalendar
                className="drp-calendar"
                aria-label="Date range"
                value={draft}
                onChange={(range) => loadDraft(range)}
                focusedValue={focusedValue}
                onFocusChange={setFocusedValue}
                minValue={minDate}
                maxValue={maxDate}
                visibleDuration={{ months: twoMonths ? 2 : 1 }}
                selectionAlignment="end"
              >
                <header className="drp-header">
                  <Button slot="previous" className="drp-nav" aria-label="Previous month">
                    <IconChevronLeft size={18} stroke={1.8} aria-hidden="true" />
                  </Button>
                  <Heading className="drp-heading" />
                  <Button slot="next" className="drp-nav" aria-label="Next month">
                    <IconChevronRight size={18} stroke={1.8} aria-hidden="true" />
                  </Button>
                </header>
                <div className="drp-months">
                  {renderGrid(0)}
                  {twoMonths ? renderGrid(1) : null}
                </div>
              </RangeCalendar>
            </div>
            <div className="drp-footer">
              <div className="drp-field">
                <label htmlFor={`${fieldId}-start`}>Start</label>
                <input
                  id={`${fieldId}-start`}
                  type="text"
                  inputMode="numeric"
                  placeholder="mm/dd/yyyy"
                  autoComplete="off"
                  value={startText}
                  aria-invalid={!!typedError}
                  onChange={(e) => handleTyped('start', e.target.value)}
                  onKeyDown={applyOnEnter}
                />
              </div>
              <div className="drp-field">
                <label htmlFor={`${fieldId}-end`}>End</label>
                <input
                  id={`${fieldId}-end`}
                  type="text"
                  inputMode="numeric"
                  placeholder="mm/dd/yyyy"
                  autoComplete="off"
                  value={endText}
                  aria-invalid={!!typedError}
                  onChange={(e) => handleTyped('end', e.target.value)}
                  onKeyDown={applyOnEnter}
                />
              </div>
              <span className={`drp-summary${typedError ? ' drp-summary-error' : ''}`} role="status">
                {typedError || summary}
              </span>
              <div className="drp-actions">
                <button type="button" className="drp-button" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="drp-button drp-button-primary"
                  disabled={!applicable}
                  onClick={() => applicable && commit(applicable)}
                >
                  Apply
                </button>
              </div>
            </div>
          </Dialog>
        </Popover>
      </DialogTrigger>
      {typeof errorMessage === 'string' && errorMessage ? <span className="date-range-picker-error">{errorMessage}</span> : null}
    </div>
  );
}
