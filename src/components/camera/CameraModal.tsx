import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Image as ImageIcon, Check, Video, RefreshCw } from 'lucide-react';
import { Room, User } from '../../types';
import { StorageService } from '../../services/storage';
import { shareMediaToRooms as shareSupabaseMedia } from '../../services/media';
import { isSupabaseConfigured } from '../../lib/supabase';

interface CameraModalProps {
  initialRoomId?: string;
  currentUser: User | null;
  onClose: () => void;
  onMediaShared: (roomIds: string[]) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  initialRoomId,
  currentUser,
  onClose,
  onMediaShared,
}) => {
  const [capturedMedia, setCapturedMedia] = useState<{
    uri: string;
    type: 'image' | 'video';
  } | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    initialRoomId ? [initialRoomId] : []
  );
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const availableRooms = currentUser
    ? StorageService.getRooms().filter((r) => r.memberIds.includes(currentUser.id))
    : [];

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Webcam API is not supported in this environment. You can select photos from your device.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Could not access live camera. You can select an image or video from your device.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedMedia({ uri: dataUrl, type: 'image' });
      stopCamera();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video');
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedMedia({
          uri: reader.result as string,
          type: isVideo ? 'video' : 'image',
        });
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedMedia(null);
    startCamera();
  };

  const toggleRoomSelection = (roomId: string) => {
    if (selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds(selectedRoomIds.filter((id) => id !== roomId));
    } else {
      setSelectedRoomIds([...selectedRoomIds, roomId]);
    }
  };

  const handleConfirmShare = async () => {
    if (!capturedMedia || selectedRoomIds.length === 0 || !currentUser) return;

    try {
      if (isSupabaseConfigured) {
        await shareSupabaseMedia(
          selectedRoomIds,
          currentUser.id,
          capturedMedia.uri,
          capturedMedia.type,
          caption.trim() || undefined
        );
      }
    } catch (err) {
      console.warn('Supabase share media failed:', err);
    }

    StorageService.shareMediaToRooms(
      selectedRoomIds,
      currentUser.id,
      capturedMedia.uri,
      capturedMedia.type,
      caption.trim() || undefined
    );

    onMediaShared(selectedRoomIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forestBlack/80 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-phmly-surface border border-phmly-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-phmly-border bg-phmly-subtle/50">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-goldenRush" />
            <h2 className="text-base font-bold text-phmly-text">
              {initialRoomId ? 'Share to Room' : 'Central Camera & Share'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-phmly-muted hover:text-phmly-text hover:bg-phmly-subtle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto custom-scrollbar space-y-3.5">
          {/* Capture Canvas / Preview */}
          <div className="relative aspect-video bg-forestBlack rounded-2xl overflow-hidden border border-phmly-border flex items-center justify-center">
            {capturedMedia ? (
              capturedMedia.type === 'video' ? (
                <video
                  src={capturedMedia.uri}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={capturedMedia.uri}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
              )
            ) : isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-6 text-center text-mutedMoss flex flex-col items-center">
                <Camera className="w-8 h-8 text-mutedMoss/40 mb-2" />
                <p className="text-xs max-w-xs">{cameraError || 'Camera inactive'}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-goldenRush text-forestBlack font-semibold text-xs hover:bg-amberGlow transition-transform active:scale-95"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Select from Gallery
                </button>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Retake badge */}
            {capturedMedia && (
              <button
                onClick={handleRetake}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-forestBlack/80 backdrop-blur-xs border border-white/10 text-xs font-semibold text-forestCream hover:text-goldenRush flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retake
              </button>
            )}
          </div>

          {/* Camera controls if live */}
          {!capturedMedia && isCameraActive && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-full bg-phmly-subtle text-phmly-muted hover:text-phmly-text border border-phmly-border"
                title="Select from gallery"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <button
                onClick={handleCaptureSnapshot}
                className="w-12 h-12 rounded-full bg-goldenRush border-3 border-phmly-surface text-forestBlack flex items-center justify-center shadow-md shadow-goldenRush/20 hover:scale-105 transition-transform"
                title="Take snapshot"
              >
                <div className="w-5 h-5 rounded-full border-2 border-forestBlack" />
              </button>

              <button
                onClick={startCamera}
                className="p-2.5 rounded-full bg-phmly-subtle text-phmly-muted hover:text-phmly-text border border-phmly-border"
                title="Restart camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Caption Input */}
          <div>
            <label className="block text-xs font-semibold text-phmly-muted mb-1">
              Caption (Optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What are you working on or sharing?"
              className="w-full bg-phmly-subtle text-phmly-text text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-phmly-border focus:outline-none focus:border-goldenRush"
            />
          </div>

          {/* Multi-Room Selector */}
          <div>
            <label className="block text-xs font-semibold text-phmly-muted mb-1.5">
              Select Rooms to Share ({selectedRoomIds.length} selected)
            </label>

            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
              {availableRooms.map((r) => {
                const isSelected = selectedRoomIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRoomSelection(r.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-goldenRush/10 border-goldenRush text-phmly-text'
                        : 'bg-phmly-subtle/50 border-phmly-border text-phmly-muted hover:text-phmly-text'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <img
                        src={r.photo}
                        alt={r.name}
                        className="w-7 h-7 rounded-lg object-cover shrink-0 border border-phmly-border"
                      />
                      <span className="font-semibold truncate">{r.name}</span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? 'bg-goldenRush border-goldenRush text-forestBlack'
                          : 'border-phmly-border'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-phmly-border bg-phmly-subtle/50 flex items-center justify-between">
          <span className="text-xs text-phmly-muted">
            {selectedRoomIds.length === 0
              ? 'Select at least 1 room'
              : `${selectedRoomIds.length} room${selectedRoomIds.length > 1 ? 's' : ''} selected`}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs text-phmly-muted hover:text-phmly-text font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmShare}
              disabled={!capturedMedia || selectedRoomIds.length === 0}
              className="px-4 py-2 rounded-xl bg-goldenRush text-forestBlack font-semibold text-xs hover:bg-amberGlow disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-transform active:scale-95"
            >
              Share ({selectedRoomIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
