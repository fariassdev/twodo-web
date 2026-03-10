import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useProfileQuery,
  useProfilesQuery,
  useUpdateProfileMutation,
} from '../lib/queryHooks';
import { getActiveProfileId, setActiveProfileId, MAIN_ID, PARTNER_ID } from '../lib/supabase';
import type { Profile } from '../lib/types';
import TopBar from './ui/TopBar';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  // Active Profile State
  const [activeProfileId, setLocalActiveProfileId] = useState(getActiveProfileId());
  const profilesQuery = useProfilesQuery();
  const profileQuery = useProfileQuery(activeProfileId);
  const updateProfileMutation = useUpdateProfileMutation();

  const profileOptions: Profile[] = profilesQuery.data ?? [];
  const profile = profileQuery.data ?? null;
  const loading = profilesQuery.isPending || profileQuery.isLoading;
  const saving = updateProfileMutation.isPending;

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Settings state (visual only for now)

  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      return;
    }

    setName('');
    setEmail('');
    setBio('');
    setAvatarUrl('');
  }, [profile]);

  const switchProfiles = useMemo(() => {
    const mainProfile = profileOptions.find((item) => item.id === MAIN_ID);
    const partnerProfile = profileOptions.find((item) => item.id === PARTNER_ID);

    return [
      { id: MAIN_ID, name: mainProfile?.name || t('profile.primary') },
      { id: PARTNER_ID, name: partnerProfile?.name || t('profile.partner') },
    ];
  }, [profileOptions, t]);

  function handleProfileSwitch(id: string) {
    if (id !== activeProfileId) {
      setActiveProfileId(id);
      setLocalActiveProfileId(id);
    }
  }

  async function handleSave() {
    if (!profile) return;
    try {
      const normalizedAvatarUrl = avatarUrl.trim();
      const updated = await updateProfileMutation.mutateAsync({
        profileId: activeProfileId,
        input: {
        name,
        email,
        bio,
        avatar_url: normalizedAvatarUrl || null,
        },
      });

      setName(updated.name || '');
      setEmail(updated.email || '');
      setBio(updated.bio || '');
      setAvatarUrl(updated.avatar_url || '');
      alert(t('profile.alertSaved'));
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(t('profile.alertSaveError'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 pb-40">
      <TopBar
        title={t('profile.title')}
        titleIcon="person"
        leftAction={{
          ariaLabel: t('topBar.back'),
          icon: 'arrow_back',
          onClick: () => navigate({ to: '/' }),
        }}
      />

      <main className="max-w-md mx-auto px-6 pt-6 space-y-8">
        
        {/* Profile Switcher */}
        <div className="flex justify-center -mt-2 mb-2">
          <div className="bg-primary/10 p-1 rounded-xl inline-flex text-sm font-bold">
            {switchProfiles.map((switchProfile) => (
              <button
                key={switchProfile.id}
                onClick={() => handleProfileSwitch(switchProfile.id)}
                className={`px-5 py-2 rounded-lg transition-colors ${activeProfileId === switchProfile.id ? 'bg-primary text-background-dark shadow-sm' : 'text-primary/70 hover:text-primary'}`}
              >
                {switchProfile.name}
              </button>
            ))}
          </div>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-2 border-primary overflow-hidden bg-primary/20 flex items-center justify-center">
              {avatarUrl ? (
                <img 
                  src={avatarUrl}
                  alt={name || t('profile.avatarFallbackAlt')} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-4xl text-primary">person</span>
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-background-dark rounded-full flex items-center justify-center shadow-lg border-4 border-background-dark hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            </button>
          </div>
          
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold">{name || t('profile.noName')}</h2>
            <div className="mt-1 relative max-w-xs mx-auto">
               <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profile.bioPlaceholder')}
                className="bg-transparent text-primary text-sm font-medium border-b border-dashed border-primary/30 pb-0.5 text-center px-2 w-full focus:outline-none focus:border-primary/80 transition-colors"
               />
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            {t('profile.personalInfo')}
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm text-slate-300 mb-1.5 ml-1">{t('profile.displayName')}</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-xl">person</span>
                <input
                  id="displayName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl focus:ring-1 focus:ring-primary focus:border-primary text-slate-100 placeholder:text-slate-500 transition-all font-medium"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="emailAddress" className="block text-sm text-slate-300 mb-1.5 ml-1">{t('profile.emailAddress')}</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-xl">mail</span>
                <input
                  id="emailAddress"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl focus:ring-1 focus:ring-primary focus:border-primary text-slate-100 placeholder:text-slate-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="avatarUrl" className="block text-sm text-slate-300 mb-1.5 ml-1">{t('profile.avatarUrlLabel')}</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-xl">link</span>
                <input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder={t('profile.avatarUrlPlaceholder')}
                  className="w-full pl-10 pr-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl focus:ring-1 focus:ring-primary focus:border-primary text-slate-100 placeholder:text-slate-500 transition-all font-medium"
                />
              </div>
            </div>
          </div>
        </section>

        {/* App Settings */}
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            {t('profile.appSettings')}
          </h3>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl divide-y divide-primary/10">
            {/* Language */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl">language</span>
                <div>
                  <h4 className="font-semibold text-[15px]">{t('profile.language')}</h4>
                  <p className="text-xs text-slate-400">{t('profile.preferredLanguage')}</p>
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-0.5 flex text-xs font-bold">
                <button 
                  onClick={() => i18n.changeLanguage('en')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${i18n.language.startsWith('en') ? 'bg-primary text-background-dark' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t('profile.langEn')}
                </button>
                <button 
                  onClick={() => i18n.changeLanguage('es')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${i18n.language.startsWith('es') ? 'bg-primary text-background-dark' : 'text-slate-400 hover:text-slate-200'}`}
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
                  <p className="text-xs text-slate-400">{t('profile.syncAlerts')}</p>
                </div>
              </div>
              <button 
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full relative transition-colors ${notifications ? 'bg-primary' : 'bg-slate-700'}`}
              >
                <span 
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications ? 'right-1' : 'left-1'}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-background-dark font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined mr-2">save</span>
                <span>{t('profile.saveChanges')}</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
