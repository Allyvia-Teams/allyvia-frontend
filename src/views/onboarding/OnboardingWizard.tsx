import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';

import MainCard from 'ui-component/cards/MainCard';
import { useSelector } from 'store';
import { isProfileComplete, isStepReachable, resolveStep, STEP_LABELS, stepCompletion, WIZARD_STEPS, type WizardStep } from './wizardState';
import { useCompanyProfile, useIntegrationStatuses, useOnboardingRegistry, useOnboardingState } from './hooks/useOnboardingQueries';
import Step1BusinessProfile from './steps/Step1BusinessProfile';
import Step2Integrations from './steps/Step2Integrations';
import Step3Upload from './steps/Step3Upload';
import Step4ReviewMap from './steps/Step4ReviewMap';
import Step5Progress from './steps/Step5Progress';
import Step6DataHealth from './steps/Step6DataHealth';

export default function OnboardingWizard() {
  const companyId = useSelector((s) => s.auth.currentRole?.company_id);
  const roleType = useSelector((s) => s.auth.currentRole?.role_type);

  const { query: stateQuery } = useOnboardingState(!!companyId);
  const registryQuery = useOnboardingRegistry(!!companyId);
  const profileQuery = useCompanyProfile(companyId);
  const { anyConnected } = useIntegrationStatuses(companyId);

  const state = stateQuery.data;
  const profile = profileQuery.data;

  const [searchParams, setSearchParams] = useSearchParams();
  const step = resolveStep(searchParams.get('step'), state, profile, new Date());

  // Keep the URL honest: refresh/bookmark always restores a valid position,
  // while an explicit reachable ?step= (user tabbed back) is respected.
  // replace:true throughout — browser Back leaves the wizard; the in-wizard
  // Back button covers step navigation (Inner Circle tab-param precedent).
  useEffect(() => {
    if (searchParams.get('step') !== String(step)) {
      setSearchParams({ step: String(step) }, { replace: true });
    }
  }, [step, searchParams, setSearchParams]);

  const goToStep = (target: WizardStep) => {
    setSearchParams({ step: String(target) }, { replace: true });
  };

  const completion = stepCompletion(state, profile, anyConnected);
  const jobs = state?.jobs ?? [];

  const nextTarget: WizardStep | null = (() => {
    switch (step) {
      case 1:
        return 2;
      case 2:
        return 3;
      case 3:
        return jobs.some((job) => job.phase === 'await_map') ? 4 : 5;
      case 4:
        return 5;
      case 5:
        return 6;
      default:
        return null;
    }
  })();

  const nextEnabled = (() => {
    switch (step) {
      case 1:
        return isProfileComplete(profile);
      case 2:
        return true;
      case 3:
        return jobs.length > 0;
      case 4:
        return isStepReachable(5, state);
      case 5:
        return isStepReachable(6, state);
      default:
        return false;
    }
  })();

  const nextLabel = step === 2 && !completion[2] ? 'Skip for now' : 'Next';
  const backTarget = [...WIZARD_STEPS].reverse().find((s) => s < step && isStepReachable(s, state)) ?? null;

  const renderStep = () => {
    if (!companyId) {
      return <Alert severity="error">No active company role — switch roles and try again.</Alert>;
    }
    switch (step) {
      case 1:
        return <Step1BusinessProfile companyId={companyId} profile={profile} roleType={roleType} />;
      case 2:
        return <Step2Integrations companyId={companyId} />;
      case 3:
        return <Step3Upload state={state} />;
      case 4:
        return <Step4ReviewMap state={state} registry={registryQuery.data} goToStep={goToStep} />;
      case 5:
        return <Step5Progress state={state} goToStep={goToStep} />;
      default:
        return <Step6DataHealth state={state} goToStep={goToStep} />;
    }
  };

  const stateError = stateQuery.error as any;
  const forbidden = stateError?.response?.status === 403;

  return (
    <MainCard title="Data Onboarding">
      {stateQuery.isError ? (
        <Alert
          severity="error"
          action={
            !forbidden && (
              <Button color="inherit" size="small" onClick={() => stateQuery.refetch()}>
                Retry
              </Button>
            )
          }
        >
          {forbidden
            ? "You don't have access to Data Onboarding. Ask an admin to grant the module."
            : "Couldn't load your onboarding status. Retry in a moment."}
        </Alert>
      ) : !state && stateQuery.isLoading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={240} />
        </Stack>
      ) : (
        <Stack spacing={3}>
          <Stepper activeStep={step - 1} alternativeLabel nonLinear>
            {WIZARD_STEPS.map((s) => (
              <Step key={s} completed={completion[s]}>
                <StepButton onClick={() => goToStep(s)} disabled={!isStepReachable(s, state)}>
                  {STEP_LABELS[s]}
                </StepButton>
              </Step>
            ))}
          </Stepper>

          <Box>{renderStep()}</Box>

          <Divider />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button variant="outlined" disabled={backTarget === null} onClick={() => backTarget !== null && goToStep(backTarget)}>
              Back
            </Button>
            <Box sx={{ flex: 1 }}>
              {step === 1 && !isProfileComplete(profile) && (
                <Typography variant="caption" color="text.secondary">
                  Add your industry and street address to continue.
                </Typography>
              )}
            </Box>
            {nextTarget !== null && (
              <Button variant="contained" disabled={!nextEnabled} onClick={() => goToStep(nextTarget)}>
                {nextLabel}
              </Button>
            )}
          </Stack>
        </Stack>
      )}
    </MainCard>
  );
}
