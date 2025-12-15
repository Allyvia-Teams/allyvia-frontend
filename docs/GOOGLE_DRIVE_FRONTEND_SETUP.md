# 🚀 Frontend Google Drive Integration Setup

## Prerequisites

- Backend server running on http://localhost:8000
- Google Drive API credentials configured in backend
- Node.js 16+ installed

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure API Base URL

The frontend is already configured to use the correct API endpoints. The `USE_MOCK_DATA` flag has been set to `false` in `src/api/googleDrive.api.ts`.

## Step 3: Start Development Server

```bash
npm start
```

The frontend will start on http://localhost:3000

## Step 4: Test Google Drive Integration

### 4.1 Navigate to Documents Page

1. Go to http://localhost:3000/documents
2. You should see the "Connect to Google Drive" button

### 4.2 Connect to Google Drive

1. Click "Connect to Google Drive"
2. A popup will open with Google OAuth
3. Sign in with your Google account
4. Grant permissions to access Google Drive
5. You should be redirected back to the application

### 4.3 Test File Operations

Once connected, you can:

- ✅ View files from your Google Drive
- ✅ Upload new files
- ✅ Download files
- ✅ Share files
- ✅ Create folders
- ✅ Search files

## Troubleshooting

### Common Frontend Issues:

1. **"Network Error" or "CORS Error"**

   - Ensure backend is running on http://localhost:8000
   - Check that CORS is properly configured in Django settings

2. **"Authentication Failed"**

   - Check that Google Drive credentials are properly set in backend
   - Verify redirect URI matches in Google Cloud Console

3. **"API Endpoint Not Found"**
   - Ensure backend URLs are properly configured
   - Check that documents app is included in main URLs

### Debug Mode:

1. Open browser developer tools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab for API call failures

## File Structure

```
src/
├── api/
│   └── googleDrive.api.ts          # Google Drive API service
├── ui-component/
│   ├── GoogleDriveConnection.tsx   # Connection dialog
│   └── DocumentsManager.tsx        # Main documents interface
├── views/
│   └── documents/
│       └── index.tsx               # Documents page
└── types/
    └── documents.ts                # TypeScript interfaces
```

## API Integration

The frontend communicates with the backend through these endpoints:

- `GET /api/v1/documents/google-drive/auth/` - Get OAuth URL
- `POST /api/v1/documents/google-drive/connect/` - Connect with auth code
- `GET /api/v1/documents/google-drive/connect/` - Check connection status
- `GET /api/v1/documents/google-drive/files/` - List files
- `POST /api/v1/documents/google-drive/upload/` - Upload file
- `GET /api/v1/documents/google-drive/folders/` - List folders
- `POST /api/v1/documents/google-drive/folders/` - Create folder

## Environment Configuration

The frontend uses the following configuration:

```typescript
// In src/api/googleDrive.api.ts
const USE_MOCK_DATA = false; // Set to false for real Google Drive
```

## Production Deployment

For production:

1. **Update API base URL** to your production backend
2. **Configure CORS** for your production domain
3. **Use HTTPS** for all OAuth redirects
4. **Set up proper error handling** for network failures

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify backend is running and accessible
3. Check network requests in developer tools
4. Ensure Google Drive API is properly configured

##########

### Test Document Operations

#### **View Documents**

- You'll see documents with different file types

#### **Search and Filter**

- Use the search bar to filter documents by name
- Use the folder dropdown to view documents in specific folders

#### **Upload Documents**

1. Click the **"Upload"** button
2. Select a PDF, DOCX, XLSX, or PPTX file (under 25MB)
3. Choose a folder (optional)
4. Add "Related To" information (optional)
5. Click **"Upload"**
6. The file will be added

#### ✅ **Share Documents**

1. Click the **share icon** (🔗) next to any document
2. Enter email addresses (comma-separated)
3. Choose permission level (view/edit/comment)
4. Add an optional message
5. Click **"Share"**
6. You'll get a share URL

#### ✅ **Download Documents**

1. Click the **download icon** (⬇️) next to any document
2. File will be download

#### ✅ **Delete Documents**

1. Click the **delete icon** (🗑️) next to any document
2. Confirm the deletion
3. The document will be removed from the data

#### ✅ **Create Folders**

1. Click **"New Folder"** button
2. Enter a folder name
3. Choose a parent folder (optional)
4. Click **"Create Folder"**
5. The folder will be added to the data

### Step 4: Test File Validation

#### ✅ **File Type Validation**

- Try uploading a .txt, .jpg, or .mp4 file
- You should get an error: "File type not allowed"

#### ✅ **File Size Validation**

- Try uploading a file larger than 25MB
- You should get an error: "File size exceeds 25MB limit"
