import React, { useState } from 'react';
import {
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  TextField
} from '@mui/material';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { EmptyType, SkeletonType } from 'ui-component/common/AllyviaEmpty';

const AllyviaEmptyExamples: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [selectedType, setSelectedType] = useState<EmptyType>('table');
  const [selectedSkeletonType, setSelectedSkeletonType] = useState<SkeletonType>('table');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [showIcon, setShowIcon] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showAction, setShowAction] = useState(false);
  const [height, setHeight] = useState(300);
  const [rows, setRows] = useState(5);
  const [columns, setColumns] = useState(4);
  const [items, setItems] = useState(3);

  const emptyTypes: EmptyType[] = [
    'table',
    'chart',
    'page',
    'form',
    'list',
    'card',
    'grid',
    'dashboard',
    'search',
    'filter',
    'data',
    'content',
    'default'
  ];

  const skeletonTypes: SkeletonType[] = ['table', 'chart', 'card', 'list', 'grid', 'text', 'circular', 'rectangular', 'wave', 'pulse'];

  const handleToggleLoading = () => {
    setIsLoading(!isLoading);
  };

  const handleToggleEmpty = () => {
    setIsEmpty(!isEmpty);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AllyviaEmpty Component Playground
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Controls Panel */}
        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Controls
              </Typography>

              {/* State Controls */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  State
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button variant="contained" onClick={handleToggleLoading} color={isLoading ? 'error' : 'primary'} size="small">
                    {isLoading ? 'Stop Loading' : 'Start Loading'}
                  </Button>
                  <Button variant="outlined" onClick={handleToggleEmpty} color={isEmpty ? 'error' : 'success'} size="small">
                    {isEmpty ? 'Show Data' : 'Show Empty'}
                  </Button>
                </Box>
              </Box>

              {/* Type Selection */}
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Empty Type</InputLabel>
                  <Select value={selectedType} label="Empty Type" onChange={(e) => setSelectedType(e.target.value as EmptyType)}>
                    {emptyTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Skeleton Type</InputLabel>
                  <Select
                    value={selectedSkeletonType}
                    label="Skeleton Type"
                    onChange={(e) => setSelectedSkeletonType(e.target.value as SkeletonType)}
                  >
                    {skeletonTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Custom Content */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Custom Content
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Custom Title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Custom Description"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  multiline
                  rows={2}
                />
              </Box>

              {/* Display Options */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Display Options
                </Typography>
                <FormControlLabel
                  control={<Switch checked={showIcon} onChange={(e) => setShowIcon(e.target.checked)} />}
                  label="Show Icon"
                />
                <FormControlLabel
                  control={<Switch checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} />}
                  label="Show Title"
                />
                <FormControlLabel
                  control={<Switch checked={showDescription} onChange={(e) => setShowDescription(e.target.checked)} />}
                  label="Show Description"
                />
                <FormControlLabel
                  control={<Switch checked={showAction} onChange={(e) => setShowAction(e.target.checked)} />}
                  label="Show Action"
                />
              </Box>

              {/* Dimensions */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Dimensions
                </Typography>
                <Typography gutterBottom>Height: {height}px</Typography>
                <Slider
                  value={height}
                  onChange={(e, value) => setHeight(value as number)}
                  min={100}
                  max={600}
                  step={50}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>

              {/* Skeleton Parameters */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Skeleton Parameters
                </Typography>
                <Typography gutterBottom>Rows: {rows}</Typography>
                <Slider
                  value={rows}
                  onChange={(e, value) => setRows(value as number)}
                  min={1}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Columns: {columns}
                </Typography>
                <Slider
                  value={columns}
                  onChange={(e, value) => setColumns(value as number)}
                  min={1}
                  max={8}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Items: {items}
                </Typography>
                <Slider
                  value={items}
                  onChange={(e, value) => setItems(value as number)}
                  min={1}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Preview Panel */}
        <Box sx={{ flex: '2 1 400px', minWidth: 400 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              <Box
                sx={{
                  border: '1px dashed #ccc',
                  borderRadius: 1,
                  p: 2,
                  minHeight: height + 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AllyviaEmpty
                  isEmpty={isEmpty}
                  isLoading={isLoading}
                  type={selectedType}
                  skeletonType={selectedSkeletonType}
                  title={customTitle || undefined}
                  description={customDescription || undefined}
                  height={height}
                  rows={rows}
                  columns={columns}
                  items={items}
                  showIcon={showIcon}
                  showTitle={showTitle}
                  showDescription={showDescription}
                  showAction={showAction}
                  action={
                    showAction ? (
                      <Button variant="contained" color="primary" size="small">
                        Custom Action
                      </Button>
                    ) : undefined
                  }
                />
              </Box>
            </CardContent>
          </Card>

          {/* Code Preview */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Code Preview
              </Typography>
              <Box
                component="pre"
                sx={{
                  backgroundColor: '#f5f5f5',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                {`<AllyviaEmpty
  isEmpty={${isEmpty}}
  isLoading={${isLoading}}
  type="${selectedType}"
  skeletonType="${selectedSkeletonType}"${customTitle ? `\n  title="${customTitle}"` : ''}${customDescription ? `\n  description="${customDescription}"` : ''}
  height={${height}}
  rows={${rows}}
  columns={${columns}}
  items={${items}}
  showIcon={${showIcon}}
  showTitle={${showTitle}}
  showDescription={${showDescription}}
  showAction={${showAction}}${showAction ? '\n  action={<Button variant="contained">Custom Action</Button>}' : ''}
/>`}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default AllyviaEmptyExamples;
