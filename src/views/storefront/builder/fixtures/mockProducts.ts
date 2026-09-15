/**
 * TEMPORARY fixtures — swap to GET /storefront/products/ once T1 lands.
 */
import type { StorefrontProductRef } from '../types.local';

export const mockProducts: StorefrontProductRef[] = [
  { id: 'prod_notebook', title: 'Allyvia Notebook' },
  { id: 'prod_pen_set', title: 'Signature Pen Set' },
  { id: 'prod_desk_mat', title: 'Cork Desk Mat' },
  { id: 'prod_tote', title: 'Canvas Tote' },
  { id: 'prod_mug', title: 'Ceramic Mug' }
];
