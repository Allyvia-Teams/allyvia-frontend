import React, { SyntheticEvent, useState } from 'react';

// material-ui
import Typography from '@mui/material/Typography';
import { TypographyVariant } from '@mui/material';
import Box from '@mui/material/Box';

// project imports
import { usePositiveOrNegativeColors } from 'hooks/useErrorSuccessColors';
import { BookmarkBorderOutlined, Bookmark } from '@mui/icons-material';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import { smallWidgetHeight } from 'store/constant';

// ==============================|| DASHBOARD - TOTAL INCOME DARK CARD ||============================== //
// KPI tile per the design system: white card, hairline border, uppercase
// muted label, bold ink value. Warning cards color the value instead of
// flooding the card background.

export interface TotalIncomeDarkCardProps {
  showIcon: boolean;
  height: number;
  value: number | string;
  title: string;
  isWarningCard?: boolean;
  isTaggable: boolean;
  titleVariant?: TypographyVariant;
  valueVariant?: TypographyVariant;
}

export default function TotalIncomeDarkCard({
  height,
  value,
  title,
  isWarningCard,
  isTaggable
}: TotalIncomeDarkCardProps) {
  const { textColor, isPositive } = usePositiveOrNegativeColors(value, isWarningCard);
  const [isTagged, setIsTagged] = useState(false);

  const handleTag: React.EventHandler<SyntheticEvent> = () => {
    setIsTagged((prev) => !prev);
  };

  let isLoading = false;
  if (isLoading) {
    return <LoadingSkeleton height={smallWidgetHeight} />;
  }

  // Warning cards flag a bad threshold in the value color; everything else reads in ink.
  const valueColor = isWarningCard && isPositive ? textColor : 'text.primary';

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2.5,
        minWidth: 120,
        minHeight: height,
        px: 2.5,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0.75
      }}
    >
      {isTaggable && (
        <Box onClick={handleTag} sx={{ position: 'absolute', top: 0, right: 0, p: 1, zIndex: 1, cursor: 'pointer', color: 'text.secondary' }}>
          {isTagged ? <Bookmark fontSize="small" /> : <BookmarkBorderOutlined fontSize="small" />}
        </Box>
      )}

      <Typography
        sx={{
          color: 'text.secondary',
          fontSize: '0.65625rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.2
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          color: valueColor,
          fontSize: '1.375rem',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.01em'
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
