'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react'
import { toast } from 'sonner'
import { uploadToGCS, getGCSPath } from '@/lib/gcs/storage-client'
import { createClient } from '@/lib/supabase/client'
import type { ProjectPhoto } from '@/types/database'

interface PhotoUploadProps {
  projectId: string
  onUploadComplete?: (photo: ProjectPhoto) => void
  existingPhotos?: ProjectPhoto[]
}

interface UploadingFile {
  id: string
  file: File
  progress: 'uploading' | 'done' | 'error'
  preview: string
}

export function PhotoUpload({ projectId, onUploadComplete, existingPhotos = [] }: PhotoUploadProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [photos, setPhotos] = useState<ProjectPhoto[]>(existingPhotos)
  const supabase = createClient()

  const uploadFile = useCallback(async (file: File) => {
    const id = Math.random().toString(36).slice(2)
    const preview = URL.createObjectURL(file)

    setUploading(u => [...u, { id, file, progress: 'uploading', preview }])

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autorisé')

      const gcsPath = getGCSPath('project', projectId, file.name)
      const result = await uploadToGCS(file, gcsPath)

      // Save to database
      const { data: photo } = await supabase.from('project_photos').insert([{
        project_id: projectId,
        gcs_path: result.gcs_path,
        gcs_url: result.gcs_url,
        photo_type: 'progress',
        taken_by: user.id,
      }]).select().single()

      setUploading(u => u.map(uf => uf.id === id ? { ...uf, progress: 'done' } : uf))

      if (photo) {
        setPhotos(p => [...p, photo as ProjectPhoto])
        onUploadComplete?.(photo as ProjectPhoto)
      }

      setTimeout(() => {
        setUploading(u => u.filter(uf => uf.id !== id))
        URL.revokeObjectURL(preview)
      }, 2000)
    } catch (e) {
      setUploading(u => u.map(uf => uf.id === id ? { ...uf, progress: 'error' } : uf))
      toast.error('Erreur upload: ' + (e instanceof Error ? e.message : 'Inconnu'))
    }
  }, [projectId, supabase, onUploadComplete])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(uploadFile)
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 20 * 1024 * 1024, // 20MB
  })

  const deletePhoto = async (photoId: string, gcsPath: string) => {
    // Delete from GCS via API
    await fetch('/api/storage/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: gcsPath }) })
    await supabase.from('project_photos').delete().eq('id', photoId)
    setPhotos(p => p.filter(ph => ph.id !== photoId))
    toast.success('Photo supprimée')
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200"
        style={{
          borderColor: isDragActive ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border))',
          background: isDragActive ? 'rgb(var(--color-primary-muted))' : 'rgb(var(--color-bg-secondary))',
        }}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: isDragActive ? 'rgb(var(--color-primary))' : 'rgb(var(--color-text-muted))' }} />
        <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
          {isDragActive ? 'Déposez les photos ici' : 'Glissez-déposez ou cliquez pour uploader'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
          JPG, PNG, WebP, HEIC • Max 20 MB par photo
        </p>
      </div>

      {/* Uploading files */}
      {uploading.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {uploading.map(uf => (
            <div key={uf.id} className="relative aspect-square rounded-lg overflow-hidden"
              style={{ border: '1px solid rgb(var(--color-border))' }}>
              <img src={uf.preview} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                {uf.progress === 'uploading' && <Loader className="w-5 h-5 text-white animate-spin" />}
                {uf.progress === 'done' && <span className="text-white text-lg">✓</span>}
                {uf.progress === 'error' && <span className="text-red-400 text-lg">✕</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Existing photos */}
      {photos.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Photos du chantier ({photos.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {photos.map(photo => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group"
                style={{ border: '1px solid rgb(var(--color-border))' }}>
                <img
                  src={photo.gcs_url}
                  alt={photo.caption ?? 'Photo chantier'}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <button
                    onClick={() => deletePhoto(photo.id, photo.gcs_path)}
                    className="p-1.5 rounded-full text-white hover:bg-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {photo.caption && (
                  <div className="absolute bottom-0 inset-x-0 p-1.5" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <p className="text-xs text-white truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && uploading.length === 0 && (
        <div className="hm-empty py-8">
          <ImageIcon className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Aucune photo. Uploadez des photos de chantier.</p>
        </div>
      )}
    </div>
  )
}
