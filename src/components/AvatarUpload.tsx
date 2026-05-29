import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvatarUploadProps {
  userId: string;
  avatarUrl: string | null;
  fallback: string;
  onUploaded: (url: string) => void;
}

export default function AvatarUpload({ userId, avatarUrl, fallback, onUploaded }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);
      if (updErr) throw updErr;

      onUploaded(publicUrl);
      toast.success('Avatar updated');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="relative h-20 w-20 shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative h-20 w-20 overflow-hidden rounded-2xl bg-gradient-primary shadow-glow-primary transition-transform hover:scale-105"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary-foreground">
            {fallback}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
          ) : (
            <Camera className="h-5 w-5 text-foreground" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
