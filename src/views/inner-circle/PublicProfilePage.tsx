import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import {
  fetchPublicProfile,
  unsubscribePublicProfile,
  updatePublicProfile,
  type CustomerTier,
  type PublicProfile
} from 'api/innerCircle.api';

// ---------------------------------------------------------------------------
// Tier theming — shopper (silver) → regular (blue) → vault (gold)
// ---------------------------------------------------------------------------

interface TierStyle {
  label: string;
  icon: string;
  color: string;
  gradient: string;
}

const TIER_THEME: Record<CustomerTier, TierStyle> = {
  shopper: { label: 'Shopper', icon: '🛍️', color: '#8a8d93', gradient: 'linear-gradient(135deg, #c4c7cc 0%, #8a8d93 100%)' },
  regular: { label: 'Regular', icon: '⭐', color: '#1e88e5', gradient: 'linear-gradient(135deg, #5eb1f0 0%, #1565c0 100%)' },
  vault: { label: 'Vault', icon: '👑', color: '#d4af37', gradient: 'linear-gradient(135deg, #f7d774 0%, #c79100 100%)' }
};

const TIER_ORDER: CustomerTier[] = ['shopper', 'regular', 'vault'];

const STAT_ACCENTS = ['#7c4dff', '#00897b', '#f4511e', '#3949ab'];

const TAG_PALETTE = ['#7c4dff', '#1e88e5', '#00897b', '#e91e63', '#f4511e', '#3949ab', '#00acc1', '#8e24aa'];

function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

function formatPurchaseDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || parts[0]?.[1] || '';
  return (first + second).toUpperCase();
}

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string | number; accent: string }) {
  return (
    <Box
      sx={{
        flex: '1 1 45%',
        minWidth: 0,
        p: 2,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 2px rgba(16,24,40,0.04)'
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          bgcolor: alpha(accent, 0.12),
          mb: 1.25
        }}
      >
        {icon}
      </Box>
      <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block', whiteSpace: 'normal' }}>
        {label}
      </Typography>
    </Box>
  );
}

function SectionCard({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
        ...sx
      }}
    >
      {children}
    </Paper>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        p: 2
      }}
    >
      <Paper
        elevation={0}
        sx={{ p: 4, maxWidth: 420, width: '100%', textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
      >
        {children}
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PublicProfilePage() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [birthday, setBirthday] = useState('');
  const [optedIn, setOptedIn] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justUnsubscribed, setJustUnsubscribed] = useState(false);
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const queryKey = ['public-profile', token];

  const {
    data: profile,
    isLoading,
    isError
  } = useQuery({
    queryKey,
    queryFn: () => fetchPublicProfile(token),
    enabled: token.length > 0,
    retry: false
  });

  useEffect(() => {
    if (!profile) return;
    setBirthday(profile.birthday ?? '');
    setOptedIn(profile.opted_in);
  }, [profile]);

  // Animate the progress bar fill on load
  useEffect(() => {
    if (!profile) return;
    const target = Math.min(Math.max(profile.tier_progress.percent, 0), 100);
    const t = setTimeout(() => setAnimatedPercent(target), 200);
    return () => clearTimeout(t);
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: { birthday?: string | null; opted_in?: boolean }) => updatePublicProfile(token, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
    }
  });

  const unsubscribeMutation = useMutation({
    mutationFn: () => unsubscribePublicProfile(token),
    onSuccess: () => {
      setOptedIn(false);
      setJustUnsubscribed(true);
      queryClient.setQueryData<PublicProfile | undefined>(queryKey, (prev) => (prev ? { ...prev, opted_in: false } : prev));
    },
    onError: () => {
      enqueueSnackbar('Could not process your request. Please try again.', { variant: 'error' });
    }
  });

  const saveBirthday = () => {
    if (!profile) return;
    const next = birthday || null;
    if (next === (profile.birthday ?? null)) return;
    updateMutation.mutate(
      { birthday: next },
      {
        onSuccess: () => enqueueSnackbar('Birthday saved', { variant: 'success' }),
        onError: () => enqueueSnackbar('Could not save birthday', { variant: 'error' })
      }
    );
  };

  const handleOptedInChange = (checked: boolean) => {
    if (!profile) return;
    setOptedIn(checked);
    if (checked) setJustUnsubscribed(false);
    updateMutation.mutate(
      { opted_in: checked },
      {
        onSuccess: () => enqueueSnackbar(checked ? 'Subscribed to emails' : 'Unsubscribed from emails', { variant: 'success' }),
        onError: () => {
          setOptedIn(profile.opted_in);
          enqueueSnackbar('Could not update email preferences', { variant: 'error' });
        }
      }
    );
  };

  // ---- Loading ----------------------------------------------------------
  if (isLoading) {
    return (
      <CenteredCard>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="textSecondary">Loading your profile…</Typography>
        </Stack>
      </CenteredCard>
    );
  }

  // ---- Missing / invalid / expired token --------------------------------
  if (!token || isError || !profile) {
    return (
      <CenteredCard>
        <Stack spacing={1.5} alignItems="center">
          <Typography sx={{ fontSize: 56 }}>🔒</Typography>
          <Typography variant="h3">Link expired or invalid</Typography>
          <Typography color="textSecondary">
            This profile link is no longer valid. Please use the most recent link from your email, or contact the store for a fresh one.
          </Typography>
        </Stack>
      </CenteredCard>
    );
  }

  const brandColor = profile.company.brand_color || theme.palette.primary.main;
  const onBrand = theme.palette.getContrastText(brandColor);
  const progress = profile.tier_progress;
  const currentTier = (profile.tier ?? (progress.current_tier as CustomerTier)) || 'shopper';
  const currentTierStyle = TIER_THEME[currentTier] ?? TIER_THEME.shopper;
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  const waveFill = theme.palette.grey[50];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', pb: 7 }}>
      {/* ---- Premium gradient header with wave bottom ---- */}
      <Box
        sx={{
          position: 'relative',
          background: `linear-gradient(150deg, ${brandColor} 0%, ${alpha(brandColor, 0.72)} 55%, ${alpha(
            theme.palette.common.black,
            0.18
          )} 140%)`,
          color: onBrand,
          px: 2,
          pt: 5,
          pb: 9
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 2, fontWeight: 700 }}>
            {profile.company.name}
          </Typography>
          <Typography variant="h5" sx={{ color: 'inherit', opacity: 0.85, fontWeight: 500, mb: 2.5 }}>
            Your Inner Circle
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha('#fff', 0.18),
                border: `2px solid ${alpha('#fff', 0.35)}`,
                fontWeight: 800,
                fontSize: 22,
                flexShrink: 0
              }}
            >
              {getInitials(profile.name)}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h2" sx={{ color: 'inherit', fontWeight: 800 }} noWrap>
                {profile.name}
              </Typography>
              {profile.tier && (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    mt: 1,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 999,
                    background: currentTierStyle.gradient,
                    color: '#1a1a1a',
                    fontWeight: 800,
                    fontSize: 13,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
                  }}
                >
                  <span style={{ fontSize: 15 }}>{currentTierStyle.icon}</span>
                  {currentTierStyle.label} member
                </Box>
              )}
            </Box>
          </Stack>
        </Container>

        {/* curved wave */}
        <Box
          component="svg"
          viewBox="0 0 500 60"
          preserveAspectRatio="none"
          sx={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 60, display: 'block' }}
        >
          <path d="M0,40 C150,75 350,5 500,40 L500,60 L0,60 Z" fill={waveFill} />
        </Box>
      </Box>

      <Container maxWidth="sm" sx={{ mt: -2.5, position: 'relative' }}>
        <Stack spacing={2.5}>
          {justUnsubscribed && (
            <Alert severity="success" variant="filled" sx={{ borderRadius: 3 }}>
              You&apos;ve been unsubscribed from {profile.company.name} emails. You can opt back in any time using the toggle below.
            </Alert>
          )}

          {/* ---- Stats ---- */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <StatCard icon="💰" label="Lifetime spend" value={formatCurrency(profile.ltv)} accent={STAT_ACCENTS[0]} />
            <StatCard icon="🏪" label="Total visits" value={profile.visit_count} accent={STAT_ACCENTS[1]} />
            <StatCard icon="🛒" label="Avg order value" value={formatCurrency(profile.avg_order_value)} accent={STAT_ACCENTS[2]} />
            <StatCard
              icon="📅"
              label="Days since last visit"
              value={profile.days_since_last_visit != null ? profile.days_since_last_visit : '—'}
              accent={STAT_ACCENTS[3]}
            />
          </Stack>

          {/* ---- Tier progress ---- */}
          <SectionCard>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
              Your membership journey
            </Typography>

            {/* tier journey nodes */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
              {TIER_ORDER.map((tier, idx) => {
                const ts = TIER_THEME[tier];
                const achieved = idx <= currentIndex;
                return (
                  <Stack key={tier} direction="row" alignItems="center" sx={{ flex: idx < TIER_ORDER.length - 1 ? 1 : 'none' }}>
                    <Stack alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          background: achieved ? ts.gradient : alpha(theme.palette.text.disabled, 0.12),
                          filter: achieved ? 'none' : 'grayscale(1) opacity(0.6)',
                          boxShadow: achieved ? `0 3px 10px ${alpha(ts.color, 0.4)}` : 'none',
                          transition: 'all .3s ease'
                        }}
                      >
                        {ts.icon}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: achieved ? 700 : 500, color: achieved ? 'text.primary' : 'text.disabled' }}
                      >
                        {ts.label}
                      </Typography>
                    </Stack>
                    {idx < TIER_ORDER.length - 1 && (
                      <Box
                        sx={{
                          flex: 1,
                          height: 3,
                          mx: 1,
                          mb: 2.5,
                          borderRadius: 2,
                          bgcolor: idx < currentIndex ? TIER_THEME[TIER_ORDER[idx + 1]].color : alpha(theme.palette.text.disabled, 0.18)
                        }}
                      />
                    )}
                  </Stack>
                );
              })}
            </Stack>

            <LinearProgress
              variant="determinate"
              value={animatedPercent}
              sx={{
                height: 12,
                borderRadius: 6,
                bgcolor: alpha(brandColor, 0.14),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: currentTierStyle.gradient,
                  transition: 'transform 1.1s cubic-bezier(0.4, 0, 0.2, 1)'
                }
              }}
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1.25 }}>
              {progress.next_tier ? (
                <>
                  <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {formatCurrency(progress.amount_to_next)}
                  </Box>{' '}
                  more to unlock {TIER_THEME[progress.next_tier as CustomerTier]?.icon}{' '}
                  {TIER_THEME[progress.next_tier as CustomerTier]?.label ?? progress.next_tier}
                </>
              ) : (
                "You've reached our top tier — thank you for being part of our Inner Circle! 👑"
              )}
            </Typography>
          </SectionCard>

          {/* ---- Style tags ---- */}
          {profile.style_tags.length > 0 && (
            <SectionCard>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                Your style
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {profile.style_tags.map((tag) => {
                  const c = tagColor(tag);
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      size="medium"
                      sx={{
                        fontWeight: 700,
                        color: c,
                        bgcolor: alpha(c, 0.12),
                        border: `1px solid ${alpha(c, 0.3)}`,
                        '& .MuiChip-label': { px: 1.5 }
                      }}
                    />
                  );
                })}
              </Stack>
            </SectionCard>
          )}

          {/* ---- Recent purchases ---- */}
          <SectionCard>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              Recent purchases
            </Typography>
            {profile.recent_purchases.length === 0 ? (
              <Stack alignItems="center" spacing={1} sx={{ py: 4, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 34,
                    bgcolor: alpha(brandColor, 0.1)
                  }}
                >
                  🛍️
                </Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  No purchases yet
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 260 }}>
                  Your recent purchases will show up here once you shop with {profile.company.name}.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1.25} sx={{ mt: 0.5 }}>
                {profile.recent_purchases.map((p) => (
                  <Stack
                    key={p.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.text.primary, 0.025),
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          bgcolor: alpha(brandColor, 0.12),
                          flexShrink: 0
                        }}
                      >
                        🧾
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {formatPurchaseDate(p.transaction_date)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" noWrap>
                          {p.line_count} {p.line_count === 1 ? 'item' : 'items'}
                          {p.receipt_number ? ` · #${p.receipt_number}` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="subtitle2" fontWeight={800}>
                      {formatCurrency(p.total)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>

          {/* ---- Preferences ---- */}
          <SectionCard>
            <Typography variant="subtitle1" fontWeight={800}>
              Your preferences
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2.5 }}>
              Tell us a little more so we can make your perks personal.
            </Typography>

            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  🎂 Birthday
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                  <TextField
                    type="date"
                    size="small"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    disabled={updateMutation.isPending}
                  />
                  <Button
                    variant="contained"
                    onClick={saveBirthday}
                    disabled={updateMutation.isPending || (birthday || null) === (profile.birthday ?? null)}
                    sx={{ borderRadius: 2, boxShadow: 'none' }}
                  >
                    Save
                  </Button>
                </Stack>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <FormControlLabel
                  sx={{ m: 0, display: 'flex', justifyContent: 'space-between', width: '100%' }}
                  labelPlacement="start"
                  control={
                    <Switch checked={optedIn} onChange={(_, checked) => handleOptedInChange(checked)} disabled={updateMutation.isPending} />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        Email me perks & treats
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Offers, early access & birthday surprises
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Stack>
          </SectionCard>

          {/* ---- Unsubscribe ---- */}
          <Box sx={{ textAlign: 'center', pt: 0.5 }}>
            <Button
              color="inherit"
              size="small"
              onClick={() => setConfirmOpen(true)}
              disabled={unsubscribeMutation.isPending || !optedIn}
              sx={{ color: 'text.secondary', textTransform: 'none', textDecoration: 'underline', '&:hover': { color: 'error.main' } }}
            >
              Unsubscribe from all emails
            </Button>
          </Box>

          <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center', display: 'block', opacity: 0.7 }}>
            Powered by Allyvia Inner Circle · Made with ❤️ by humans on Earth
          </Typography>
        </Stack>
      </Container>

      {/* Unsubscribe confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Unsubscribe?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You&apos;ll stop receiving emails from {profile.company.name}, including perks and birthday treats. You can re-subscribe any
            time.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disableElevation
            disabled={unsubscribeMutation.isPending}
            onClick={() => {
              unsubscribeMutation.mutate(undefined, { onSettled: () => setConfirmOpen(false) });
            }}
          >
            Unsubscribe
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
