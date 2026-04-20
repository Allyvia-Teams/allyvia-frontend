import axiosServices from 'utils/axios';
import { AcceptInvitationResponse } from 'types/invitation';

export async function acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
  const response = await axiosServices.post<AcceptInvitationResponse>(`/role/invitations/accept/${token}/`);
  return response.data;
}
