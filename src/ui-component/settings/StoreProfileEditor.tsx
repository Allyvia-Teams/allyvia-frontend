import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Chip, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { fetchStoreProfile, saveStoreProfile, type StoreProfile } from 'api/innerCircle.api';
import { AUDIENCES, CATEGORIES, EMPTY_STORE_PROFILE, profileError } from 'views/inner-circle/network';

export default function StoreProfileEditor({ companyId, onDraft }: { companyId: string; onDraft: (profile: StoreProfile) => void }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['store-profile', companyId], queryFn: fetchStoreProfile });
  const [draft, setDraft] = useState<StoreProfile>(EMPTY_STORE_PROFILE);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (query.data) {
      setDraft(query.data);
      onDraft(query.data);
    }
  }, [query.data, onDraft]);
  const update = (value: Partial<StoreProfile>) => {
    const next = { ...draft, ...value };
    setDraft(next);
    onDraft(next);
    setMessage(null);
  };
  const error = profileError(draft);
  if (query.isPending) return <Skeleton height={180} />;
  if (query.isError)
    return (
      <Alert severity="error" action={<Button onClick={() => query.refetch()}>Retry</Button>}>
        Store description could not be loaded.
      </Alert>
    );
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Your Discover profile</Typography>
      <TextField
        label="Store description"
        multiline
        minRows={2}
        value={draft.description}
        onChange={(e) => update({ description: e.target.value })}
        helperText={`${draft.description.length}/280 characters`}
        inputProps={{ maxLength: 280 }}
      />
      <TextField
        label="Instagram URL"
        placeholder="https://www.instagram.com/yourstore"
        value={draft.instagram_url}
        onChange={(e) => update({ instagram_url: e.target.value })}
      />
      <Typography variant="subtitle2">What do you sell?</Typography>
      <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={category}
            color={draft.categories.includes(category) ? 'primary' : 'default'}
            role="checkbox"
            aria-checked={draft.categories.includes(category)}
            onClick={() =>
              update({
                categories: draft.categories.includes(category)
                  ? draft.categories.filter((value) => value !== category)
                  : [...draft.categories, category]
              })
            }
          />
        ))}
      </Stack>
      <Typography variant="subtitle2">Who do you stock for?</Typography>
      <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
        {AUDIENCES.map((audience) => (
          <Chip
            key={audience}
            label={audience}
            color={draft.audience === audience ? 'primary' : 'default'}
            role="radio"
            aria-checked={draft.audience === audience}
            onClick={() => update({ audience: draft.audience === audience ? '' : audience })}
          />
        ))}
      </Stack>
      {error ? <Alert severity="warning">{error}</Alert> : null}
      {message ? <Alert severity={failed ? 'error' : 'success'}>{message}</Alert> : null}
      <Button
        variant="outlined"
        disabled={saving || !!error}
        onClick={async () => {
          setSaving(true);
          setMessage(null);
          try {
            const saved = await saveStoreProfile(draft);
            client.setQueryData(['store-profile', companyId], saved);
            setFailed(false);
            setMessage('Discover profile saved.');
          } catch {
            setFailed(true);
            setMessage('Could not save the profile. Please try again.');
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? 'Saving…' : 'Save Discover profile'}
      </Button>
    </Stack>
  );
}
