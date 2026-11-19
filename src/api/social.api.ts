// Events from the store's Instagram posts (owner trust T15; backend/app/social/views.py), under /api/v1/social/.
//
// Every route answers 404 while the server's SOCIAL_EVENTS_ENABLED is off, so the connection call doubles as the
// flag. The store routes are for an admin or owner (403 otherwise). No route ever returns the access token.

import axiosServices from 'utils/axios';

export type SocialConnectionStatus = 'connected' | 'needs_reconnect' | 'disconnected';

export interface SocialConnection {
  provider: 'instagram';
  status: SocialConnectionStatus;
  username: string | null;
  connected_at: string | null;
  last_pulled_at: string | null;
  /** Suggestions waiting for her. */
  to_review: number;
  /** False until the Meta app's id, secret and redirect URL are set on the server. */
  configured: boolean;
}

export type SocialEventKind = 'sale' | 'in_store_event' | 'pop_up' | 'trunk_show' | 'new_arrival' | 'late_hours' | 'other';
export type SocialProposalStatus = 'proposed' | 'confirmed' | 'dismissed';

export interface SocialProposal {
  id: string;
  status: SocialProposalStatus;
  kind: SocialEventKind;
  kind_label: string;
  start_date: string;
  end_date: string;
  /** null = every store. */
  location_id: string | null;
  location_name: string | null;
  /** The caption's own words that announce the event. */
  quote: string;
  post: { posted_at: string; caption: string; permalink: string | null };
  decided_by_email: string | null;
  decided_at: string | null;
}

export interface ConfirmBody {
  kind: SocialEventKind;
  start_date: string;
  end_date: string;
  location_id: string | null;
}

const BASE = '/social';

export const SocialAPI = {
  connection: async (): Promise<SocialConnection> => (await axiosServices.get(`${BASE}/connection/`)).data,
  connect: async (): Promise<{ authorize_url: string }> => (await axiosServices.post(`${BASE}/connection/connect/`, {})).data,
  callback: async (code: string, state: string): Promise<SocialConnection> =>
    (await axiosServices.post(`${BASE}/connection/callback/`, { code, state })).data,
  disconnect: async (): Promise<SocialConnection> => (await axiosServices.post(`${BASE}/connection/disconnect/`, {})).data,
  proposals: async (status?: SocialProposalStatus): Promise<{ results: SocialProposal[]; count: number }> =>
    (await axiosServices.get(`${BASE}/proposals/`, { params: status ? { status } : undefined })).data,
  confirm: async (id: string, body: ConfirmBody): Promise<SocialProposal> =>
    (await axiosServices.post(`${BASE}/proposals/${id}/confirm/`, body)).data,
  dismiss: async (id: string): Promise<SocialProposal> => (await axiosServices.post(`${BASE}/proposals/${id}/dismiss/`, {})).data,
  withdraw: async (id: string): Promise<SocialProposal> => (await axiosServices.post(`${BASE}/proposals/${id}/withdraw/`, {})).data
};

export default SocialAPI;
