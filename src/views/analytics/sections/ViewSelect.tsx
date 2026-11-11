// material-ui
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

export interface ViewOption<T extends string> {
  value: T;
  label: string;
}

interface ViewSelectProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<ViewOption<T>>;
  onChange: (value: T) => void;
}

/** The one control every Analytics panel uses to pick what it shows. */
export default function ViewSelect<T extends string>({ label, value, options, onChange }: ViewSelectProps<T>) {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      slotProps={{ htmlInput: { 'aria-label': label } }}
      sx={{ minWidth: 168, '& .MuiInputBase-input': { py: '6px', fontSize: '0.875rem' } }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
