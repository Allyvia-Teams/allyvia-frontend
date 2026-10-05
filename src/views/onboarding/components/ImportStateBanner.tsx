import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';

import type { OnboardingState } from 'api/onboarding.api';
import { importStatePresentation } from '../wizardState';

interface ImportStateBannerProps {
  state: OnboardingState | undefined;
  /** When set, a button takes the merchant to the import step. */
  onOpenImport?: () => void;
}

// Where the merchant's data actually is — analyzed, ready to import, or
// imported — in the one vocabulary every step shares (wizardState's
// importStatePresentation). Shown wherever the wizard could otherwise be read
// as "finished" while the app is still empty.
export default function ImportStateBanner({ state, onOpenImport }: ImportStateBannerProps) {
  const presentation = importStatePresentation(state?.commit);
  const showAction = onOpenImport && ['Ready to import', 'Analyzed', 'Import failed'].includes(presentation.stage);
  return (
    <Alert
      severity={presentation.tone}
      data-import-stage={presentation.stage}
      action={
        showAction ? (
          <Button color="inherit" size="small" onClick={onOpenImport}>
            {presentation.stage === 'Ready to import' ? 'Review the import' : 'Open import'}
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>{presentation.title}</AlertTitle>
      {presentation.body}
    </Alert>
  );
}
