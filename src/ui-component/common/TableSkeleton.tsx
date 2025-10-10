import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton, Paper } from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export default function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableCell key={`header-${index}`}>
                <Skeleton variant="text" width="80%" height={24} />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={`cell-${rowIndex}-${colIndex}`}>
                  <Skeleton variant="text" width="90%" height={20} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
