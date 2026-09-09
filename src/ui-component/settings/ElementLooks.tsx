import { Box, Stack, Typography } from '@mui/material';
import type { BrandTheme } from 'types/config';
import { BrandExperience, DEFAULT_EXPERIENCE, parseBrandExperience } from 'themes/brandExperience';

export const ELEMENT_LOOKS: { key: keyof BrandExperience; name: string; options: { value: string; label: string }[] }[] = [
  {
    key: 'navStyle',
    name: 'Navigation',
    options: [
      { value: 'pill', label: 'Filled selection' },
      { value: 'line', label: 'Editorial rule' }
    ]
  },
  {
    key: 'finish',
    name: 'Cards & panels',
    options: [
      { value: 'flat', label: 'Minimal' },
      { value: 'outlined', label: 'Fine borders' },
      { value: 'elevated', label: 'Soft elevation' }
    ]
  },
  {
    key: 'buttonStyle',
    name: 'Buttons',
    options: [
      { value: 'solid', label: 'Solid' },
      { value: 'outline', label: 'Outlined' },
      { value: 'rounded', label: 'Pill' }
    ]
  },
  {
    key: 'tableStyle',
    name: 'Tables',
    options: [
      { value: 'lines', label: 'Classic rows' },
      { value: 'striped', label: 'Alternating rows' },
      { value: 'relaxed', label: 'Room to breathe' }
    ]
  }
];
export function chooseElementLook(brand: NonNullable<BrandTheme>, key: keyof BrandExperience, value: string): NonNullable<BrandTheme> {
  if (!ELEMENT_LOOKS.find((group) => group.key === key)?.options.some((option) => option.value === value)) return brand;
  return { ...brand, experience: { ...(parseBrandExperience(brand.experience) ?? DEFAULT_EXPERIENCE), [key]: value } };
}
export default function ElementLooks({
  brand,
  onChange
}: {
  brand: NonNullable<BrandTheme>;
  onChange: (brand: NonNullable<BrandTheme>) => void;
}) {
  const e = parseBrandExperience(brand.experience) ?? DEFAULT_EXPERIENCE;
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2.5 }}>
      <Typography variant="overline" sx={{ letterSpacing: '.14em' }}>
        03 / THE INDIVIDUAL DETAILS
      </Typography>
      <Typography variant="h3" sx={{ fontSize: 22, mt: 0.5, mb: 1 }}>
        A different look for every element.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Keep your brand. Choose the forms that feel right.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' }, gap: 3 }}>
        {ELEMENT_LOOKS.map((group) => (
          <Box key={group.key}>
            <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 1 }}>{group.name}</Typography>
            <Stack direction="row" spacing={1}>
              {group.options.map((option) => (
                <Box
                  component="button"
                  type="button"
                  key={option.value}
                  aria-label={`${group.name}: ${option.label}`}
                  aria-pressed={e[group.key] === option.value}
                  onClick={() => onChange(chooseElementLook(brand, group.key, option.value))}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    p: 1.5,
                    font: 'inherit',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: e[group.key] === option.value ? 'text.primary' : 'divider',
                    borderRadius: '8px',
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }
                  }}
                >
                  <Box
                    sx={{
                      height: 62,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1,
                      bgcolor: '#F5F5F1',
                      borderRadius: 1,
                      p: 1
                    }}
                  >
                    {group.key === 'buttonStyle' ? (
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1,
                          fontSize: 9,
                          bgcolor: option.value === 'outline' ? 'transparent' : brand.primary,
                          color: option.value === 'outline' ? brand.primary : '#fff',
                          border: `1px solid ${brand.primary}`,
                          borderRadius: option.value === 'rounded' ? '99px' : '3px'
                        }}
                      >
                        Continue
                      </Box>
                    ) : group.key === 'finish' ? (
                      <Box
                        sx={{
                          width: '80%',
                          height: 38,
                          bgcolor: '#fff',
                          border: option.value === 'outlined' ? '1px solid #C9C9C2' : 'none',
                          boxShadow: option.value === 'elevated' ? '0 5px 12px #0002' : 'none',
                          borderRadius: `${e.corners}px`,
                          p: 1
                        }}
                      >
                        <Box sx={{ height: 4, width: '50%', bgcolor: brand.primary }} />
                        <Box sx={{ height: 3, width: '80%', bgcolor: '#D9D9D2', mt: 0.7 }} />
                      </Box>
                    ) : group.key === 'navStyle' ? (
                      <Box
                        sx={{
                          width: '90%',
                          fontSize: 9,
                          p: 1,
                          color: brand.primary,
                          bgcolor: option.value === 'pill' ? '#E5E5DE' : 'transparent',
                          borderRadius: option.value === 'pill' ? '5px' : 0,
                          borderLeft: option.value === 'line' ? `2px solid ${brand.primary}` : 'none'
                        }}
                      >
                        Overview
                      </Box>
                    ) : (
                      <Box sx={{ width: '90%' }}>
                        {[0, 1, 2].map((i) => (
                          <Box
                            key={i}
                            sx={{
                              height: option.value === 'relaxed' ? 14 : 11,
                              borderBottom: '1px solid #D9D9D2',
                              bgcolor: option.value === 'striped' && i % 2 ? '#DFDFD6' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              px: 0.5
                            }}
                          >
                            <Box sx={{ height: 2, width: '45%', bgcolor: '#97978E' }} />
                            <Box sx={{ height: 2, width: '25%', bgcolor: brand.primary }} />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 11 }}>{option.label}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
