// api/recommendationAction.api.ts
//
// What a recommendation's main button opens (owner trust T16). Transport only:
// the answers are read through features/insights/actionPrefill.ts, which is
// importable without axios.
//
// Both calls take the store the Insights page is showing (`?location_id=`) as
// X-Location-Id, as the card list does, so a card is found under the same scope
// it was listed under.

import axiosServices from 'utils/axios';

const headersFor = (locationId?: string | null) => (locationId ? { headers: { 'X-Location-Id': locationId } } : undefined);

/** GET /agent/recommendations/<Recommendation id>/action/ */
export const getRecommendationAction = async (recommendationId: string, locationId?: string | null): Promise<unknown> => {
  const response = await axiosServices.get(
    `/agent/recommendations/${encodeURIComponent(recommendationId)}/action/`,
    headersFor(locationId)
  );
  return response.data;
};

/** POST /inventory/price-changes/: the price review's Approve. All of the items or none. */
export const postPriceChanges = async (body: unknown, locationId?: string | null): Promise<unknown> => {
  const response = await axiosServices.post('/inventory/price-changes/', body, headersFor(locationId));
  return response.data;
};
