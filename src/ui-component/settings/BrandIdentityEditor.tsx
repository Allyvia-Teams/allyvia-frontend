import { Box, Stack, Typography, TextField, MenuItem, Slider, Button } from '@mui/material';
import type { BrandTheme } from 'types/config';
import { parseBrandIdentity, type BrandIdentity as Identity } from 'utils/brandIdentity';
import BrandIdentity from 'ui-component/BrandIdentity';
export default function BrandIdentityEditor({
  brand,
  onChange,
  storeName
}: {
  brand: NonNullable<BrandTheme>;
  onChange: (brand: NonNullable<BrandTheme>) => void;
  storeName: string;
}) {
  const identity = parseBrandIdentity(brand.identity);
  const update = (patch: Partial<Identity>) => onChange({ ...brand, identity: { ...identity, ...patch } });
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 3 }}>
      <Typography variant="h3" sx={{ fontSize: 22 }}>
        Your signature in the workspace.
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
        Compose the top-left brand area. These same settings appear in your expanded and collapsed navigation.
      </Typography>
      <Stack
        direction="row"
        spacing={3}
        sx={{ p: 2, mb: 2, bgcolor: brand.experience?.navigation || 'background.paper', borderRadius: 2, flexWrap: 'wrap' }}
      >
        <BrandIdentity brand={brand} name={storeName} />
        <BrandIdentity brand={brand} name={storeName} collapsed />
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <TextField
          select
          label="Brand presentation"
          value={identity.layout}
          onChange={(e) => update({ layout: e.target.value as Identity['layout'] })}
        >
          <MenuItem value="logo">Original logo</MenuItem>
          <MenuItem value="lockup">Logo + editable name</MenuItem>
          <MenuItem value="wordmark">Editable wordmark</MenuItem>
        </TextField>
        <TextField
          label="Brand display name"
          placeholder={storeName}
          value={identity.name}
          inputProps={{ maxLength: 60 }}
          onChange={(e) => update({ name: e.target.value })}
        />
        <TextField
          label="Tagline"
          helperText="Shown beside the logo or below the editable wordmark."
          value={identity.tagline}
          inputProps={{ maxLength: 80 }}
          onChange={(e) => update({ tagline: e.target.value })}
        />
        <TextField select label="Image framing" value={identity.fit} onChange={(e) => update({ fit: e.target.value as Identity['fit'] })}>
          <MenuItem value="contain">Show full logo</MenuItem>
          <MenuItem value="cover">Fill frame / crop edges</MenuItem>
        </TextField>
        {(
          [
            { key: 'size', label: 'Logo height', min: 24, max: 48, step: 1 },
            { key: 'zoom', label: 'Image zoom', min: 1, max: 2, step: 0.05 },
            { key: 'padding', label: 'Inner spacing', min: 0, max: 8, step: 1 },
            { key: 'radius', label: 'Frame corners', min: 0, max: 24, step: 1 }
          ] as const
        ).map((item) => (
          <Box key={item.key}>
            <Typography id={`identity-${item.key}`} variant="body2">
              {item.label}
            </Typography>
            <Slider
              aria-labelledby={`identity-${item.key}`}
              value={identity[item.key]}
              min={item.min}
              max={item.max}
              step={item.step}
              valueLabelDisplay="auto"
              onChange={(_, value) => update({ [item.key]: value as number })}
            />
          </Box>
        ))}
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            type="color"
            label="Logo backdrop"
            value={identity.background === 'transparent' ? '#FFFFFF' : identity.background}
            onChange={(e) => update({ background: e.target.value })}
            sx={{ width: 130 }}
          />
          <Button onClick={() => update({ background: 'transparent' })}>Transparent</Button>
        </Stack>
        <Button onClick={() => update(parseBrandIdentity(undefined))}>Reset logo presentation</Button>
      </Box>
    </Box>
  );
}
