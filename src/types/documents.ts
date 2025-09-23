// Document types for Google Drive integration

export interface GoogleDriveFile {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  folder: string;
  related_to?: string;
  uploaded_by: string;
  uploaded_at: string;
  last_modified: string;
  download_url?: string;
  share_url?: string;
  is_shared: boolean;
  web_view_link?: string;
  thumbnail_link?: string;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  path: string;
  parent_id?: string;
  file_count: number;
  web_view_link?: string;
}

export interface UploadDocumentData {
  file: File;
  folder_id?: string;
  related_to?: string;
}

export interface ShareDocumentData {
  document_id: string;
  emails: string[];
  permission: 'viewer' | 'commenter' | 'writer';
  message?: string;
}

export interface DocumentFilters {
  search?: string;
  uploader?: string;
  from?: string;
  to?: string;
  folder_id?: string;
}

export interface GoogleDriveConnectionStatus {
  connected: boolean;
  user_info?: {
    display_name: string;
    email: string;
    profile_photo?: string;
  };
}

export interface DocumentStats {
  total_documents: number;
  total_size: number;
  starred_documents: number;
  recent_uploads: number;
}
