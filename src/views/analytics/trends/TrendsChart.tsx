import { useMemo, useRef, type KeyboardEvent } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// material-ui
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// project imports
import { chartAxisColor, chartGridColor } from 'themes/chartPalette';
import { LINES, WEATHER_AXIS, WEATHER_HINT, dayMs, lineColours, money, stepDay, type ChartModel, type LineKey } from './trendsView';

interface TrendsChartProps {
  model: ChartModel;
  currency: string;
  /** The selected day, if any. */
  selectedDate: string | null;
  onSelect: (date: string) => void;
  height?: number;
}

/** The legend: one swatch per line drawn, in the colour the chart, the lines menu and the day panel share. */
export function LineLegend({ lines }: { lines: LineKey[] }) {
  const theme = useTheme();
  const colours = lineColours(theme);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '14px', px: '14px', pt: '12px' }}>
      {LINES.filter((l) => lines.includes(l.key)).map((l) => {
        const swatch = (
          <Box
            component="span"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'text.secondary' }}
          >
            <Box
              component="span"
              aria-hidden
              sx={{
                width: l.key === 'range' ? 14 : 16,
                height: l.key === 'range' ? 10 : 0,
                borderRadius: l.key === 'range' ? '2px' : 0,
                bgcolor: l.key === 'range' ? alpha(colours[l.key], 0.3) : 'transparent',
                borderTop: l.key === 'range' ? 'none' : `3px ${l.key === 'lastYear' ? 'dashed' : 'solid'} ${colours[l.key]}`,
                border: l.key === 'range' ? `1px solid ${colours[l.key]}` : undefined
              }}
            />
            {l.label}
          </Box>
        );
        return l.key === 'weather' ? (
          <Tooltip key={l.key} title={WEATHER_HINT} arrow>
            {swatch}
          </Tooltip>
        ) : (
          <Box key={l.key} component="span">
            {swatch}
          </Box>
        );
      })}
    </Box>
  );
}

const fullDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });

export default function TrendsChart({ model, currency, selectedDate, onSelect, height = 340 }: TrendsChartProps) {
  const theme = useTheme();
  const axis = chartAxisColor(theme);
  const grid = chartGridColor(theme);
  const colours = lineColours(theme);
  const { dates } = model;
  const selectedIndex = selectedDate ? dates.indexOf(selectedDate) : -1;
  // Held so a held-down arrow key steps from the last day chosen, not from the last render.
  const selectedNow = useRef(selectedIndex);
  selectedNow.current = selectedIndex;

  const built = useMemo(() => {
    const series: ApexAxisChartSeries = [];
    const types: Array<'rangeArea' | 'line'> = [];
    const stroke: number[] = [];
    const dash: number[] = [];
    const palette: string[] = [];
    const moneyIdx: number[] = [];
    let weatherIdx = -1;
    const push = (
      item: ApexAxisChartSeries[number],
      type: 'rangeArea' | 'line',
      color: string,
      width: number,
      dashed = 0,
      isMoney = true
    ) => {
      if (isMoney) moneyIdx.push(series.length);
      else weatherIdx = series.length;
      series.push({ ...item, type });
      types.push(type);
      stroke.push(width);
      dash.push(dashed);
      palette.push(color);
    };

    if (model.range) {
      push(
        {
          name: 'Expected range',
          data: dates.map((d, i) => {
            const r = model.range![i];
            return { x: dayMs(d), y: r.low !== null && r.high !== null ? [r.low, r.high] : [null, null] };
          }) as never
        },
        'rangeArea',
        colours.range,
        0
      );
      push({ name: 'Expected', data: dates.map((d, i) => ({ x: dayMs(d), y: model.range![i].expected })) }, 'line', colours.range, 2);
    }
    if (model.lines.includes('lastYear')) {
      push({ name: 'Last year', data: dates.map((d, i) => ({ x: dayMs(d), y: model.lastYear[i] })) }, 'line', colours.lastYear, 2, 6);
    }
    push({ name: 'Sales', data: dates.map((d, i) => ({ x: dayMs(d), y: model.sales[i] })) }, 'line', colours.sales, 2.5);
    if (model.weather) {
      push({ name: 'Weather', data: dates.map((d, i) => ({ x: dayMs(d), y: model.weather![i] })) }, 'line', colours.weather, 2, 0, false);
    }
    return { series, types, stroke, dash, palette, moneyIdx, weatherIdx };
  }, [model, dates, colours]);

  const options: ApexOptions = useMemo(() => {
    const firstMoney = built.series[built.moneyIdx[0]]?.name as string;
    const yaxis = built.series.map((_, i) =>
      i === built.weatherIdx
        ? {
            opposite: true,
            min: WEATHER_AXIS.min,
            max: WEATHER_AXIS.max,
            tickAmount: 5,
            seriesName: 'Weather',
            labels: { style: { colors: axis, fontSize: '12px' }, formatter: (v: number) => String(Math.round(v)) }
          }
        : i === built.moneyIdx[0]
          ? {
              seriesName: firstMoney,
              labels: { style: { colors: axis, fontSize: '12px' }, formatter: (v: number) => money(v, currency, false) }
            }
          : { seriesName: firstMoney, show: false }
    );

    const annotations: ApexAnnotations = { xaxis: [] };
    for (const mark of model.events) {
      if (mark.kind === 'span') {
        annotations.xaxis!.push({
          x: dayMs(mark.start),
          x2: dayMs(mark.end) + 86_400_000,
          fillColor: colours.events,
          opacity: 0.1,
          borderColor: 'transparent'
        });
      } else {
        annotations.xaxis!.push({ x: dayMs(mark.date), borderColor: colours.events, strokeDashArray: 2, opacity: 0.35 });
      }
    }
    if (model.todayIndex !== null) {
      annotations.xaxis!.push({
        x: dayMs(dates[model.todayIndex]),
        borderColor: axis,
        strokeDashArray: 0,
        label: {
          text: 'Today',
          orientation: 'horizontal',
          borderWidth: 0,
          style: { color: axis, background: 'transparent', fontSize: '11px' }
        }
      });
    }
    if (selectedIndex >= 0) {
      annotations.xaxis!.push({
        x: dayMs(dates[selectedIndex]),
        borderColor: theme.palette.text.primary,
        strokeDashArray: 0,
        borderWidth: 2,
        opacity: 0.8
      });
    }

    return {
      chart: {
        type: built.series.some((s) => (s as { type?: string }).type === 'rangeArea') ? 'rangeArea' : 'line',
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: theme.typography.fontFamily,
        animations: { enabled: false },
        events: {
          click: (_event, _chart, config) => {
            const index = config?.dataPointIndex;
            if (typeof index === 'number' && index >= 0 && dates[index]) onSelect(dates[index]);
          }
        }
      },
      colors: built.palette,
      stroke: { width: built.stroke, curve: 'straight', dashArray: built.dash },
      fill: { opacity: built.types.map((t) => (t === 'rangeArea' ? 0.3 : 1)) },
      markers: { size: 0, hover: { size: 4 } },
      dataLabels: { enabled: false },
      legend: { show: false },
      annotations,
      grid: { borderColor: grid, strokeDashArray: 0, padding: { left: 8, right: 8 } },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: axis, fontSize: '12px' }, datetimeUTC: true, hideOverlappingLabels: true },
        axisBorder: { color: grid },
        axisTicks: { show: false },
        tooltip: { enabled: false }
      },
      yaxis,
      tooltip: {
        theme: theme.palette.mode,
        shared: true,
        intersect: false,
        x: { formatter: (value: number) => fullDate(new Date(value).toISOString().slice(0, 10)) },
        y: {
          formatter: (value: number | undefined, { seriesIndex }: { seriesIndex: number }) =>
            value === undefined || value === null
              ? '—'
              : seriesIndex === built.weatherIdx
                ? `${value.toFixed(1)} out of 10`
                : money(value, currency, true)
        }
      }
    };
  }, [built, model, dates, selectedIndex, currency, axis, grid, colours, theme, onSelect]);

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = stepDay(selectedNow.current >= 0 ? selectedNow.current : null, dates.length, event.key);
    if (next === null) return;
    event.preventDefault();
    selectedNow.current = next;
    onSelect(dates[next]);
  };

  return (
    <Box>
      <LineLegend lines={model.lines} />
      <Box
        tabIndex={0}
        role="group"
        aria-label="Trends chart. Use the left and right arrow keys to choose a day."
        onKeyDown={onKey}
        sx={{
          px: '6px',
          pt: 1,
          outlineOffset: -2,
          '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, borderRadius: '8px' }
        }}
      >
        <Chart type={options.chart?.type ?? 'line'} width="100%" height={height} options={options} series={built.series} />
      </Box>
      <Typography sx={{ px: '14px', pb: '10px', fontSize: '0.8125rem', color: 'text.disabled' }}>
        Click a day, or use the arrow keys, to see what it is made of.
      </Typography>
    </Box>
  );
}
