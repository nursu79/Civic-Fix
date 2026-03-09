'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Globe, Bell, LogOut, Loader2, MapPin, AlignLeft, Calendar, Camera, Check, Lock } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { useAuth } from '@/providers';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const common = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const isAmharic = locale === 'am';
  
  const { user, profile, isLoading, signOut, updateProfile, updatePassword } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [residence, setResidence] = useState(profile?.residence || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !profile)) {
      router.push(`/${locale}/login`);
    } else if (profile && !hasInitialized) {
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
      setResidence(profile.residence || '');
      setBio(profile.bio || '');
      setHasInitialized(true);
    }
  }, [user, profile, isLoading, locale, router, hasInitialized]);

  // Sync back if profile changes externally (like after a partial update that we want to "commit")
  useEffect(() => {
    if (profile && !isEditing) {
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
      setResidence(profile.residence || '');
      setBio(profile.bio || '');
    }
  }, [profile, isEditing]);

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        phone: phone || null,
        residence: residence || null,
        bio: bio || null,
      }, true);
      setIsEditing(false);
      // Data is already updated in context, local state is preserved.
    } catch (error: any) {
      console.error('Failed to update profile details:', error);
      alert(`${t('updateFailed')}: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const supabase = createClient();
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl }, true);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(`${t('uploadFailed')}: ${error.message || 'Unknown error'}`);
    } finally {
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push(`/${locale}`);
  };

  return (
    <div className="min-h-screen bg-surface-primary py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className={cn(
            "text-3xl font-bold text-text-primary mb-2",
            isAmharic && 'font-ethiopic'
          )}>
            {t('title')}
          </h1>
          <p className={cn("text-text-secondary", isAmharic && 'font-ethiopic')}>
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Profile Card */}
        <Card className="p-8 space-y-6 relative overflow-hidden bg-white border border-zinc-100 shadow-2xl shadow-zinc-200/50">
          {/* Avatar Area */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full ring-4 ring-white shadow-xl overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-4xl font-black">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.display_name || ''} className="w-full h-full object-cover" />
                ) : (
                  profile.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg border border-zinc-100 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform active:scale-95">
                <Camera className="w-5 h-5 text-deep-navy" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
              </label>
            </div>
            
            <div className="text-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Account Member since</p>
              <div className="flex items-center justify-center gap-2 text-deep-navy font-bold">
                <Calendar className="w-4 h-4 text-teal-500" />
                {new Date(profile.created_at).toLocaleDateString(locale === 'am' ? 'am-ET' : 'en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email (read-only) */}
            <div className="md:col-span-2">
              <label className={cn("block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1", isAmharic && 'font-ethiopic')}>
                {common('email')}
              </label>
              <div className="flex items-center gap-3 px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                <Mail className="w-5 h-5 text-slate-400" />
                <span className="text-deep-navy font-bold">{user.email}</span>
                <Check className="w-4 h-4 text-emerald-500 ml-auto" />
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className={cn("block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1", isAmharic && 'font-ethiopic')}>
                {t('displayName')}
              </label>
              {isEditing ? (
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  leftIcon={<User className="w-5 h-5" />}
                  className="rounded-2xl"
                />
              ) : (
                <div className="flex items-center gap-3 px-5 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                  <User className="w-5 h-5 text-slate-400" />
                  <span className="text-deep-navy font-bold">{profile.display_name || common('notSet')}</span>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className={cn("block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1", isAmharic && 'font-ethiopic')}>
                {t('phone')}
              </label>
              {isEditing ? (
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Phone className="w-5 h-5" />}
                  placeholder="+251..."
                  className="rounded-2xl"
                />
              ) : (
                <div className="flex items-center gap-3 px-5 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <span className="text-deep-navy font-bold">{profile.phone || common('notSet')}</span>
                </div>
              )}
            </div>

            {/* Residence / City */}
            <div>
              <label className={cn("block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1", isAmharic && 'font-ethiopic')}>
                {t('residence')}
              </label>
              {isEditing ? (
                <Input
                  value={residence}
                  onChange={(e) => setResidence(e.target.value)}
                  leftIcon={<MapPin className="w-5 h-5" />}
                  placeholder="e.g. Addis Ababa"
                  className="rounded-2xl"
                />
              ) : (
                <div className="flex items-center gap-3 px-5 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <span className="text-deep-navy font-bold">{profile.residence || common('notSet')}</span>
                </div>
              )}
            </div>

            {/* Language Selection */}
            <div>
              <label className={cn("block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1", isAmharic && 'font-ethiopic')}>
                {t('language')}
              </label>
              <div className="flex items-center gap-3 px-5 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                <Globe className="w-5 h-5 text-slate-400" />
                <span className="text-deep-navy font-bold">{locale === 'am' ? 'አማርኛ' : 'English'}</span>
              </div>
            </div>

            {/* Bio / About */}
            <div className="md:col-span-2">
              <label className={cn("block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1", isAmharic && 'font-ethiopic')}>
                {t('bio')}
              </label>
              {isEditing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                  className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none min-h-[100px] text-deep-navy font-medium"
                />
              ) : (
                <div className="flex items-start gap-3 px-5 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm min-h-[100px]">
                  <AlignLeft className="w-5 h-5 text-slate-400 mt-0.5" />
                  <p className="text-deep-navy font-medium leading-relaxed">
                    {profile.bio || t('bioPlaceholder')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(profile.display_name || '');
                    setPhone(profile.phone || '');
                    setResidence(profile.residence || '');
                    setBio(profile.bio || '');
                  }}
                  className="flex-1 rounded-2xl h-14"
                >
                  {common('cancel')}
                </Button>
                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                  className="flex-1 rounded-2xl h-14 bg-deep-navy hover:bg-slate-800"
                >
                  {t('saveChanges')}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex-1 rounded-2xl h-14 bg-teal-500 hover:bg-teal-600"
              >
                {t('editProfile')}
              </Button>
            )}
          </div>

          {/* Sign Out */}
          <div className="pt-6 border-t border-zinc-100">
            <button
              onClick={handleSignOut}
              className="w-full h-14 flex items-center justify-center gap-2 text-rose-500 font-bold hover:bg-rose-50 rounded-2xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {common('signOut')}
            </button>
          </div>
        </Card>

        {/* Security / Password Change Card */}
        <Card className="p-8 mt-6 bg-white border border-zinc-100 shadow-2xl shadow-zinc-200/50">
           <h3 className={cn("text-sm font-black text-slate-400 uppercase tracking-widest mb-6 px-1 flex items-center gap-2", isAmharic && 'font-ethiopic')}>
             <Lock className="w-4 h-4 text-teal-500" />
             {t('security')}
           </h3>
           
           <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <Input
                  label={t('newPassword')}
                  type="password"
                  placeholder="••••••••"
                  className="rounded-2xl"
                  id="new-password"
                />
                <Button 
                  variant="outline"
                  className="rounded-2xl h-14 border-zinc-200 hover:bg-zinc-50"
                  onClick={async () => {
                    const input = document.getElementById('new-password') as HTMLInputElement;
                    const pass = input?.value;
                    if (!pass || pass.length < 6) {
                      alert(t('passwordMinLength'));
                      return;
                    }
                    try {
                      await updatePassword(pass);
                      alert(t('passwordUpdated'));
                      input.value = '';
                    } catch (e: any) {
                      alert(e.message);
                    }
                  }}
                >
                  {t('updatePassword')}
                </Button>
              </div>
           </div>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-deep-navy font-bold transition-colors">
            <span className="w-8 h-[2px] bg-slate-200" />
            {common('backToHome')}
            <span className="w-8 h-[2px] bg-slate-200" />
          </Link>
        </div>
      </div>
    </div>
  );
}
