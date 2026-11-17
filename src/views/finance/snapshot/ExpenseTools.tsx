import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, Drawer, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { IconChevronDown, IconPlus, IconX } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';

// project imports
import ExpenseCatalogue, { type CatalogueSection } from '../ExpenseCatalogue';
import { expenseToolFor } from '../entryLink';
import { EXPENSE_CATEGORIES_KEY } from '../useExpenseCategories';
import type { Range } from './snapshotView';

// The expense catalogue's tools, moved unchanged from the old Expenses tab: Add expense, Upload
// invoice (the expense source inbox), Recurring bills, and Manage expenses (categories, Import CSV
// and its repeat-question dialog, corrections, payments and voids). The Import data screen links
// here with ?tool=import to open the tool that holds Import CSV.

type Tool = { section: CatalogueSection; add?: boolean; title: string };
const TOOLS: Tool[] = [
  { section: 'expenses', add: true, title: 'Add expense' },
  { section: 'inbox', title: 'Upload invoice' },
  { section: 'recurring', title: 'Recurring bills' },
  { section: 'expenses', title: 'Manage expenses' }
];

export default function ExpenseTools({ range }: { range: Range }) {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [tool, setTool] = useState<Tool | null>(() =>
    expenseToolFor(searchParams.get('tool')) ? (TOOLS.find((t) => t.title === 'Manage expenses') ?? null) : null
  );
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: EXPENSE_CATEGORIES_KEY });
    void queryClient.invalidateQueries({ queryKey: ['finance'] });
  };
  const close = () => {
    setTool(null);
    refresh();
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<IconPlus size={16} />}
        endIcon={<IconChevronDown size={16} />}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        Add expense
      </Button>
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        {TOOLS.map((t) => (
          <MenuItem
            key={t.title}
            onClick={() => {
              setMenuAnchor(null);
              setTool(t);
            }}
          >
            {t.title}
          </MenuItem>
        ))}
      </Menu>
      <Drawer anchor="right" open={!!tool} onClose={close} PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}>
        {tool && (
          <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h3">{tool.title}</Typography>
              <IconButton aria-label="Close" onClick={close}>
                <IconX size={18} />
              </IconButton>
            </Stack>
            <ExpenseCatalogue
              key={tool.title}
              manage={tool.section}
              startAdd={tool.add}
              startDate={range.start}
              endDate={range.end}
              onChanged={refresh}
            />
          </Box>
        )}
      </Drawer>
    </>
  );
}
