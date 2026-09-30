// views/inventory/itemSubmit.ts
//
// Executing an ItemSubmission: the only place the Add Item form reaches the
// network.
//
// Split from itemForm.ts on purpose. This module imports the api layer and so,
// through it, axios and the redux store; itemForm.ts stays free of all three
// and testable in a bare node environment. It is the same split, for the same
// reason, as inventoryStock.query.ts against inventoryStock.api.ts.

import { createProduct, createVariant, type Product } from 'api/inventoryStock.api';

import { type ItemSubmission, mintStyleCode } from './itemForm';

/** True for the one 400 a retry can fix: the minted style code collided. */
const isStyleCodeCollision = (error: unknown): boolean => {
  const response = (error as { response?: { status?: number; data?: Record<string, unknown> } })?.response;
  if (response?.status !== 400) return false;
  return Array.isArray(response.data?.style_code) && response.data.style_code.length > 0;
};

/**
 * Post one submission, and return the style it landed on.
 *
 * Two doors, chosen by `planItemSubmission`, and neither is the legacy
 * item-create endpoint — that one knows nothing about styles and writes its
 * opening quantity straight onto the column, skipping the stock ledger.
 *
 * The one retry is for the minted style code. `POST /products/` requires
 * `style_code` from the client (the backend's minter is register-only), so the
 * form mints against the products list it has already loaded. A style created
 * by someone else since that load collides, and the server answers 400 having
 * created nothing — so re-minting around the code it just refused and posting
 * once more is safe. Once, not in a loop: a second refusal is not a race.
 */
export const submitItem = async (submission: ItemSubmission): Promise<Product> => {
  if (submission.door === 'add_variant') {
    return createVariant(submission.productId, submission.payload);
  }

  try {
    return await createProduct(submission.payload);
  } catch (error) {
    if (!isStyleCodeCollision(error)) throw error;

    const refused = submission.payload.style_code;
    return createProduct({
      ...submission.payload,
      style_code: mintStyleCode({
        brand: submission.payload.brand,
        name: submission.payload.name,
        taken: [refused]
      })
    });
  }
};
