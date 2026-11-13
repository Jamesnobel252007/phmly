import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ResourceItem } from '../types/phmly';
import JSZip from 'jszip';
import { uploadPrivateFile, getSignedFileUrl, downloadPrivateFile, deletePrivateFile } from './storageBucket';

/**
 * Fetch files for a project vault room, resolving private file paths to signed URLs.
 */
export async function getVaultFiles(roomId: string): Promise<ResourceItem[]> {
  if (!isSupabaseConfigured || !roomId) return [];

  const { data: rows, error } = await supabase
    .from('vault_files')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (error || !rows) {
    console.error('Failed to fetch vault files:', error);
    return [];
  }

  const resolvedItems: ResourceItem[] = await Promise.all(
    rows.map(async (r: any) => {
      let resolvedUri = r.file_url;
      if (r.file_type !== 'link' && resolvedUri) {
        resolvedUri = await getSignedFileUrl('vault-files', resolvedUri);
      }

      return {
        id: r.id,
        roomId: r.room_id,
        name: r.file_name,
        localUri: resolvedUri,
        resourceType: r.file_type as any,
        fileSize: r.file_size || '1.0 MB',
        uploaderId: r.uploaded_by,
        createdAt: r.created_at,
      };
    })
  );

  return resolvedItems;
}

/**
 * Upload a file or save a link into the Project Vault.
 * For physical files, uploads to private Storage bucket 'vault-files'
 * using path: room_id/user_id/file-name
 * Stores the Storage object path in vault_files.file_url.
 */
export async function uploadVaultFile(data: {
  roomId: string;
  uploaderId: string;
  name: string;
  resourceType: 'document' | 'image' | 'video' | 'link';
  fileOrUrl: File | string;
  fileSize?: string;
}): Promise<ResourceItem | null> {
  if (!isSupabaseConfigured) return null;

  let storedPathOrUrl = typeof data.fileOrUrl === 'string' ? data.fileOrUrl : '';
  let calculatedSize = data.fileSize;

  // If a real file was provided, upload to private 'vault-files' bucket
  if (data.fileOrUrl instanceof File) {
    const file = data.fileOrUrl;
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${data.roomId}/${data.uploaderId}/${Date.now()}-${cleanFileName}`;

    await uploadPrivateFile('vault-files', storagePath, file);
    storedPathOrUrl = storagePath;

    if (!calculatedSize) {
      const bytes = file.size;
      calculatedSize =
        bytes < 1024 * 1024
          ? `${(bytes / 1024).toFixed(1)} KB`
          : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  // Insert metadata into vault_files table
  const { data: row, error: insertErr } = await supabase
    .from('vault_files')
    .insert({
      room_id: data.roomId,
      uploaded_by: data.uploaderId,
      file_name: data.name,
      file_url: storedPathOrUrl,
      file_type: data.resourceType,
      file_size: calculatedSize || '1.0 MB',
    })
    .select()
    .single();

  if (insertErr || !row) throw insertErr;

  let previewUrl = row.file_url;
  if (row.file_type !== 'link') {
    previewUrl = await getSignedFileUrl('vault-files', row.file_url);
  }

  return {
    id: row.id,
    roomId: row.room_id,
    name: row.file_name,
    localUri: previewUrl,
    resourceType: row.file_type as any,
    fileSize: row.file_size || '1.0 MB',
    uploaderId: row.uploaded_by,
    createdAt: row.created_at,
  };
}

/**
 * Delete a file from Project Vault and remove its private storage object.
 */
export async function deleteVaultFile(
  fileId: string,
  storagePath?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !fileId) return false;

  const { error } = await supabase.from('vault_files').delete().eq('id', fileId);
  if (error) {
    console.error('Failed to delete vault file record:', error);
    return false;
  }

  if (storagePath && !storagePath.startsWith('http')) {
    await deletePrivateFile('vault-files', storagePath);
  }

  return true;
}

/**
 * Trigger download of a single vault file.
 */
export async function downloadSingleFile(item: ResourceItem): Promise<void> {
  if (item.resourceType === 'link') {
    window.open(item.localUri, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    const res = await fetch(item.localUri);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn('Direct fetch download failed, opening in new tab:', err);
    window.open(item.localUri, '_blank');
  }
}

/**
 * Download multiple selected files bundled as a ZIP file using JSZip.
 */
export async function downloadMultipleAsZip(
  items: ResourceItem[],
  zipTitle: string = 'PHMLY_Vault'
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(zipTitle) || zip;

  for (const item of items) {
    if (item.resourceType === 'link') {
      folder.file(`${item.name}.url`, `[InternetShortcut]\nURL=${item.localUri}\n`);
    } else {
      try {
        const res = await fetch(item.localUri);
        if (res.ok) {
          const blob = await res.blob();
          folder.file(item.name, blob);
        } else {
          folder.file(
            `${item.name}.txt`,
            `File Name: ${item.name}\nType: ${item.resourceType}\nSource: ${item.localUri}\n`
          );
        }
      } catch (err) {
        folder.file(
          `${item.name}_info.txt`,
          `Resource: ${item.name}\nType: ${item.resourceType}\nURL: ${item.localUri}\n`
        );
      }
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `${zipTitle.toLowerCase().replace(/\s+/g, '-')}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Realtime subscription to vault files table.
 */
export function subscribeToVaultFiles(
  roomId: string,
  onChange: () => void
) {
  if (!isSupabaseConfigured || !roomId) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`vault_files:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'vault_files',
        filter: `room_id=eq.${roomId}`,
      },
      () => onChange()
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
