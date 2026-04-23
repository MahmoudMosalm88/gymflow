'use client';

import { useEffect, useRef, useState } from 'react';
import { useLang, t } from '@/lib/i18n';
import { saveMemberPhoto } from '@/lib/offline/actions';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

type Props = {
  memberId: string;
  name: string;
  photoPath?: string;
  onPhotoChange: (url: string) => void;
  updatedAt?: number;
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = 'image/jpeg,image/png,image/webp';

function buildPreviewUrl(url: string) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
}

function preloadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Image preview failed to load'));
    image.src = url;
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function MemberAvatar({ memberId, name, photoPath, onPhotoChange, updatedAt }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(photoPath);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setPreview(photoPath);
    setImageFailed(false);
  }, [photoPath]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      alert(lang === 'ar' ? 'حجم الصورة يتجاوز 5 ميجابايت' : 'Image must be under 5MB');
      return;
    }

    setUploading(true);
    setImageFailed(false);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = URL.createObjectURL(file);
    setPreview(objectUrlRef.current);

    try {
      const uploadRes = await saveMemberPhoto({
        memberId,
        file,
        previewUrl: objectUrlRef.current,
        baseUpdatedAt: updatedAt ?? null,
      });
      const savedUrl = buildPreviewUrl(uploadRes.photoPath || '');
      await preloadImage(savedUrl);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      setPreview(savedUrl);
      onPhotoChange(savedUrl);
    } catch (err) {
      console.error('Photo upload failed:', err);
      setImageFailed(true);
      alert(lang === 'ar' ? 'فشل رفع الصورة' : 'Photo upload failed');
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="relative w-24 h-24 overflow-hidden border-2 border-border bg-secondary flex items-center justify-center cursor-pointer hover:border-[#e63946] transition-colors"
      >
        {uploading ? (
          <LoadingSpinner />
        ) : preview && !imageFailed ? (
          <img
            src={preview}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-2xl font-bold text-[#8a8578]">{getInitials(name)}</span>
        )}

        {/* Hover overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 15l4-4 3 3 4-4 3 3" />
              <rect x="2" y="3" width="16" height="14" rx="1" />
            </svg>
          </div>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Label below avatar */}
      <p className="text-xs text-[#8a8578] text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {labels.change_photo}
      </p>
    </div>
  );
}
