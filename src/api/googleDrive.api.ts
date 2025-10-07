// Google Drive API Service
import axiosServices from 'utils/axios';

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

// Configuration flag - set to true to use mock data
const USE_MOCK_DATA = false; // Set to false for real Google Drive integration

export const googleDriveAPI = {
  // Google Drive Authentication
  connectGoogleDrive: async (authCode?: string): Promise<{ auth_url: string } | { success: boolean }> => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.connectGoogleDrive();
    }

    if (authCode) {
      // Exchange authorization code for tokens
      const response = await axiosServices.post('/documents/google-drive/connect/', {
        code: authCode
      });
      return response.data;
    } else {
      // Get OAuth URL
      const response = await axiosServices.get('/documents/google-drive/auth/');
      return response.data;
    }
  },

  disconnectGoogleDrive: async (): Promise<void> => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.disconnectGoogleDrive();
    }
    await axiosServices.delete('/documents/google-drive/disconnect/');
  },

  // delete sync fixed
  syncDocuments: async (): Promise<{
    synced_count: number;
    deleted_count: number;
    updated_count: number;
    message: string;
  }> => {
    if (USE_MOCK_DATA) {
      await googleDriveMockAPI.delay(1000);
      return {
        synced_count: 2,
        deleted_count: 1,
        updated_count: 3,
        message: 'Mock sync completed'
      };
    }
    const response = await axiosServices.post('/documents/google-drive/sync/');
    return response.data;
  },

  // old
  //   getGoogleDriveStatus: async (): Promise<GoogleDriveConnectionStatus> => {
  //     if (USE_MOCK_DATA) {
  //       return googleDriveMockAPI.getGoogleDriveStatus();
  //     }
  //     try {
  //       const response = await axiosServices.get('/documents/google-drive/connect/');
  //       return {
  //         connected: true,
  //         user_info: {
  //           display_name: response.data.google_drive_user_name,
  //           email: response.data.google_drive_user_email,
  //           profile_photo: response.data.google_drive_user_photo
  //         }
  //       };
  //     } catch (error: any) {
  //       if (error.response?.status === 404) {
  //         return { connected: false };
  //       }
  //       throw error;
  //     }
  //   },

  // new
  getGoogleDriveStatus: async (): Promise<GoogleDriveConnectionStatus> => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.getGoogleDriveStatus();
    }
    try {
      const response = await axiosServices.get('/documents/google-drive/connect/');
      // Check both that response exists AND is_connected is true
      return {
        connected: response.data.is_connected === true, // Add this check
        user_info: {
          display_name: response.data.google_drive_user_name,
          email: response.data.google_drive_user_email,
          profile_photo: response.data.google_drive_user_photo
        }
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { connected: false };
      }
      throw error;
    }
  },

  // Folders
  getFolders: async (): Promise<GoogleDriveFolder[]> => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.getFolders();
    }
    const response = await axiosServices.get('/documents/google-drive/folders/');
    return response.data.folders || [];
  },

  createFolder: async (name: string, parent_id?: string): Promise<GoogleDriveFolder> => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.createFolder(name, parent_id);
    }
    const response = await axiosServices.post('/documents/google-drive/folders/create/', {
      name,
      parent_id
    });
    return response.data;
  },

  // Documents
  //   getDocuments: async (filters?: DocumentFilters): Promise<GoogleDriveFile[]> => {
  //     if (USE_MOCK_DATA) {
  //       return googleDriveMockAPI.getDocuments(filters);
  //     }
  //     const params = new URLSearchParams();
  //     if (filters?.search) params.append('search', filters.search);
  //     if (filters?.uploader) params.append('uploader', filters.uploader);
  //     if (filters?.from) params.append('from_date', filters.from);
  //     if (filters?.to) params.append('to_date', filters.to);
  //     if (filters?.folder_id) params.append('folder_id', filters.folder_id);

  //     const response = await axiosServices.get(`/documents/?${params.toString()}`);
  //     return response.data;
  //   },

  // old
  //  getDocuments: async (filters?: DocumentFilters): Promise<GoogleDriveFile[]> => {
  //     if (USE_MOCK_DATA) {
  //       return googleDriveMockAPI.getDocuments(filters);
  //     }

  //     try {
  //       // Get local documents from database
  //       const params = new URLSearchParams();
  //       if (filters?.search) params.append('search', filters.search);
  //       if (filters?.uploader) params.append('uploader', filters.uploader);
  //       if (filters?.from) params.append('from_date', filters.from);
  //       if (filters?.to) params.append('to_date', filters.to);
  //       if (filters?.folder_id) params.append('folder_id', filters.folder_id);

  //       const response = await axiosServices.get(`/documents/?${params.toString()}`);
  //       return response.data;

  //     } catch (error) {
  //       console.error('Error fetching documents:', error);
  //       return [];
  //     }
  //   },

  // new
  getDocuments: async (filters?: DocumentFilters): Promise<GoogleDriveFile[]> => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.getDocuments(filters);
    }

    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.uploader) params.append('uploader', filters.uploader);
      if (filters?.from) params.append('from_date', filters.from);
      if (filters?.to) params.append('to_date', filters.to);
      if (filters?.folder_id) params.append('folder_id', filters.folder_id);

      const response = await axiosServices.get(`/documents/?${params.toString()}`);

      // Transform backend response to match frontend interface
      return response.data.map((doc: any) => ({
        id: doc.id,
        name: doc.filename, // Map filename -> name
        file_type: doc.file_type,
        file_size: Math.round(doc.file_size_mb * 1024 * 1024), // Convert MB back to bytes
        folder: doc.google_drive_folder_path || 'Root', // Map folder path -> folder
        related_to: doc.related_to || '',
        uploaded_by: doc.uploader_name, // Map uploader_name -> uploaded_by
        uploaded_at: doc.uploaded_at,
        last_modified: doc.last_modified,
        download_url: doc.google_drive_download_url,
        share_url: doc.share_url || '',
        is_shared: doc.is_shared,
        web_view_link: doc.google_drive_web_url,
        thumbnail_link: doc.google_drive_thumbnail_url
      }));
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  },

  // old
  //   uploadDocument: async (data: UploadDocumentData): Promise<GoogleDriveFile> => {
  //     if (USE_MOCK_DATA) {
  //       return googleDriveMockAPI.uploadDocument(data);
  //     }
  //     const formData = new FormData();
  //     formData.append('file', data.file);
  //     if (data.folder_id) formData.append('folder_id', data.folder_id);
  //     if (data.related_to) formData.append('related_to', data.related_to);

  //     const response = await axiosServices.post('/documents/google-drive/upload/', formData, {
  //       headers: {
  //         'Content-Type': 'multipart/form-data'
  //       }
  //     });
  //     return response.data;
  //   },

  // new
  uploadDocument: async (data: UploadDocumentData): Promise<GoogleDriveFile> => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.uploadDocument(data);
    }
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('filename', data.file.name); // Explicitly set filename
    if (data.folder_id) formData.append('folder_id', data.folder_id);
    if (data.related_to) formData.append('related_to', data.related_to);

    const response = await axiosServices.post('/documents/google-drive/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // old
  //   downloadDocument: async (id: string): Promise<{ download_url: string }> => {
  //     if (USE_MOCK_DATA) {
  //       return googleDriveMockAPI.downloadDocument(id);
  //     }
  //     const response = await axiosServices.get(`/documents/${id}/download/`);
  //     return response.data;
  //   },

  // new
  //  downloadDocument: async (id: string): Promise<void> => {
  //     if (USE_MOCK_DATA) {
  //       // For mock data, just simulate download
  //       await googleDriveMockAPI.delay(500);
  //       return;
  //     }

  //     try {
  //       const response = await axiosServices.get(`/documents/${id}/download/`, {
  //         responseType: 'blob' // Important: Set response type to blob for file downloads
  //       });

  //       // Get filename from response headers or use default
  //       let filename = 'download';
  //       const contentDisposition = response.headers['content-disposition'];
  //       if (contentDisposition) {
  //         const filenameMatch = contentDisposition.match(/filename="(.+)"/);
  //         if (filenameMatch) {
  //           filename = filenameMatch[1];
  //         }
  //       }

  //       // Create blob and download link
  //       const blob = new Blob([response.data]);
  //       const url = window.URL.createObjectURL(blob);

  //       // Create temporary download link and click it
  //       const link = document.createElement('a');
  //       link.href = url;
  //       link.download = filename;
  //       document.body.appendChild(link);
  //       link.click();

  //       // Clean up
  //       document.body.removeChild(link);
  //       window.URL.revokeObjectURL(url);

  //     } catch (error) {
  //       console.error('Download failed:', error);
  //       throw new Error('Failed to download file');
  //     }
  //   },

  // latest new
  downloadDocument: async (id: string, filename?: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      await googleDriveMockAPI.delay(500);
      return;
    }

    try {
      const response = await axiosServices.get(`/documents/${id}/download/`, {
        responseType: 'blob' // Important: Get file as blob
      });

      // Get filename from Content-Disposition header or use provided filename
      let downloadFilename = filename || 'download';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Create blob and download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);

      // Create and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error('Failed to download file');
    }
  },

  shareDocument: async (data: ShareDocumentData): Promise<{ share_url: string }> => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.shareDocument(data);
    }
    const response = await axiosServices.post(`/documents/${data.document_id}/google-drive/share/`, {
      emails: data.emails,
      permission: data.permission,
      message: data.message
    });
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.deleteDocument(id);
    }
    await axiosServices.delete(`/documents/${id}/`);
  },

  // File validation
  validateFile: (file: File): { valid: boolean; error?: string } => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.validateFile(file);
    }
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint'
    ];

    const maxSize = 25 * 1024 * 1024; // 25MB

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not allowed. Only PDF, DOCX, XLSX, and PPTX files are supported.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 25MB limit.'
      };
    }

    return { valid: true };
  },

  // Utility functions
  formatFileSize: (bytes: number): string => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.formatFileSize(bytes);
    }
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getFileTypeIcon: (fileType: string): string => {
    if (USE_MOCK_DATA) {
      return googleDriveMockAPI.getFileTypeIcon(fileType);
    }
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('word') || type.includes('doc')) return 'docx';
    if (type.includes('excel') || type.includes('sheet')) return 'xlsx';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'pptx';
    return 'file';
  }
};

// Mock API for testing
const googleDriveMockAPI = {
  // Mock data
  mockDocuments: [
    {
      id: '1',
      name: 'Q4 Sales Proposal.pdf',
      file_type: 'pdf',
      file_size: 2516582, // 2.4 MB
      folder: 'Sales',
      related_to: 'David Chen',
      uploaded_by: 'Sarah Johnson',
      uploaded_at: '2024-02-20T10:30:00Z',
      last_modified: '2024-02-20T10:30:00Z',
      is_shared: false,
      download_url: '#',
      share_url: '#',
      web_view_link: 'https://drive.google.com/file/d/1/view',
      thumbnail_link: 'https://drive.google.com/thumbnail?id=1'
    },
    {
      id: '2',
      name: 'Contract Template.docx',
      file_type: 'docx',
      file_size: 1887436, // 1.8 MB
      folder: 'Legal',
      related_to: 'Maria Garcia',
      uploaded_by: 'Mike Wilson',
      uploaded_at: '2024-02-19T14:15:00Z',
      last_modified: '2024-02-21T09:45:00Z',
      is_shared: true,
      download_url: '#',
      share_url: 'https://drive.google.com/file/d/2/view?usp=sharing',
      web_view_link: 'https://drive.google.com/file/d/2/view',
      thumbnail_link: 'https://drive.google.com/thumbnail?id=2'
    },
    {
      id: '3',
      name: 'Product Demo Slides.pptx',
      file_type: 'pptx',
      file_size: 15938355, // 15.2 MB
      folder: 'Presentations',
      related_to: 'Alex Turner',
      uploaded_by: 'Sarah Johnson',
      uploaded_at: '2024-02-18T16:00:00Z',
      last_modified: '2024-02-18T16:00:00Z',
      is_shared: false,
      download_url: '#',
      share_url: '#',
      web_view_link: 'https://drive.google.com/file/d/3/view',
      thumbnail_link: 'https://drive.google.com/thumbnail?id=3'
    },
    {
      id: '4',
      name: 'Customer Feedback Survey.xlsx',
      file_type: 'xlsx',
      file_size: 876544, // 856 KB
      folder: 'Customer Support',
      related_to: 'Lisa Anderson',
      uploaded_by: 'Mike Wilson',
      uploaded_at: '2024-02-17T11:20:00Z',
      last_modified: '2024-02-20T15:30:00Z',
      is_shared: true,
      download_url: '#',
      share_url: 'https://drive.google.com/file/d/4/view?usp=sharing',
      web_view_link: 'https://drive.google.com/file/d/4/view',
      thumbnail_link: 'https://drive.google.com/thumbnail?id=4'
    },
    {
      id: '5',
      name: 'Technical Specifications.pdf',
      file_type: 'pdf',
      file_size: 4299161, // 4.1 MB
      folder: 'Engineering',
      related_to: 'Tom Wilson',
      uploaded_by: 'Sarah Johnson',
      uploaded_at: '2024-02-16T13:45:00Z',
      last_modified: '2024-02-16T13:45:00Z',
      is_shared: false,
      download_url: '#',
      share_url: '#',
      web_view_link: 'https://drive.google.com/file/d/5/view',
      thumbnail_link: 'https://drive.google.com/thumbnail?id=5'
    },
    {
      id: '6',
      name: 'Monthly Report March 2024.xlsx',
      file_type: 'xlsx',
      file_size: 3355443, // 3.2 MB
      folder: 'Finance',
      related_to: 'Management',
      uploaded_by: 'Finance Team',
      uploaded_at: '2024-02-13T14:00:00Z',
      last_modified: '2024-02-13T14:00:00Z',
      is_shared: false,
      download_url: '#',
      share_url: '#',
      web_view_link: 'https://drive.google.com/file/d/6/view',
      thumbnail_link: 'https://drive.google.com/thumbnail?id=6'
    },
    {
      id: '7',
      name: 'HR Policies.pdf',
      file_type: 'pdf',
      file_size: 1258291, // 1.2 MB
      folder: 'Human Resources',
      related_to: 'General',
      uploaded_by: 'HR Team',
      uploaded_at: '2024-02-12T10:00:00Z',
      last_modified: '2024-02-12T10:00:00Z',
      is_shared: true,
      download_url: '#',
      share_url: 'https://drive.google.com/file/d/7/view?usp=sharing',
      web_view_link: 'https://drive.google.com/file/d/7/view',
      thumbnail_link: 'https://drive.google.com/thumbnail?id=7'
    },
    {
      id: '8',
      name: 'Product Roadmap.pptx',
      file_type: 'pptx',
      file_size: 8912896, // 8.5 MB
      folder: 'Product',
      related_to: 'Product Team',
      uploaded_by: 'Product Manager',
      uploaded_at: '2024-02-11T14:30:00Z',
      last_modified: '2024-02-11T14:30:00Z',
      is_shared: false,
      download_url: '#',
      share_url: '#',
      web_view_link: 'https://drive.google.com/file/d/8/view',
      thumbnail_link: 'https://drive.google.com/thumbnail?id=8'
    }
  ] as GoogleDriveFile[],

  mockFolders: [
    {
      id: 'folder-1',
      name: 'Sales',
      path: '/Sales',
      file_count: 1,
      web_view_link: 'https://drive.google.com/drive/folders/folder-1'
    },
    {
      id: 'folder-2',
      name: 'Legal',
      path: '/Legal',
      file_count: 1,
      web_view_link: 'https://drive.google.com/drive/folders/folder-2'
    },
    {
      id: 'folder-3',
      name: 'Presentations',
      path: '/Presentations',
      file_count: 1,
      web_view_link: 'https://drive.google.com/drive/folders/folder-3'
    },
    {
      id: 'folder-4',
      name: 'Customer Support',
      path: '/Customer Support',
      file_count: 1,
      web_view_link: 'https://drive.google.com/drive/folders/folder-4'
    },
    {
      id: 'folder-5',
      name: 'Engineering',
      path: '/Engineering',
      file_count: 1,
      web_view_link: 'https://drive.google.com/drive/folders/folder-5'
    },
    {
      id: 'folder-6',
      name: 'Finance',
      path: '/Finance',
      file_count: 1,
      web_view_link: 'https://drive.google.com/drive/folders/folder-6'
    },
    {
      id: 'folder-7',
      name: 'Human Resources',
      path: '/Human Resources',
      file_count: 1,
      web_view_link: 'https://drive.google.com/drive/folders/folder-7'
    },
    {
      id: 'folder-8',
      name: 'Product',
      path: '/Product',
      file_count: 1,
      web_view_link: 'https://drive.google.com/drive/folders/folder-8'
    }
  ] as GoogleDriveFolder[],

  // Simulate API delay
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Mock API methods
  connectGoogleDrive: async (): Promise<{ auth_url: string }> => {
    await googleDriveMockAPI.delay(1000);
    return {
      auth_url: 'https://accounts.google.com/oauth/authorize?client_id=mock&redirect_uri=mock&scope=mock'
    };
  },

  disconnectGoogleDrive: async (): Promise<void> => {
    await googleDriveMockAPI.delay(500);
  },

  getGoogleDriveStatus: async (): Promise<GoogleDriveConnectionStatus> => {
    await googleDriveMockAPI.delay(300);
    return {
      connected: true,
      user_info: {
        display_name: 'John Doe',
        email: 'john.doe@company.com',
        profile_photo: undefined
      }
    };
  },

  getFolders: async (): Promise<GoogleDriveFolder[]> => {
    await googleDriveMockAPI.delay(500);
    return googleDriveMockAPI.mockFolders;
  },

  createFolder: async (name: string, parent_id?: string): Promise<GoogleDriveFolder> => {
    await googleDriveMockAPI.delay(1000);
    const newFolder: GoogleDriveFolder = {
      id: `folder-${Date.now()}`,
      name,
      path: parent_id ? `/${name}` : `/${name}`,
      file_count: 0,
      web_view_link: `https://drive.google.com/drive/folders/folder-${Date.now()}`
    };
    googleDriveMockAPI.mockFolders.push(newFolder);
    return newFolder;
  },

  getDocuments: async (filters?: DocumentFilters): Promise<GoogleDriveFile[]> => {
    await googleDriveMockAPI.delay(800);

    let filteredDocs = [...googleDriveMockAPI.mockDocuments];

    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredDocs = filteredDocs.filter(
        (doc) => doc.name.toLowerCase().includes(searchTerm) || doc.related_to?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters?.folder_id) {
      const folder = googleDriveMockAPI.mockFolders.find((f) => f.id === filters.folder_id);
      if (folder) {
        filteredDocs = filteredDocs.filter((doc) => doc.folder === folder.name);
      }
    }

    if (filters?.uploader) {
      filteredDocs = filteredDocs.filter((doc) => doc.uploaded_by.toLowerCase().includes(filters.uploader!.toLowerCase()));
    }

    return filteredDocs;
  },

  uploadDocument: async (data: UploadDocumentData): Promise<GoogleDriveFile> => {
    await googleDriveMockAPI.delay(2000);

    const newDocument: GoogleDriveFile = {
      id: `doc-${Date.now()}`,
      name: data.file.name,
      file_type: data.file.name.split('.').pop()?.toLowerCase() || 'unknown',
      file_size: data.file.size,
      folder: data.folder_id ? googleDriveMockAPI.mockFolders.find((f) => f.id === data.folder_id)?.name || 'Root' : 'Root',
      related_to: data.related_to || '',
      uploaded_by: 'Current User',
      uploaded_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      is_shared: false,
      download_url: '#',
      share_url: '#',
      web_view_link: `https://drive.google.com/file/d/doc-${Date.now()}/view`,
      thumbnail_link: `https://drive.google.com/thumbnail?id=doc-${Date.now()}`
    };

    googleDriveMockAPI.mockDocuments.unshift(newDocument);
    return newDocument;
  },

  downloadDocument: async (id: string): Promise<{ download_url: string }> => {
    await googleDriveMockAPI.delay(500);
    const document = googleDriveMockAPI.mockDocuments.find((doc) => doc.id === id);
    if (!document) {
      throw new Error('Document not found');
    }
    return {
      download_url: `https://drive.google.com/uc?export=download&id=${id}`
    };
  },

  shareDocument: async (data: ShareDocumentData): Promise<{ share_url: string }> => {
    await googleDriveMockAPI.delay(1000);
    const document = googleDriveMockAPI.mockDocuments.find((doc) => doc.id === data.document_id);
    if (!document) {
      throw new Error('Document not found');
    }

    const shareUrl = `https://drive.google.com/file/d/${document.id}/view?usp=sharing`;

    // Update document to mark as shared
    document.is_shared = true;
    document.share_url = shareUrl;

    return { share_url: shareUrl };
  },

  deleteDocument: async (id: string): Promise<void> => {
    await googleDriveMockAPI.delay(500);
    const index = googleDriveMockAPI.mockDocuments.findIndex((doc) => doc.id === id);
    if (index === -1) {
      throw new Error('Document not found');
    }
    googleDriveMockAPI.mockDocuments.splice(index, 1);
  },

  validateFile: (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint'
    ];

    const maxSize = 25 * 1024 * 1024; // 25MB

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not allowed. Only PDF, DOCX, XLSX, and PPTX files are supported.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 25MB limit.'
      };
    }

    return { valid: true };
  },

  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getFileTypeIcon: (fileType: string): string => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('word') || type.includes('doc')) return 'docx';
    if (type.includes('excel') || type.includes('sheet')) return 'xlsx';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'pptx';
    return 'file';
  }
};
