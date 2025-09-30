import React from 'react';
import {
  Box,
  Typography,
  Skeleton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  LinearProgress,
  Avatar,
  Stack
} from '@mui/material';
import {
  InboxOutlined,
  TableChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  AssessmentOutlined,
  DescriptionOutlined,
  PeopleOutlined,
  InventoryOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  RefreshOutlined,
  SearchOutlined,
  FilterListOutlined,
  AddOutlined,
  EditOutlined,
  DeleteOutlined,
  VisibilityOutlined,
  DownloadOutlined,
  UploadOutlined,
  SettingsOutlined,
  HelpOutlined,
  InfoOutlined,
  WarningOutlined,
  ErrorOutlined,
  CheckCircleOutlined,
  CancelOutlined,
  ScheduleOutlined,
  StarOutlined,
  FavoriteOutlined,
  BookmarkOutlined,
  ShareOutlined,
  CommentOutlined,
  ThumbUpOutlined,
  ThumbDownOutlined
} from '@mui/icons-material';

export type EmptyType =
  | 'table'
  | 'chart'
  | 'page'
  | 'form'
  | 'list'
  | 'card'
  | 'grid'
  | 'dashboard'
  | 'search'
  | 'filter'
  | 'data'
  | 'content'
  | 'default';

export type SkeletonType = 'table' | 'chart' | 'card' | 'list' | 'grid' | 'text' | 'circular' | 'rectangular' | 'wave' | 'pulse';

interface AllyviaEmptyProps {
  isEmpty: boolean;
  isLoading: boolean;
  type?: EmptyType;
  skeletonType?: SkeletonType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  height?: number | string;
  width?: number | string;
  rows?: number; // For table skeleton
  columns?: number; // For table skeleton
  items?: number; // For list/grid skeleton
  showIcon?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showAction?: boolean;
  variant?: 'outlined' | 'elevation';
  elevation?: number;
  sx?: any;
}

const getEmptyIcon = (type: EmptyType): React.ReactNode => {
  const iconProps = { sx: { fontSize: 64, color: 'text.secondary', mb: 2 } };

  switch (type) {
    case 'table':
      return <TableChartOutlined {...iconProps} />;
    case 'chart':
      return <BarChartOutlined {...iconProps} />;
    case 'page':
      return <DescriptionOutlined {...iconProps} />;
    case 'form':
      return <EditOutlined {...iconProps} />;
    case 'list':
      return <List {...iconProps} />;
    case 'card':
      return <Card {...iconProps} />;
    case 'grid':
      return <AssessmentOutlined {...iconProps} />;
    case 'dashboard':
      return <AssessmentOutlined {...iconProps} />;
    case 'search':
      return <SearchOutlined {...iconProps} />;
    case 'filter':
      return <FilterListOutlined {...iconProps} />;
    case 'data':
      return <TrendingUpOutlined {...iconProps} />;
    case 'content':
      return <DescriptionOutlined {...iconProps} />;
    default:
      return <InboxOutlined {...iconProps} />;
  }
};

const getEmptyTitle = (type: EmptyType): string => {
  switch (type) {
    case 'table':
      return 'No Data Available';
    case 'chart':
      return 'No Chart Data';
    case 'page':
      return 'Page Not Found';
    case 'form':
      return 'No Form Data';
    case 'list':
      return 'No Items Found';
    case 'card':
      return 'No Cards Available';
    case 'grid':
      return 'No Grid Items';
    case 'dashboard':
      return 'Dashboard Empty';
    case 'search':
      return 'No Search Results';
    case 'filter':
      return 'No Filtered Results';
    case 'data':
      return 'No Data Found';
    case 'content':
      return 'No Content Available';
    default:
      return 'Nothing Here';
  }
};

const getEmptyDescription = (type: EmptyType): string => {
  switch (type) {
    case 'table':
      return 'There are no records to display in this table.';
    case 'chart':
      return 'There is no data available to generate this chart.';
    case 'page':
      return 'The page you are looking for does not exist.';
    case 'form':
      return 'No form data is available at the moment.';
    case 'list':
      return 'No items are available in this list.';
    case 'card':
      return 'No cards are available to display.';
    case 'grid':
      return 'No items are available in this grid.';
    case 'dashboard':
      return 'Your dashboard is empty. Add some widgets to get started.';
    case 'search':
      return 'No results match your search criteria.';
    case 'filter':
      return 'No items match the current filter settings.';
    case 'data':
      return 'No data is available for the selected criteria.';
    case 'content':
      return 'No content is available to display.';
    default:
      return 'There is nothing to show here.';
  }
};

const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 4 }) => (
  <TableContainer component={Paper} variant="outlined">
    <Table>
      <TableHead>
        <TableRow>
          {Array.from({ length: columns }).map((_, index) => (
            <TableCell key={index}>
              <Skeleton variant="text" width="80%" height={24} />
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton variant="text" width="60%" height={20} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const ChartSkeleton: React.FC = () => (
  <Paper variant="outlined" sx={{ p: 3, height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2 }} />
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Skeleton variant="text" width="30%" height={20} />
      <Skeleton variant="text" width="20%" height={20} />
    </Box>
  </Paper>
);

const CardSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
    {Array.from({ length: items }).map((_, index) => (
      <Box key={index} sx={{ flex: '1 1 300px', minWidth: 300 }}>
        <Card variant="outlined">
          <CardContent>
            <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="60%" height={20} />
          </CardContent>
        </Card>
      </Box>
    ))}
  </Box>
);

const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <Paper variant="outlined">
    <List>
      {Array.from({ length: items }).map((_, index) => (
        <React.Fragment key={index}>
          <ListItem>
            <ListItemIcon>
              <Skeleton variant="circular" width={40} height={40} />
            </ListItemIcon>
            <ListItemText
              primary={<Skeleton variant="text" width="70%" height={20} />}
              secondary={<Skeleton variant="text" width="50%" height={16} />}
            />
          </ListItem>
          {index < items - 1 && <Divider />}
        </React.Fragment>
      ))}
    </List>
  </Paper>
);

const GridSkeleton: React.FC<{ items?: number }> = ({ items = 6 }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
    {Array.from({ length: items }).map((_, index) => (
      <Box key={index} sx={{ flex: '1 1 200px', minWidth: 200 }}>
        <Paper variant="outlined" sx={{ p: 2, height: 120 }}>
          <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="60%" height={16} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={40} />
        </Paper>
      </Box>
    ))}
  </Box>
);

const TextSkeleton: React.FC = () => (
  <Box>
    <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
    <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
    <Skeleton variant="text" width="85%" height={20} sx={{ mb: 1 }} />
    <Skeleton variant="text" width="70%" height={20} />
  </Box>
);

const CircularSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
    <Skeleton variant="circular" width={80} height={80} />
  </Box>
);

const RectangularSkeleton: React.FC = () => <Skeleton variant="rectangular" width="100%" height={200} />;

const WaveSkeleton: React.FC = () => (
  <Box>
    <Skeleton variant="text" width="100%" height={24} animation="wave" sx={{ mb: 1 }} />
    <Skeleton variant="text" width="90%" height={20} animation="wave" sx={{ mb: 1 }} />
    <Skeleton variant="text" width="85%" height={20} animation="wave" sx={{ mb: 1 }} />
    <Skeleton variant="text" width="70%" height={20} animation="wave" />
  </Box>
);

const PulseSkeleton: React.FC = () => (
  <Box>
    <Skeleton variant="text" width="100%" height={24} animation="pulse" sx={{ mb: 1 }} />
    <Skeleton variant="text" width="90%" height={20} animation="pulse" sx={{ mb: 1 }} />
    <Skeleton variant="text" width="85%" height={20} animation="pulse" sx={{ mb: 1 }} />
    <Skeleton variant="text" width="70%" height={20} animation="pulse" />
  </Box>
);

const getDefaultSkeletonType = (emptyType: EmptyType): SkeletonType => {
  switch (emptyType) {
    case 'table':
      return 'table';
    case 'chart':
      return 'chart';
    case 'card':
      return 'card';
    case 'list':
      return 'list';
    case 'grid':
      return 'grid';
    case 'page':
    case 'form':
    case 'content':
      return 'text';
    case 'dashboard':
      return 'card';
    case 'search':
    case 'filter':
    case 'data':
      return 'text';
    default:
      return 'text';
  }
};

const renderSkeleton = (skeletonType: SkeletonType, props: any) => {
  switch (skeletonType) {
    case 'table':
      return <TableSkeleton rows={props.rows} columns={props.columns} />;
    case 'chart':
      return <ChartSkeleton />;
    case 'card':
      return <CardSkeleton items={props.items} />;
    case 'list':
      return <ListSkeleton items={props.items} />;
    case 'grid':
      return <GridSkeleton items={props.items} />;
    case 'text':
      return <TextSkeleton />;
    case 'circular':
      return <CircularSkeleton />;
    case 'rectangular':
      return <RectangularSkeleton />;
    case 'wave':
      return <WaveSkeleton />;
    case 'pulse':
      return <PulseSkeleton />;
    default:
      return <TextSkeleton />;
  }
};

const AllyviaEmpty: React.FC<AllyviaEmptyProps> = ({
  isEmpty,
  isLoading,
  type = 'default',
  skeletonType,
  title,
  description,
  icon,
  action,
  height = 300,
  width = '100%',
  rows = 5,
  columns = 4,
  items = 3,
  showIcon = true,
  showTitle = true,
  showDescription = true,
  showAction = false,
  variant = 'outlined',
  elevation = 1,
  sx = {}
}) => {
  // Auto-select skeleton type based on empty type if not provided
  const effectiveSkeletonType = skeletonType || getDefaultSkeletonType(type);

  // Show skeleton when loading
  if (isLoading) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...sx
        }}
      >
        {renderSkeleton(effectiveSkeletonType, { rows, columns, items })}
      </Box>
    );
  }

  // Show empty state when not loading and empty
  if (isEmpty) {
    return (
      <Paper
        variant={variant}
        elevation={elevation}
        sx={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          textAlign: 'center',
          ...sx
        }}
      >
        {showIcon && (icon || getEmptyIcon(type))}

        {showTitle && (
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {title || getEmptyTitle(type)}
          </Typography>
        )}

        {showDescription && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
            {description || getEmptyDescription(type)}
          </Typography>
        )}

        {showAction && action && <Box sx={{ mt: 2 }}>{action}</Box>}
      </Paper>
    );
  }

  // Return null if not empty and not loading
  return null;
};

export default AllyviaEmpty;
