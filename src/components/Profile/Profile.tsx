import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCurrentProfileId,
  useSignOutMutation,
  useProfileQuery,
  useProfilesQuery,
  useUpdateProfileMutation,
} from '../../lib/queryHooks';
import type { Profile } from '../../lib/types';
import PageHeader from '../ui/PageHeader';
import FullPageLoading from '../ui/FullPageLoading';
import Button from '../ui/Button';
import TextInput from '../ui/TextInput';
import FormField from '../ui/FormField';
import { profileSchema, type ProfileFormValues } from '../../helpers/schemas';
import { toast } from '../ui/Snackbar';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentProfileId = useCurrentProfileId();
  const profilesQuery = useProfilesQuery();
  const profileQuery = useProfileQuery(currentProfileId ?? undefined);
  const updateProfileMutation = useUpdateProfileMutation();
  const signOutMutation = useSignOutMutation();

  const profileOptions: Profile[] = profilesQuery.data ?? [];
  const profile = profileQuery.data ?? null;
  const loading = !currentProfileId || profilesQuery.isPending || profileQuery.isLoading;
  const saving = updateProfileMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', bio: '', avatarUrl: '' },
  });

  const PREDEFINED_AVATARS = [
    { id: '1', url: '/avatars/avatar-01.png' },
    { id: '2', url: '/avatars/avatar-02.png' },
  ];

  const avatarUrlValue = watch('avatarUrl');
  const nameValue = watch('name');

  // Settings state (visual only for now)
  const [notifications, setNotifications] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name ?? '',
        email: profile.email ?? '',
        bio: profile.bio ?? '',
        avatarUrl: profile.avatar_url ?? '',
      });
    }
  }, [profile, reset]);

  async function handleSignOut() {
    setAuthError(null);
    try {
      await signOutMutation.mutateAsync();
    } catch {
      setAuthError(t('auth.signOutError'));
    }
  }

  async function onSubmit(data: ProfileFormValues) {
    if (!profile || !currentProfileId) return;
    try {
      const updated = await updateProfileMutation.mutateAsync({
        profileId: currentProfileId,
        input: {
          name: data.name,
          email: data.email,
          bio: data.bio,
          avatar_url: data.avatarUrl.trim() || null,
        },
      });
      reset({
        name: updated.name ?? '',
        email: updated.email ?? '',
        bio: updated.bio ?? '',
        avatarUrl: updated.avatar_url ?? '',
      });
      toast.success(t('profile.alertSaved'));
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('profile.alertSaveError'));
    }
  }

  if (loading) {
    return <FullPageLoading message={t('loading')} />;
  }


  return (
    <div className="min-h-screen bg-background-dark text-surface-2">
      <PageHeader
        title={t('profile.title')}
        subtitle={t('nav.profile')}
        backAction={{
          onClick: () => navigate({ to: '/' }),
        }}
      />

      <main className="max-w-md mx-auto px-6 pt-6 pb-20 space-y-8">
        {authError && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100">
            {authError}
          </p>
        )}

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary/80">
            {t('profile.householdMembers')}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {profileOptions.map((member) => (
              <span
                key={member.id}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${member.id === currentProfileId ? 'bg-primary text-surface-1' : 'bg-surface-2/10 text-surface-2/60'}`}
              >
                {member.name}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-primary shadow-xl overflow-hidden bg-surface-1 flex items-center justify-center transition-all duration-300">
              {avatarUrlValue ? (
                <img 
                  src={avatarUrlValue}
                  alt={nameValue || t('profile.avatarFallbackAlt')} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl font-bold text-primary">
                  {nameValue?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <button 
              type="button"
              onClick={() => setShowAvatarSelector(!showAvatarSelector)}
              className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-surface-1 rounded-full flex items-center justify-center shadow-lg border-4 border-surface-1 hover:scale-105 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showAvatarSelector ? 'close' : 'photo_camera'}
              </span>
            </button>
          </div>

          {showAvatarSelector && (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="text-center mb-2">
                <p className="text-[10px] font-bold text-surface-2/40 uppercase tracking-widest">{t('profile.selectAvatar')}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {PREDEFINED_AVATARS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setValue('avatarUrl', option.url, { shouldDirty: true })}
                    className={`relative group flex flex-col items-center space-y-2 p-2 rounded-2xl transition-all ${
                      avatarUrlValue === option.url 
                        ? 'bg-primary/10 ring-2 ring-primary' 
                        : 'bg-primary/5 hover:bg-primary/10 ring-1 ring-primary/20'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 group-hover:scale-105 transition-transform">
                      <img 
                        src={option.url} 
                        alt={t(`profile.avatarOption${option.id}`)} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-tight ${
                      avatarUrlValue === option.url ? 'text-primary' : 'text-surface-2/60'
                    }`}>
                      {t(`profile.avatarOption${option.id}`)}
                    </span>
                    {avatarUrlValue === option.url && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-surface-1 rounded-full flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                      </div>
                    )}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    if (PREDEFINED_AVATARS.some(a => a.url === avatarUrlValue)) {
                      setValue('avatarUrl', '', { shouldDirty: true });
                    }
                  }}
                  className={`relative group flex flex-col items-center space-y-2 p-2 rounded-2xl transition-all ${
                    !PREDEFINED_AVATARS.some(a => a.url === avatarUrlValue)
                      ? 'bg-primary/10 ring-2 ring-primary' 
                      : 'bg-primary/5 hover:bg-primary/10 ring-1 ring-primary/20'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-surface-1 flex items-center justify-center border-2 border-dashed border-primary/30 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl text-primary/60">link</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${
                    !PREDEFINED_AVATARS.some(a => a.url === avatarUrlValue) ? 'text-primary' : 'text-surface-2/60'
                  }`}>
                    {t('profile.avatarOptionCustom')}
                  </span>
                  {!PREDEFINED_AVATARS.some(a => a.url === avatarUrlValue) && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-surface-1 rounded-full flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                    </div>
                  )}
                </button>
              </div>

              {!PREDEFINED_AVATARS.some(a => a.url === avatarUrlValue) && (
                <FormField
                  error={errors.avatarUrl && t(errors.avatarUrl.message!)}
                  className="pt-1 animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  <TextInput
                    placeholder={t('profile.avatarUrlPlaceholder')}
                    variant="soft"
                    leading={<span className="material-symbols-outlined text-lg">link</span>}
                    {...register('avatarUrl')}
                  />
                </FormField>
              )}
            </div>
          )}
          
          <div className="text-center w-full">
            <h2 className="text-2xl font-bold">{nameValue || t('profile.noName')}</h2>
            <FormField
              error={errors.bio && t(errors.bio.message!)}
              errorClassName="mt-2 text-[10px] font-bold text-danger uppercase tracking-wider text-center animate-in fade-in slide-in-from-top-1 duration-300"
            >
              <TextInput
                {...register('bio')}
                placeholder={t('profile.bioPlaceholder')}
                type="text"
                variant="editorial"
              />
            </FormField>
          </div>
        </div>

        {/* Personal Information */}
        <section>
          <h3 className="text-sm font-bold text-surface-2/60 uppercase tracking-wider mb-4">
            {t('profile.personalInfo')}
          </h3>
          <div className="space-y-4">
            <FormField
              label={t('profile.displayName')}
              htmlFor="displayName"
              error={errors.name && t(errors.name.message!)}
            >
              <TextInput
                id="displayName"
                variant="soft"
                leading={<span className="material-symbols-outlined text-xl">person</span>}
                {...register('name')}
              />
            </FormField>
            
            <FormField
              label={t('profile.emailAddress')}
              htmlFor="emailAddress"
              error={errors.email && t(errors.email.message!)}
            >
              <TextInput
                id="emailAddress"
                type="email"
                variant="soft"
                leading={<span className="material-symbols-outlined text-xl">mail</span>}
                {...register('email')}
              />
            </FormField>
          </div>
        </section>

        {/* App Settings */}
        <section>
          <h3 className="text-sm font-bold text-surface-2/60 uppercase tracking-wider mb-4">
            {t('profile.appSettings')}
          </h3>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl divide-y divide-primary/10">
            {/* Language */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl">language</span>
                <div>
                  <h4 className="font-semibold text-[15px]">{t('profile.language')}</h4>
                  <p className="text-xs text-surface-2/60">{t('profile.preferredLanguage')}</p>
                </div>
              </div>
              <div className="bg-surface-2/5 rounded-lg p-0.5 flex text-xs font-bold">
                <button 
                  onClick={() => i18n.changeLanguage('en')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${i18n.language.startsWith('en') ? 'bg-primary text-surface-1' : 'text-surface-2/40 hover:text-surface-2'}`}
                >
                  {t('profile.langEn')}
                </button>
                <button 
                  onClick={() => i18n.changeLanguage('es')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${i18n.language.startsWith('es') ? 'bg-primary text-surface-1' : 'text-surface-2/40 hover:text-surface-2'}`}
                >
                  {t('profile.langEs')}
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl">notifications</span>
                <div>
                  <h4 className="font-semibold text-[15px]">{t('profile.jointNotifications')}</h4>
                  <p className="text-xs text-surface-2/60">{t('profile.syncAlerts')}</p>
                </div>
              </div>
              <button 
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full relative transition-colors ${notifications ? 'bg-primary' : 'bg-surface-2/20'}`}
              >
                <span 
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications ? 'right-1' : 'left-1'}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <div className="pt-2 space-y-3">
          <Button
            type="submit"
            loading={saving}
            fullWidth
            size="lg"
            startIcon={!saving && <span className="material-symbols-outlined">save</span>}
          >
            {t('profile.saveChanges')}
          </Button>

          <Button
            variant="subtle"
            onClick={handleSignOut}
            loading={signOutMutation.isPending}
            fullWidth
            size="lg"
          >
            {t('auth.signOut')}
          </Button>
        </div>
      </form>
    </main>
    </div>
  );
}
