// Whether onboarding imports run on this server, for the entry points outside
// the wizard (Settings tab, Stripe's "Continue setup"). Shares the wizard's
// ['onboarding-state'] cache, so it costs no extra request once either loads.

import { useQuery } from '@tanstack/react-query';

import { getOnboardingState } from 'api/onboarding.api';

import { onboardingEntryHref, onboardingUnavailable } from '../wizardState';

export function useOnboardingAvailability(enabled: boolean = true) {
  const query = useQuery({
    queryKey: ['onboarding-state'],
    queryFn: getOnboardingState,
    enabled,
    retry: false,
    staleTime: 30_000
  });
  return {
    unavailable: onboardingUnavailable(query.data),
    entryHref: onboardingEntryHref(query.data)
  };
}
