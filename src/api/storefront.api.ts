import axios from 'utils/axios';
import type {
  StorefrontSite,
  SectionRegistry,
  StorefrontPage,
  StorefrontVersion,
  StorefrontDomain,
  StorefrontProduct,
  StorefrontCollection,
  MediaAsset,
  StorefrontOrder,
  StorefrontChecklist,
  StorefrontDraft,
  UpdateSitePayload,
  CreatePagePayload,
  UpdatePagePayload,
  UpdateSectionsPayload,
  UpdateProductPayload,
  CreateCollectionPayload,
  DomainInstructions
} from 'types/storefront';

const root = '/storefront';
const idPath = (resource: string, id: string) => `${root}/${resource}/${encodeURIComponent(id)}/`;

export const storefrontAPI = {
  getPreviewLink: async () => (await axios.get<{ url: string; expires_in: number }>(`${root}/preview-link/`)).data,
  getSite: async () => (await axios.get<StorefrontSite>(`${root}/site/`)).data,
  updateSite: async (data: UpdateSitePayload) => (await axios.patch<StorefrontSite>(`${root}/site/`, data)).data,
  getRegistry: async () => (await axios.get<SectionRegistry>(`${root}/sections/registry/`)).data,
  getPages: async () => (await axios.get<StorefrontPage[]>(`${root}/pages/`)).data,
  createPage: async (data: CreatePagePayload) => (await axios.post<StorefrontPage>(`${root}/pages/`, data)).data,
  getPage: async (id: string) => (await axios.get<StorefrontPage>(idPath('pages', id))).data,
  updatePage: async (id: string, data: UpdatePagePayload) => (await axios.patch<StorefrontPage>(idPath('pages', id), data)).data,
  deletePage: async (id: string): Promise<void> => {
    await axios.delete(idPath('pages', id));
  },
  updateSections: async (id: string, data: UpdateSectionsPayload) =>
    (await axios.put<StorefrontDraft>(`${idPath('pages', id)}sections/`, data)).data,
  publish: async () => (await axios.post<StorefrontVersion>(`${root}/publish/`)).data,
  discardDraft: async () => (await axios.post<StorefrontDraft>(`${root}/discard-draft/`)).data,
  getVersions: async () => (await axios.get<StorefrontVersion[]>(`${root}/versions/`)).data,
  restoreVersion: async (id: string) => (await axios.post<StorefrontDraft>(`${idPath('versions', id)}restore/`)).data,
  getDomains: async () => (await axios.get<StorefrontDomain[]>(`${root}/domains/`)).data,
  addDomain: async (host: string) => (await axios.post<DomainInstructions>(`${root}/domains/`, { host })).data,
  deleteDomain: async (id: string): Promise<void> => {
    await axios.delete(idPath('domains', id));
  },
  verifyDomain: async (id: string) => (await axios.post<StorefrontDomain>(`${idPath('domains', id)}verify/`)).data,
  setPrimaryDomain: async (id: string) => (await axios.post<StorefrontDomain>(`${idPath('domains', id)}primary/`)).data,
  getProducts: async () => (await axios.get<StorefrontProduct[]>(`${root}/products/`)).data,
  updateProduct: async (id: string, data: UpdateProductPayload) =>
    (await axios.patch<StorefrontProduct>(idPath('products', id), data)).data,
  bulkPublishProducts: async (ids: string[], is_published: boolean) =>
    (await axios.post<StorefrontProduct[]>(`${root}/products/bulk-publish/`, { ids, is_published })).data,
  getCollections: async () => (await axios.get<StorefrontCollection[]>(`${root}/collections/`)).data,
  createCollection: async (data: CreateCollectionPayload) => (await axios.post<StorefrontCollection>(`${root}/collections/`, data)).data,
  updateCollection: async (id: string, data: Partial<CreateCollectionPayload>) =>
    (await axios.patch<StorefrontCollection>(idPath('collections', id), data)).data,
  deleteCollection: async (id: string): Promise<void> => {
    await axios.delete(idPath('collections', id));
  },
  getMedia: async () => (await axios.get<MediaAsset[]>(`${root}/media/`)).data,
  uploadMedia: async (data: FormData) => (await axios.post<MediaAsset>(`${root}/media/`, data)).data,
  deleteMedia: async (id: string): Promise<void> => {
    await axios.delete(idPath('media', id));
  },
  getOrders: async () => (await axios.get<StorefrontOrder[]>(`${root}/orders/`)).data,
  getOrder: async (id: string) => (await axios.get<StorefrontOrder>(idPath('orders', id))).data,
  updateFulfilment: async (id: string, fulfilment_status: StorefrontOrder['fulfilment_status']) =>
    (await axios.patch<StorefrontOrder>(`${idPath('orders', id)}fulfilment/`, { fulfilment_status })).data,
  getChecklist: async () => (await axios.get<StorefrontChecklist>(`${root}/checklist/`)).data
};
