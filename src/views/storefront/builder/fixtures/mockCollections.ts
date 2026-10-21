/**
 * TEMPORARY fixtures — swap to GET /storefront/collections/ once T1 lands.
 */
import type { StorefrontCollectionRef } from '../types.local';

export const mockCollections: StorefrontCollectionRef[] = [
  { id: 'col_bestsellers', title: 'Bestsellers' },
  { id: 'col_new_arrivals', title: 'New arrivals' },
  { id: 'col_office', title: 'Office essentials' },
  { id: 'col_gifts', title: 'Gift guide' }
];
