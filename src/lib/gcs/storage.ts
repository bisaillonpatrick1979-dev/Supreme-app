// Google Cloud Storage integration
// Photos are stored in GCS, not Supabase Storage

export interface GCSUploadResult {
  gcs_path: string
  gcs_url: string
  file_name: string
  size: number
  content_type: string
}

export function getGCSPath(type: 'project' | 'avatar' | 'document', id: string, filename: string): string {
  const timestamp = Date.now()
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${type}s/${id}/${timestamp}_${safeName}`
}

export function getPublicUrl(gcsPath: string): string {
  const bucket = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'hailite-manager-photos'
  return `https://storage.googleapis.com/${bucket}/${gcsPath}`
}

// Client-side: get signed upload URL from API, then upload directly to GCS
export async function uploadToGCS(
  file: File,
  path: string
): Promise<GCSUploadResult> {
  // 1. Get signed URL from our API
  const signedUrlRes = await fetch('/api/storage/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, contentType: file.type }),
  })

  if (!signedUrlRes.ok) {
    throw new Error('Failed to get upload URL')
  }

  const { signedUrl, publicUrl } = await signedUrlRes.json()

  // 2. Upload directly to GCS using signed URL
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error('Failed to upload file to storage')
  }

  return {
    gcs_path: path,
    gcs_url: publicUrl,
    file_name: file.name,
    size: file.size,
    content_type: file.type,
  }
}

// Server-side GCS operations (API routes only)
export async function getServerGCSClient() {
  const { Storage } = await import('@google-cloud/storage')

  return new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: {
      client_email: process.env.GCS_CLIENT_EMAIL,
      private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  })
}

export async function generateSignedUploadUrl(
  gcsPath: string,
  contentType: string,
  expiresInMinutes = 15
): Promise<string> {
  const storage = await getServerGCSClient()
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)
  const file = bucket.file(gcsPath)

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
    contentType,
  })

  return signedUrl
}

export async function deleteFromGCS(gcsPath: string): Promise<void> {
  const storage = await getServerGCSClient()
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)
  await bucket.file(gcsPath).delete({ ignoreNotFound: true })
}
