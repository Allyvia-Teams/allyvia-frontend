import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';

import { BodyGrid } from 'ui-component/frame';
import { BenefitsTab, OnboardingTab, TiersTab } from 'ui-component/inner-circle';
import { parseSettingsSection, type SettingsSection } from './navigation';

const SECTIONS: Array<{ value: SettingsSection; label: string }> = [
  { value: 'setup', label: 'Setup' },
  { value: 'tiers', label: 'Tiers' },
  { value: 'benefits', label: 'Benefits' }
];

// ==============================|| INNER CIRCLE - SETTINGS ||============================== //
// The gear destination (Task 3.2): Setup / Tiers / Benefits, plus a link out to
// the OS Settings page where the store-profile editor lives.
//
// BodyGrid's two columns are fixed in source order — `main` is always the wide
// first column, `rail` the narrow sticky second column — so this section list
// renders in `rail` (beside the wide tab content in `main`) rather than
// strictly to the content's left as the brief's prose describes; BodyGrid has
// no left-narrow/right-wide variant and this session does not modify it.

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = parseSettingsSection(searchParams.get('section'));

  const selectSection = (value: SettingsSection) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <BodyGrid
      main={
        <>
          {section === 'setup' && <OnboardingTab />}
          {section === 'tiers' && <TiersTab />}
          {section === 'benefits' && <BenefitsTab />}
        </>
      }
      rail={
        <List
          component="nav"
          aria-label="Inner Circle settings sections"
          sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '10px', py: 0.5 }}
        >
          {SECTIONS.map((item) => (
            <ListItemButton key={item.value} selected={section === item.value} onClick={() => selectSection(item.value)}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
          <ListItemButton component={RouterLink} to="/settings?tab=general">
            <ListItemText primary="Store profile" />
          </ListItemButton>
        </List>
      }
    />
  );
}
