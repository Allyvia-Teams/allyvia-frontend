import { useEffect, useId, useState, type ReactNode } from 'react';

import { Box, ButtonBase, Collapse, Typography } from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';

import { readSectionOpen, writeSectionOpen } from '../sectionState';
import { pinIcon } from './pinIcon';

interface CollapsibleSectionProps {
  /** Storage name: the open state lives under allyvia.insights.section.<name>.open. */
  name: string;
  title: string;
  children: ReactNode;
}

/**
 * A titled section that starts collapsed and remembers being opened.
 *
 * The first render is always collapsed and storage is read only after mount,
 * so server/static renders and a fresh load with cleared storage agree.
 * Children stay MOUNTED while collapsed (Collapse's default): the legacy
 * sections run their own data fetches and gates on mount, and the analytics
 * gate depends on the profile card having loaded the profile, so hiding them
 * must not unmount them.
 */
export default function CollapsibleSection({ name, title, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  useEffect(() => {
    setOpen(readSectionOpen(name));
  }, [name]);

  const toggle = () => {
    setOpen((was) => {
      writeSectionOpen(name, !was);
      return !was;
    });
  };

  return (
    <Box component="section" sx={{ borderTop: 1, borderColor: 'divider' }} data-insights-section={name}>
      <ButtonBase
        onClick={toggle}
        aria-expanded={open}
        aria-controls={regionId}
        sx={{ width: '100%', justifyContent: 'space-between', py: 1.5, px: 0.5, borderRadius: 1, textAlign: 'left' }}
      >
        {/* Quieter than the cards (S6): a small muted heading, and no card chrome until the section is opened. */}
        <Typography component="h2" sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.secondary' }}>
          {title}
        </Typography>
        <Box
          component="span"
          aria-hidden
          sx={{
            ...pinIcon(20),
            display: 'flex',
            color: 'text.secondary',
            transition: 'transform 150ms',
            transform: open ? 'rotate(180deg)' : 'none'
          }}
        >
          <IconChevronDown size={20} />
        </Box>
      </ButtonBase>
      <Collapse in={open} id={regionId} role="region" aria-label={title}>
        <Box sx={{ pb: 3 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}
