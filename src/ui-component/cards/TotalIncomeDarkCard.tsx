import React, { SyntheticEvent, useState } from 'react';

// material-ui
import { styled, useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeCard from './TotalIncomeCard';
import { usePositiveOrNegativeColors } from 'hooks/useErrorSuccessColors';
import { BookmarkBorderOutlined, Bookmark } from '@mui/icons-material';

// assets
// import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

// styles
const CardWrapper = styled(MainCard)(({ theme }) => ({
  backgroundColor: theme.palette.primary.dark,
  color: theme.palette.primary.light,
  overflow: 'hidden',
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: `linear-gradient(210.04deg, ${theme.palette.primary[200]} -50.94%, rgba(144, 202, 249, 0) 83.49%)`,
    borderRadius: '50%',
    top: -30,
    right: -180
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: `linear-gradient(140.9deg, ${theme.palette.primary[200]} -14.02%, rgba(144, 202, 249, 0) 77.58%)`,
    borderRadius: '50%',
    top: -160,
    right: -130
  }
}));

// ==============================|| DASHBOARD - TOTAL INCOME DARK CARD ||============================== //

interface TotalIncomeDarkCardProps {
  isLoading: boolean;
  showIcon: boolean;
  height: number;
  value: number | string;
  title: string;
  isWarningCard?: boolean;
  isTaggable: boolean;
}

export default function TotalIncomeDarkCard({
  isLoading,
  showIcon,
  height,
  value,
  title,
  isWarningCard = false,
  isTaggable
}: TotalIncomeDarkCardProps) {
  const theme = useTheme();
  const { textColor } = usePositiveOrNegativeColors(value, isWarningCard);
  const [isTagged, setIsTagged] = useState(false);

  const handleTag: React.EventHandler<SyntheticEvent> = () => {
    setIsTagged((prev) => !prev);
  };

  return (
    <>
      {isLoading ? (
        <TotalIncomeCard />
      ) : (
        <CardWrapper border={true} content={false}>
          <Box sx={{ p: 2, height }}>
            {isTaggable && (
              <Box onClick={handleTag} sx={{ position: 'absolute', top: 0, right: 0, p: 1, zIndex: 1 }}>
                {isTagged ? <Bookmark /> : <BookmarkBorderOutlined />}
              </Box>
            )}
            <List sx={{ py: 0 }}>
              <ListItem alignItems="center" disableGutters sx={{ py: 0 }}>
                {showIcon && (
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.largeAvatar,
                        bgcolor: 'primary.dark',
                        color: '#fff'
                      }}
                    >
                      {/* <TableChartOutlinedIcon fontSize="inherit" /> */}
                    </Avatar>
                  </ListItemAvatar>
                )}
                <ListItemText
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    py: 0,
                    mt: 0.45,
                    mb: 0.45
                  }}
                  primary={
                    <Typography variant="h3" sx={{ color: isWarningCard ? textColor : '#ffff' }}>
                      {value}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="h6" sx={{ color: isWarningCard ? textColor : 'grey.200', mt: 0.25 }}>
                      {title}
                    </Typography>
                  }
                />
              </ListItem>
            </List>
          </Box>
        </CardWrapper>
      )}
    </>
  );
}
