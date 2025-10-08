import React, { useState } from 'react';
import { Button, Box, Typography } from '@mui/material';
import AllyviaEmpty from './AllyviaEmpty';

/**
 * AllyviaEmpty Component Usage Examples
 *
 * This component provides empty states with loading skeletons for various UI elements.
 * It supports different types of empty states and skeleton animations.
 */

const AllyviaEmptyExamples: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleToggleLoading = () => {
    setIsLoading(!isLoading);
  };

  const handleToggleEmpty = () => {
    setIsEmpty(!isEmpty);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AllyviaEmpty Component Examples
      </Typography>

      {/* Control Buttons */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleToggleLoading} color={isLoading ? 'error' : 'primary'}>
          {isLoading ? 'Stop Loading' : 'Start Loading'}
        </Button>
        <Button variant="outlined" onClick={handleToggleEmpty} color={isEmpty ? 'error' : 'success'}>
          {isEmpty ? 'Show Data' : 'Show Empty'}
        </Button>
      </Box>

      {/* Table Empty State */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Table Empty State
        </Typography>
        <AllyviaEmpty isEmpty={isEmpty} isLoading={isLoading} type="table" skeletonType="table" rows={5} columns={4} height={400} />
      </Box>

      {/* Chart Empty State */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Chart Empty State
        </Typography>
        <AllyviaEmpty isEmpty={isEmpty} isLoading={isLoading} type="chart" skeletonType="chart" height={300} />
      </Box>

      {/* Card Grid Empty State */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Card Grid Empty State
        </Typography>
        <AllyviaEmpty isEmpty={isEmpty} isLoading={isLoading} type="card" skeletonType="card" items={6} height={400} />
      </Box>

      {/* List Empty State */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          List Empty State
        </Typography>
        <AllyviaEmpty isEmpty={isEmpty} isLoading={isLoading} type="list" skeletonType="list" items={5} height={300} />
      </Box>

      {/* Grid Empty State */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Grid Empty State
        </Typography>
        <AllyviaEmpty isEmpty={isEmpty} isLoading={isLoading} type="grid" skeletonType="grid" items={8} height={300} />
      </Box>

      {/* Custom Empty State with Action */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Custom Empty State with Action
        </Typography>
        <AllyviaEmpty
          isEmpty={isEmpty}
          isLoading={isLoading}
          type="data"
          skeletonType="text"
          title="No Analytics Data"
          description="Start by adding some data to see analytics insights."
          action={
            <Button variant="contained" color="primary">
              Add Data
            </Button>
          }
          showAction={true}
          height={250}
        />
      </Box>

      {/* Different Skeleton Types */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Different Skeleton Types
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box sx={{ width: 200, height: 100 }}>
            <Typography variant="caption" display="block" gutterBottom>
              Wave Animation
            </Typography>
            <AllyviaEmpty isEmpty={false} isLoading={true} skeletonType="wave" height={100} />
          </Box>

          <Box sx={{ width: 200, height: 100 }}>
            <Typography variant="caption" display="block" gutterBottom>
              Pulse Animation
            </Typography>
            <AllyviaEmpty isEmpty={false} isLoading={true} skeletonType="pulse" height={100} />
          </Box>

          <Box sx={{ width: 200, height: 100 }}>
            <Typography variant="caption" display="block" gutterBottom>
              Circular
            </Typography>
            <AllyviaEmpty isEmpty={false} isLoading={true} skeletonType="circular" height={100} />
          </Box>

          <Box sx={{ width: 200, height: 100 }}>
            <Typography variant="caption" display="block" gutterBottom>
              Rectangular
            </Typography>
            <AllyviaEmpty isEmpty={false} isLoading={true} skeletonType="rectangular" height={100} />
          </Box>
        </Box>
      </Box>

      {/* Different Empty Types */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Different Empty Types
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {(['table', 'chart', 'page', 'form', 'list', 'card', 'grid', 'dashboard', 'search', 'filter', 'data', 'content'] as const).map(
            (type) => (
              <Box key={type} sx={{ width: 200, height: 150 }}>
                <Typography variant="caption" display="block" gutterBottom>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Typography>
                <AllyviaEmpty isEmpty={true} isLoading={false} type={type} height={150} showTitle={true} showDescription={false} />
              </Box>
            )
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AllyviaEmptyExamples;
