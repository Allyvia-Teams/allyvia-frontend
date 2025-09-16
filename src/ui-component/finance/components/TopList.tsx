import { List, ListItem, ListItemText, Typography } from '@mui/material';

export function TopList({ title, rows }: { title: string; rows: { name: string; amount: number; count?: number }[] }) {
  const fmt = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return (
    <div>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <List dense>
        {rows.map((r) => (
          <ListItem key={r.name} divider>
            <ListItemText primary={r.name} secondary={r.count ? `${r.count} invoices` : undefined} />
            <Typography variant="body1" color="primary">
              {fmt(r.amount)}
            </Typography>
          </ListItem>
        ))}
      </List>
    </div>
  );
}
