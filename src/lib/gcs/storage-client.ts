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

export async function uploadToGCS(file: File, path: string): Promise<GCSUploadResult> {
  const signedUrlRes = await fetch('/api/storage/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, contentType: file.type }),
  })

  if (!signedUrlRes.ok) throw new Error('Failed to get upload URL')

  const { signedUrl, publicUrl } = await signedUrlRes.json()

  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!uploadRes.ok) throw new Error('Failed to upload file to storage')

  return {
    gcs_path: path,
    gcs_url: publicUrl,
    file_name: file.name,
    size: file.size,
    content_type: file.type,
  }
}
