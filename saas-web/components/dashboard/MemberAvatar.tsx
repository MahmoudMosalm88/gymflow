'use client';

import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseClientStorage, type FirebaseClientConfig } from '@/lib/firebase-client';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

type Props = {
  memberId: string;
  name: string;
  photoPath?: string;
  onPhotoChange: (url: string) => void;
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = 'image/jpeg,image/png,image/webp';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function MemberAvatar({ memberId, name, photoPath, onPhotoChange }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(photoPath);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      alert(lang === 'ar' ? 'حجم الصورة يتجاوز 5 ميجابايت' : 'Image must be under 5MB');
      return;
    }

    setUploading(true);

    try {
      // Get Firebase config from server
      const configRes = await fetch('/api/auth/firebase-config');
      const configJson = await configRes.json();
      const config = (configJson.data ?? configJson) as FirebaseClientConfig;

      const storage = getFirebaseClientStorage(config);

      // Upload to Firebase Storage
      const ext = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `members/${memberId}/photo.${ext}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Save URL to member record
      await api.patch(`/api/members/${memberId}`, { photo_path: downloadUrl });

      setPreview(downloadUrl);
      onPhotoChange(downloadUrl);
    } catch (err) {
      console.error('Photo upload failed:', err);
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
        className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#2a2a2a] bg-[#262626] flex items-center justify-center cursor-pointer hover:border-[#e63946] transition-colors"
      >
        {uploading ? (
          <LoadingSpinner />
        ) : preview ? (
          <img src={preview} alt={name} className="w-full h-full object-cover" />
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
