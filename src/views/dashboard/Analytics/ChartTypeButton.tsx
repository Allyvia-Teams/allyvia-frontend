import { Button } from '@mui/material';

export const ChartTypeButton = ({ onClick, icon, selected }: { onClick: () => void; icon: React.ReactNode; selected: boolean }) => {
  return (
    <Button
      sx={{ borderColor: selected ? 'primary.main' : 'primary.light', color: selected ? 'primary.main' : 'primary.200' }}
      onClick={onClick}
      size="large"
      variant="outlined"
    >
      {icon}
    </Button>
  );
};
