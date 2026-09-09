import { loadGoogleFont } from 'utils/loadFont';
import { findBrandFont } from 'config/brandFonts';
import { useRef, useState, useEffect } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { IconArrowRight, IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import type { BrandTheme } from 'types/config';
import { analyzeBrandKit } from 'api/branding';
import { BrandAnalysis, BrandAsset, prepareBrandAsset, tailorBrand } from 'utils/brandKit';

export default function BrandKitPanel({
  brand,
  onChange,
  style,
  previewOnly = false
}: {
  brand: NonNullable<BrandTheme>;
  onChange: (brand: NonNullable<BrandTheme>) => void;
  style: string;
  previewOnly?: boolean;
}) {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [website, setWebsite] = useState(brand.brandKit?.website ?? '');
  const [colors, setColors] = useState(brand.brandKit?.colors.join(' ') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<BrandAnalysis | null>(null);
  const [before, setBefore] = useState<NonNullable<BrandTheme> | null>(null);
  const fontMatch = findBrandFont(analysis?.typography?.matched_family ?? '');
  useEffect(() => {
    if (fontMatch) loadGoogleFont(fontMatch.family);
  }, [fontMatch]);
  const generation = useRef(0);
  const touched = useRef(false);
  const live = useRef(true);
  useEffect(() => {
    if (touched.current || !brand.brandKit) return;
    setWebsite(brand.brandKit.website);
    setColors(brand.brandKit.colors.join(' '));
    setAssets(
      brand.brandKit.sources.map((source) => ({
        ...source,
        image: source.kind === 'logo' ? (brand.brandKit?.logo ?? source.thumbnail) : source.thumbnail,
        colors: []
      }))
    );
  }, [brand.brandKit]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      generation.current++;
    };
  }, []);
  const invalidate = () => {
    touched.current = true;
    generation.current++;
    setAnalysis(null);
    setBefore(null);
  };
  const add = async (files: FileList | null, kind: BrandAsset['kind']) => {
    if (!files?.length) return;
    if (assets.filter((a) => kind !== 'logo' || a.kind !== 'logo').length + files.length > 6) {
      setError('Add up to six images in your brand kit.');
      return;
    }
    invalidate();
    setBusy(true);
    setError('');
    const current = generation.current;
    try {
      const added = await Promise.all(Array.from(files).map((file) => prepareBrandAsset(file, kind)));
      if (live.current && current === generation.current)
        setAssets((previous) => [...previous.filter((a) => kind !== 'logo' || a.kind !== 'logo'), ...added]);
    } catch (e) {
      if (live.current) setError(e instanceof Error ? e.message : 'Could not read those images.');
    } finally {
      if (live.current) setBusy(false);
    }
  };
  const analyze = async () => {
    const explicit = colors.split(/[\s,;]+/).filter(Boolean);
    if (explicit.some((c) => !/^#[\da-f]{6}$/i.test(c)) || explicit.length > 12) {
      setError('Enter up to 12 six-digit colors, like #234C3A, separated by spaces.');
      return;
    }
    if (!assets.length && !explicit.length && !website) {
      setError('Add brand materials first.');
      return;
    }
    setBusy(true);
    setError('');
    setAnalysis(null);
    setBefore(null);
    const current = ++generation.current;
    try {
      const result: BrandAnalysis = previewOnly
        ? {
            colors: [...new Set([...explicit, ...assets.flatMap((a) => a.colors)].map((c) => c.toUpperCase()))].slice(0, 12),
            primary: explicit[0],
            fonts: [],
            website,
            method: 'extracted',
            interpretation: null,
            warnings: website
              ? ['This playground reads uploaded images and colors. Website and visual analysis run in your signed-in workspace.']
              : ['Visual font identification runs in your signed-in workspace. This playground extracts colors locally.']
          }
        : await analyzeBrandKit({ website, colors: explicit, images: assets, style });
      if (live.current && current === generation.current) setAnalysis(result);
    } catch {
      if (live.current) setError('Brand analysis is unavailable. Your uploads are still here. Please try again.');
    } finally {
      if (live.current) setBusy(false);
    }
  };
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: { xs: 2, md: 3 }, bgcolor: 'background.paper' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="overline" sx={{ letterSpacing: '.14em' }}>
            02 / MAKE IT YOURS
          </Typography>
          <Typography variant="h3" sx={{ fontSize: 22, mt: 0.5 }}>
            Bring your brand into the room.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Your logo, website and visual references give your chosen style its own identity.
          </Typography>
        </Box>
        <Chip variant="outlined" label={previewOnly ? 'Local image analysis' : 'Brand kit'} sx={{ alignSelf: 'flex-start' }} />
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="fieldset" disabled={busy} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 1.5, mb: 2 }}>
          {(
            [
              { kind: 'logo', title: 'Your logo', description: 'A transparent PNG or SVG works best.' },
              { kind: 'design', title: 'Design references', description: 'Brand boards, packaging or website screenshots.' },
              { kind: 'gallery', title: 'Your visual world', description: 'Campaigns, products, interiors and imagery.' }
            ] as const
          ).map((item) => (
            <Button
              component="label"
              key={item.kind}
              variant="outlined"
              sx={{
                display: 'block',
                textAlign: 'left',
                p: 2,
                color: 'text.primary',
                borderColor: 'divider',
                borderStyle: 'dashed',
                textTransform: 'none',
                borderRadius: '10px'
              }}
            >
              <IconUpload size={20} />
              <Typography sx={{ fontWeight: 600, fontSize: 13, mt: 1 }}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {item.description}
              </Typography>
              <input
                hidden
                type="file"
                aria-label={`Upload ${item.title.toLowerCase()}`}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                multiple={item.kind !== 'logo'}
                onChange={(event) => {
                  void add(event.target.files, item.kind);
                  event.target.value = '';
                }}
              />
            </Button>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary">
          PNG, JPG, WebP or SVG · Up to 6 images, 8 MB each. Images are resized before analysis.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <TextField
            size="small"
            fullWidth
            label="Brand website"
            placeholder="https://yourbrand.com"
            value={website}
            onChange={(e) => {
              invalidate();
              setWebsite(e.target.value);
            }}
          />
          <TextField
            size="small"
            fullWidth
            label="Your exact colors"
            placeholder="#234C3A #F3F0E8"
            value={colors}
            onChange={(e) => {
              invalidate();
              setColors(e.target.value);
            }}
          />
        </Stack>
        {!!assets.length && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 2, overflowX: 'auto', pb: 1 }}>
            {assets.map((asset, i) => (
              <Box key={`${asset.name}-${i}`} sx={{ width: 110, flexShrink: 0, position: 'relative' }}>
                <Box
                  component="img"
                  alt={asset.name}
                  src={asset.thumbnail}
                  sx={{
                    width: 110,
                    height: 80,
                    objectFit: 'contain',
                    bgcolor: '#F0F0EC',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1
                  }}
                />
                <Button
                  aria-label={`Remove ${asset.name}`}
                  disabled={busy}
                  onClick={() => {
                    invalidate();
                    setAssets((a) => a.filter((_, index) => index !== i));
                  }}
                  sx={{ position: 'absolute', right: 0, top: 0, minWidth: 24, p: 0.25, bgcolor: 'background.paper', color: 'text.primary' }}
                >
                  <IconX size={15} />
                </Button>
                <Typography noWrap variant="caption" sx={{ display: 'block' }}>
                  {asset.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {asset.kind}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
        <Button
          variant="contained"
          onClick={() => void analyze()}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <IconPhoto size={17} />}
          sx={{ mt: 2 }}
        >
          {busy ? 'Reading your brand…' : 'Read my brand'}
        </Button>
      </Box>
      {analysis && (
        <Box sx={{ mt: 2.5, p: 2.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="h4" sx={{ fontSize: 16 }}>
            Your brand, translated.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {analysis.interpretation?.character ??
              'We extracted these colors and typefaces from your materials. Review them before tailoring your style.'}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ my: 1.5 }}>
            {analysis.colors.map((c) => (
              <Chip
                key={c}
                variant="outlined"
                label={c}
                icon={<Box sx={{ width: 14, height: 14, bgcolor: c, borderRadius: '50%', border: '1px solid #999' }} />}
              />
            ))}
          </Stack>
          {analysis.typography && (
            <Box sx={{ my: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
              <Typography variant="subtitle2">
                {analysis.typography.source === 'visual'
                  ? 'Logo typography · visual match'
                  : analysis.typography.source === 'css'
                    ? 'Website typography · CSS declaration'
                    : 'Typography needs a clearer reference'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {analysis.typography.detected_family ? `Identified candidate: ${analysis.typography.detected_family}. ` : ''}
                {analysis.typography.reasoning}
              </Typography>
              {fontMatch && (
                <>
                  <Typography sx={{ fontFamily: fontMatch.family, fontSize: 28, my: 1 }}>
                    {brand.identity?.name || 'Your brand, in its own voice.'}
                  </Typography>
                  <Typography variant="caption">
                    {fontMatch.family} · {analysis.typography.confidence} confidence
                    {brand.customFontUrl ? ' · Your custom font will be preserved.' : ' · Applied when you tailor this style.'}
                  </Typography>
                </>
              )}
              {analysis.typography.source === 'visual' && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  A visual match, not a verified original font. Custom lettering may not have an exact font equivalent.
                </Typography>
              )}
              {analysis.typography.source === 'css' && !fontMatch && (
                <Typography variant="caption">Add your licensed font URL in advanced settings to use this exact family.</Typography>
              )}
            </Box>
          )}
          {!!analysis.fonts.length && (
            <Typography variant="caption">
              Detected type: {analysis.fonts.join(', ')}. Supported families are matched automatically; custom fonts can be added in
              advanced settings.
            </Typography>
          )}
          {analysis.interpretation?.reasoning && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {analysis.interpretation.reasoning}
            </Typography>
          )}
          {analysis.warnings.map((w, i) => (
            <Alert key={i} severity="info" sx={{ mt: 1 }}>
              {w}
            </Alert>
          ))}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              endIcon={<IconArrowRight size={16} />}
              disabled={!analysis.colors.length && !analysis.fonts.length && !assets.length && !fontMatch}
              onClick={() => {
                setBefore(brand);
                onChange(tailorBrand({ ...brand, styleId: style }, analysis, assets));
              }}
            >
              Tailor my chosen style
            </Button>
            {before && (
              <Button
                onClick={() => {
                  onChange(before);
                  setBefore(null);
                }}
              >
                Undo tailoring
              </Button>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Your layout and element choices stay intact. Save the workspace style when you are happy with it.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
