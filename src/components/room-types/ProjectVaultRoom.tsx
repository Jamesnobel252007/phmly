import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Download, FileText, Image, Video, Link as LinkIcon, CheckSquare, Square, X, ExternalLink, Archive, Trash2, UploadCloud } from 'lucide-react';
import { Room, ResourceItem, User } from '../../types';
import { StorageService } from '../../services/storage';
import { Avatar } from '../common/Avatar';
import {
  getVaultFiles,
  uploadVaultFile,
  deleteVaultFile,
  downloadMultipleAsZip,
  downloadSingleFile,
  subscribeToVaultFiles,
} from '../../services/vault';
import { isSupabaseConfigured } from '../../lib/supabase';

interface ProjectVaultRoomProps {
  room: Room;
  currentUser: User;
}

type FilterCategory = 'all' | 'document' | 'image' | 'video' | 'link';

export const ProjectVaultRoom: React.FC<ProjectVaultRoomProps> = ({
  room,
  currentUser,
}) => {
  const [resources, setResources] = useState<ResourceItem[]>(() =>
    StorageService.getResources(room.id)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form states for Add Resource
  const [addMode, setAddMode] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ResourceItem['resourceType']>('document');
  const [newUri, setNewUri] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResources = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const sbFiles = await getVaultFiles(room.id);
        setResources(sbFiles);
        return;
      } catch (err) {
        console.warn('Failed to load Supabase vault files, falling back:', err);
      }
    }
    const list = StorageService.getResources(room.id);
    setResources(list);
  }, [room.id]);

  useEffect(() => {
    loadResources();

    if (isSupabaseConfigured) {
      const sub = subscribeToVaultFiles(room.id, () => {
        loadResources();
      });
      return () => {
        sub.unsubscribe();
      };
    }
  }, [room.id, loadResources]);

  const filteredResources = resources.filter((res) => {
    const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || res.resourceType === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredResources.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredResources.map((r) => r.id));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // ZIP Bulk Download functionality
  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    setIsZipping(true);

    try {
      const selectedItems = resources.filter((r) => selectedIds.includes(r.id));
      await downloadMultipleAsZip(selectedItems, room.name);
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert('Could not package ZIP archive. Try downloading individual files.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addMode === 'file' && !selectedFile) return;
    if (addMode === 'link' && (!newName.trim() || !newUri.trim())) return;

    const resName = newName.trim() || selectedFile?.name || 'Uploaded File';
    setIsUploading(true);

    try {
      if (isSupabaseConfigured) {
        await uploadVaultFile({
          roomId: room.id,
          uploaderId: currentUser.id,
          name: resName,
          resourceType: addMode === 'link' ? 'link' : newType,
          fileOrUrl: addMode === 'file' && selectedFile ? selectedFile : newUri.trim(),
        });
      }
    } catch (err) {
      console.warn('Supabase vault upload failed:', err);
    } finally {
      setIsUploading(false);
    }

    StorageService.addResource({
      roomId: room.id,
      name: resName,
      resourceType: addMode === 'link' ? 'link' : newType,
      localUri: newUri.trim() || (selectedFile ? URL.createObjectURL(selectedFile) : ''),
      uploaderId: currentUser.id,
      fileSize: addMode === 'link' ? 'Link' : `${((selectedFile?.size || 1500000) / (1024 * 1024)).toFixed(1)} MB`,
    });

    setNewName('');
    setNewUri('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowAddModal(false);
    await loadResources();
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSelectedFile(null);
    setNewName('');
    setNewUri('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm('Delete this file from the vault?')) return;
    try {
      if (isSupabaseConfigured) {
        await deleteVaultFile(resourceId);
      }
    } catch (err) {
      console.warn('Supabase deleteVaultFile failed:', err);
    }
    StorageService.deleteResource(resourceId);
    setSelectedIds(prev => prev.filter(id => id !== resourceId));
    await loadResources();
  };

  const getResourceIcon = (type: ResourceItem['resourceType']) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'image':
        return <Image className="w-4 h-4 text-emerald-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-500" />;
      case 'link':
        return <LinkIcon className="w-4 h-4 text-goldenRush" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar bg-phmly-bg transition-colors">
      {/* Search & Actions Bar (Action labels: 13-14px) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-phmly-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files and resources..."
            className="w-full bg-phmly-surface text-phmly-text text-secondary pl-9 pr-3.5 py-2 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush placeholder:text-phmly-muted/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-phmly-muted hover:text-phmly-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-goldenRush text-forestBlack font-medium text-secondary hover:bg-amberGlow transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Resource</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
        {(['all', 'document', 'image', 'video', 'link'] as FilterCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1 rounded-lg text-metadata font-medium capitalize transition-colors shrink-0 ${
              activeFilter === cat
                ? 'bg-goldenRush text-forestBlack font-medium'
                : 'bg-phmly-surface text-phmly-muted hover:text-phmly-text border border-phmly-border'
            }`}
          >
            {cat === 'all' ? 'All Files' : `${cat}s`}
          </button>
        ))}
      </div>

      {/* Multi-Selection Contextual Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-goldenRush/15 border border-goldenRush/40 rounded-xl p-2.5 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 text-secondary text-goldenRush font-medium">
            <Archive className="w-4 h-4" />
            <span>{selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected</span>
            <button
              onClick={clearSelection}
              className="text-metadata text-phmly-muted hover:text-phmly-text underline ml-2"
            >
              Clear
            </button>
          </div>

          <button
            onClick={handleBulkDownload}
            disabled={isZipping}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-goldenRush text-forestBlack font-medium text-secondary hover:bg-amberGlow shadow-xs transition-transform active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isZipping ? 'Zipping...' : `Download (${selectedIds.length})`}</span>
          </button>
        </div>
      )}

      {/* Resources Table / List (Section titles: 16px semibold) */}
      <div className="bg-phmly-surface border border-phmly-border rounded-2xl overflow-hidden shadow-xs">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 p-2.5 bg-phmly-subtle/50 text-metadata font-medium text-phmly-muted border-b border-phmly-border items-center">
          <div className="col-span-1 flex items-center justify-center">
            <button
              onClick={toggleSelectAll}
              className="text-phmly-muted hover:text-goldenRush"
              title="Select / Deselect all"
            >
              {selectedIds.length > 0 && selectedIds.length === filteredResources.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-goldenRush" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="col-span-6 sm:col-span-5">Name</div>
          <div className="col-span-2 hidden sm:block">Uploaded By</div>
          <div className="col-span-3 sm:col-span-2">Type / Size</div>
          <div className="col-span-2 text-right pr-2">Action</div>
        </div>

        {/* Rows */}
        {filteredResources.length === 0 ? (
          <div className="p-6 text-center text-phmly-muted">
            <p className="text-xs font-semibold text-phmly-text mb-0.5">No resources found</p>
            <p className="text-[11px]">
              {searchQuery ? `No matching items for "${searchQuery}"` : 'Upload documents, designs, or links!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-phmly-border">
            {filteredResources.map((res) => {
              const isSelected = selectedIds.includes(res.id);
              const uploader = StorageService.getUserById(res.uploaderId);
              const dateStr = new Date(res.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={res.id}
                  className={`grid grid-cols-12 gap-2 p-2.5 items-center text-xs transition-colors hover:bg-phmly-subtle/40 ${
                    isSelected ? 'bg-goldenRush/10' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      onClick={() => toggleSelectOne(res.id)}
                      className="text-phmly-muted hover:text-goldenRush p-0.5"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-goldenRush" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Name and Icon (File names: 14px medium, metadata: 12px) */}
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-phmly-subtle shrink-0 border border-phmly-border">
                      {getResourceIcon(res.resourceType)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-secondary text-phmly-text truncate" title={res.name}>
                        {res.name}
                      </p>
                      <p className="text-caption text-phmly-muted sm:hidden">
                        {uploader?.name.split(' ')[0]} · {dateStr}
                      </p>
                    </div>
                  </div>

                  {/* Uploader (desktop: 12px) */}
                  <div className="col-span-2 hidden sm:flex items-center gap-2">
                    <Avatar src={uploader?.avatar} name={uploader?.name || 'Member'} size="xs" />
                    <span className="text-phmly-muted truncate text-metadata">{uploader?.name}</span>
                  </div>

                  {/* Size & Type (12px) */}
                  <div className="col-span-3 sm:col-span-2 text-phmly-muted text-metadata">
                    <span className="capitalize">{res.resourceType}</span>
                    <span className="block text-caption text-phmly-muted/70">{res.fileSize || '1.2 MB'}</span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5 pr-1">
                    <a
                      href={res.localUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={res.resourceType !== 'link'}
                      className="p-1.5 rounded-lg bg-phmly-subtle hover:bg-goldenRush/15 text-phmly-muted hover:text-goldenRush transition-colors border border-phmly-border"
                      title={res.resourceType === 'link' ? 'Open link' : 'Download file'}
                    >
                      {res.resourceType === 'link' ? (
                        <ExternalLink className="w-3.5 h-3.5" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forestBlack/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-phmly-surface border border-phmly-border rounded-3xl w-full max-w-md p-4 sm:p-5 shadow-2xl transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-phmly-border">
              <h3 className="text-base font-bold text-phmly-text">Add Vault Resource</h3>
              <button
                onClick={handleCloseAddModal}
                className="text-phmly-muted hover:text-phmly-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switcher: Upload File vs Add Link */}
            <div className="flex items-center bg-phmly-subtle p-1 rounded-xl border border-phmly-border mt-3">
              <button
                type="button"
                onClick={() => setAddMode('file')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  addMode === 'file'
                    ? 'bg-phmly-surface text-phmly-text shadow-xs'
                    : 'text-phmly-muted hover:text-phmly-text'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setAddMode('link')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  addMode === 'link'
                    ? 'bg-goldenRush text-forestBlack font-bold shadow-xs'
                    : 'text-phmly-muted hover:text-phmly-text'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Add Web Link</span>
              </button>
            </div>

            <form onSubmit={handleAddResource} className="mt-3.5 space-y-3.5">
              {addMode === 'file' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-phmly-muted mb-1">
                      Choose File (PDF, Images, Zip, Docs)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      required={!selectedFile}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          if (!newName) setNewName(file.name);
                          if (file.type.startsWith('image/')) setNewType('image');
                          else if (file.type.startsWith('video/')) setNewType('video');
                          else setNewType('document');
                        }
                      }}
                      className="w-full bg-phmly-subtle text-phmly-text text-xs p-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-goldenRush file:text-forestBlack"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-phmly-muted mb-1">
                      Display Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={selectedFile?.name || 'e.g. Project Pitch Deck'}
                      className="w-full bg-phmly-subtle text-phmly-text text-xs sm:text-sm p-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-phmly-muted mb-1">
                      Resource Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Figma File, Notion Doc, GitHub Repo"
                      className="w-full bg-phmly-subtle text-phmly-text text-xs sm:text-sm p-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-phmly-muted mb-1">
                      URL or Link
                    </label>
                    <input
                      type="url"
                      required
                      value={newUri}
                      onChange={(e) => setNewUri(e.target.value)}
                      placeholder="https://example.com/file"
                      className="w-full bg-phmly-subtle text-phmly-text text-xs sm:text-sm p-2.5 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-phmly-border">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-3.5 py-2 rounded-xl text-xs text-phmly-muted hover:text-phmly-text font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (addMode === 'file' && !selectedFile)}
                  className="px-4 py-2 rounded-xl bg-goldenRush text-forestBlack font-semibold text-xs hover:bg-amberGlow disabled:opacity-40"
                >
                  {isUploading ? 'Uploading...' : 'Add to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
