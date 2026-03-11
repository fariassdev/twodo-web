import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  useAuthScope,
  useCreateHouseholdAndInviteMutation,
  useGetOrCreateHouseholdInviteMutation,
  useAcceptHouseholdInviteMutation,
  useInviteInfoQuery,
  useSendEmailInviteMutation,
  useSignOutMutation,
} from '../lib/queryHooks';
import type { HouseholdInviteResult } from '../lib/types';
import { supabase } from '../lib/supabase';

type View = 'initial' | 'invite-created' | 'join-confirm' | 'join-success' | 'enter-code';

export default function ConnectPartner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, profileId, householdId } = useAuthScope();
  const signOutMutation = useSignOutMutation();
  const existingInviteLoadKeyRef = useRef<string | null>(null);

  const [view, setView] = useState<View>('initial');
  const [inviteData, setInviteData] = useState<HouseholdInviteResult | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copiedState, setCopiedState] = useState<'none' | 'link' | 'code'>('none');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateHouseholdAndInviteMutation();
  const getOrCreateInviteMutation = useGetOrCreateHouseholdInviteMutation();
  const acceptMutation = useAcceptHouseholdInviteMutation();
  const sendEmailMutation = useSendEmailInviteMutation();
  const inviteInfoQuery = useInviteInfoQuery(pendingCode);
  const creatorInviteInfoPollingQuery = useInviteInfoQuery(
    view === 'invite-created' && inviteData?.invite_code ? inviteData.invite_code : null,
    {
      enabled: view === 'invite-created' && Boolean(inviteData?.invite_code),
      refetchInterval: 5000,
    },
  );

  // Check for stored invite code from /join route
  useEffect(() => {
    const stored = sessionStorage.getItem('pendingInviteCode');
    const normalized = stored?.trim().toUpperCase();
    if (normalized) {
      setPendingCode(normalized);
      setView('join-confirm');
    }
  }, []);

  useEffect(() => {
    if (pendingCode) return;
    if (!householdId || !profileId) return;
    if (inviteData) return;

    const loadKey = `${householdId}:${profileId}`;
    if (existingInviteLoadKeyRef.current === loadKey) return;
    existingInviteLoadKeyRef.current = loadKey;

    void (async () => {
      setError(null);
      try {
        const result = await getOrCreateInviteMutation.mutateAsync({ householdId, profileId });
        setInviteData(result);
        setView('invite-created');
      } catch {
        setError(t('partner.loadInviteError'));
      }
    })();
  }, [getOrCreateInviteMutation, householdId, profileId, pendingCode, inviteData, t]);

  useEffect(() => {
    const householdToWatch = inviteData?.household_id ?? householdId;
    if (!householdToWatch || view !== 'invite-created') return;

    const channel = supabase
      .channel(`household-members:${householdToWatch}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'household_members',
          filter: `household_id=eq.${householdToWatch}`,
        },
        (payload) => {
          const insertedProfileId = (payload.new as { profile_id?: string })?.profile_id;
          if (insertedProfileId && insertedProfileId !== profile?.id) {
            setView('join-success');
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, inviteData?.household_id, profile?.id, view]);

  useEffect(() => {
    if (view !== 'invite-created') return;
    const polledInfo = creatorInviteInfoPollingQuery.data;
    if (!polledInfo) return;

    const memberCount = polledInfo.member_count ?? 0;
    if (memberCount >= 2 || polledInfo.is_accepted) {
      setView('join-success');
    }
  }, [creatorInviteInfoPollingQuery.data, view]);

  async function handleCreateHousehold() {
    setError(null);
    try {
      const result = await createMutation.mutateAsync();
      setInviteData(result);
      setView('invite-created');
    } catch {
      setError(t('partner.createError'));
    }
  }

  async function handleAcceptInvite(code: string) {
    setError(null);
    try {
      await acceptMutation.mutateAsync(code);
      sessionStorage.removeItem('pendingInviteCode');
      setView('join-success');
    } catch (err) {
      setError(t('partner.joinError'));
    }
  }

  async function handleSendEmail() {
    if (!emailInput || !inviteData) return;
    setError(null);
    try {
      await sendEmailMutation.mutateAsync({
        inviteCode: inviteData.invite_code,
        email: emailInput,
        senderName: profile?.name ?? 'Someone',
      });
      setEmailSent(true);
    } catch {
      setError(t('partner.emailError'));
    }
  }

  async function handleShareLink() {
    if (!inviteData) return;
    const url = `${window.location.origin}/join?code=${inviteData.invite_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: t('partner.shareTitle'), url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopiedState('link');
    }
  }

  async function handleCopyLink() {
    if (!inviteData) return;
    await navigator.clipboard.writeText(`${window.location.origin}/join?code=${inviteData.invite_code}`);
    setCopiedState('link');
  }

  async function handleCopyCode() {
    if (!inviteData) return;
    await navigator.clipboard.writeText(inviteData.invite_code);
    setCopiedState('code');
  }

  function handleEnterCode() {
    if (!manualCode.trim()) return;
    setPendingCode(manualCode.trim().toUpperCase());
    setView('join-confirm');
  }

  async function handleRetryLoadInvite() {
    if (!householdId || !profileId) return;
    setError(null);
    try {
      const result = await getOrCreateInviteMutation.mutateAsync({ householdId, profileId });
      setInviteData(result);
      setView('invite-created');
    } catch {
      setError(t('partner.loadInviteError'));
    }
  }

  async function handleSignOut() {
    try { await signOutMutation.mutateAsync(); } catch { /* retry available */ }
  }

  async function handleGoDashboard() {
    await queryClient.invalidateQueries({ queryKey: ['auth', 'context'] });
    navigate({ to: '/' });
  }

  const inviteUrl = inviteData ? `${window.location.origin}/join?code=${inviteData.invite_code}` : '';

  // ─── Initial view (manual choice: create or join) ───
  if (view === 'initial') {
    return (
      <div className="min-h-screen flex flex-col px-5 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={handleSignOut} className="text-slate-400 hover:text-slate-200 transition-colors" aria-label={t('topBar.back')}>
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-slate-100">{t('partner.title')}</h1>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined filled-icon text-primary text-5xl">favorite</span>
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-background-dark text-lg">add</span>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 leading-tight mb-3">
            {t('partner.heroTitle')}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            {t('partner.heroSubtitle')}
          </p>
        </div>

        {householdId ? (
          <div className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-6">
            <div className="flex items-center justify-center h-16">
              {getOrCreateInviteMutation.isPending ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              ) : (
                <button
                  onClick={handleRetryLoadInvite}
                  className="h-11 px-5 rounded-xl border border-primary/40 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  {t('partner.retryLoadInvite')}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 text-center">{t('partner.prepareInvite')}</p>
          </div>
        ) : (
          <button
            onClick={handleCreateHousehold}
            disabled={createMutation.isPending}
            className="w-full h-14 rounded-2xl bg-primary font-bold text-background-dark text-base transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-60 mb-6"
          >
            {createMutation.isPending ? t('auth.loading') : t('partner.createCta')}
          </button>
        )}

        {!householdId && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-500 uppercase">{t('partner.or')}</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <p className="text-sm text-slate-400 text-center mb-2">{t('partner.haveLink')}</p>
            <button
              onClick={() => setView('enter-code')}
              className="text-sm font-semibold text-primary text-center hover:underline"
            >
              {t('partner.enterCode')}
            </button>
          </>
        )}

        {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // ─── Enter code manually ───
  if (view === 'enter-code') {
    return (
      <div className="min-h-screen flex flex-col px-5 pt-6 pb-10">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => { setView(inviteData ? 'invite-created' : 'initial'); setError(null); }} className="text-slate-400 hover:text-slate-200 transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-slate-100">{t('partner.enterCodeTitle')}</h1>
        </div>

        <p className="text-sm text-slate-400 mb-6">{t('partner.enterCodeDescription')}</p>

        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
          placeholder="ABCD1234"
          maxLength={8}
          className="w-full h-14 rounded-2xl border border-primary/30 bg-primary/5 px-4 text-center text-lg font-mono tracking-widest text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary/60 mb-4"
        />

        <button
          onClick={handleEnterCode}
          disabled={manualCode.trim().length < 4}
          className="w-full h-14 rounded-2xl bg-primary font-bold text-background-dark text-base transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-40"
        >
          {t('partner.joinCta')}
        </button>

        {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // ─── Invite created – share options ───
  if (view === 'invite-created' && inviteData) {
    return (
      <div className="min-h-screen flex flex-col px-5 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setView('initial')} className="text-slate-400 hover:text-slate-200 transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-slate-100">{t('partner.title')}</h1>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined filled-icon text-primary text-5xl">favorite</span>
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-background-dark text-lg">add</span>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 leading-tight mb-3">
            {t('partner.heroTitle')}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            {t('partner.heroSubtitle')}
          </p>
        </div>

        {/* Email invite card */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-4">
          <h3 className="font-bold text-slate-100 mb-1">{t('partner.inviteByEmail')}</h3>
          <p className="text-xs text-slate-400 mb-4">{t('partner.inviteByEmailDesc')}</p>

          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-background-dark/40 px-3 h-12 mb-3">
            <span className="material-symbols-outlined text-slate-500 text-lg">mail</span>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setEmailSent(false); }}
              placeholder={t('partner.emailPlaceholder')}
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSendEmail}
            disabled={sendEmailMutation.isPending || !emailInput || emailSent}
            className="w-full h-12 rounded-xl bg-primary font-bold text-background-dark text-sm transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {emailSent ? t('partner.emailSentSuccess') : sendEmailMutation.isPending ? t('auth.loading') : t('partner.sendInvitation')}
            {!emailSent && !sendEmailMutation.isPending && <span className="material-symbols-outlined text-lg">send</span>}
          </button>

          <p className="mt-4 mb-1 text-xs text-slate-400">{t('partner.inviteLinkLabel')}</p>
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-background-dark/40 p-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-9 px-3 rounded-lg border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10"
            >
              {t('partner.copyLink')}
            </button>
          </div>

          <p className="mt-3 mb-1 text-xs text-slate-400">{t('partner.codeLabel')}</p>
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-background-dark/40 px-3 py-2">
            <p className="text-sm font-mono tracking-widest text-primary">{inviteData.invite_code}</p>
            <button
              type="button"
              onClick={handleCopyCode}
              className="h-8 px-3 rounded-lg border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10"
            >
              {t('partner.copyCode')}
            </button>
          </div>

          {copiedState !== 'none' && (
            <p className="mt-2 text-xs text-primary">
              {copiedState === 'link' ? t('partner.linkCopied') : t('partner.codeCopied')}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-xs text-slate-500 uppercase">{t('partner.or')}</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Share link button */}
        <button
          onClick={handleShareLink}
          className="w-full h-12 rounded-xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors mb-3"
        >
          <span className="material-symbols-outlined text-lg">share</span>
          {t('partner.shareLink')}
        </button>

        {/* QR Code button */}
        <button
          onClick={() => setShowQR(!showQR)}
          className="w-full h-12 rounded-xl border border-slate-600 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-800/50 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">qr_code_2</span>
          {t('partner.showQR')}
        </button>

        {/* QR Modal */}
        {showQR && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6" onClick={() => setShowQR(false)}>
            <div className="bg-background-dark rounded-2xl border border-primary/20 p-8 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-100">{t('partner.qrTitle')}</h3>
                <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-slate-200">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex justify-center mb-4 bg-white rounded-xl p-4">
                <QRCodeSVG value={inviteUrl} size={200} />
              </div>
              <p className="text-center text-xs text-slate-400">{t('partner.qrDescription')}</p>
              <p className="text-center text-lg font-mono tracking-widest text-primary mt-3">{inviteData.invite_code}</p>
            </div>
          </div>
        )}

        {/* Enter code link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">{t('partner.haveLink')}</p>
          <button
            onClick={() => setView('enter-code')}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t('partner.enterCode')}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // ─── Join confirmation ───
  if (view === 'join-confirm') {
    const info = inviteInfoQuery.data;
    const isLoading = inviteInfoQuery.isPending;
    const inviteFound = Boolean(info?.found ?? info?.invite_code);
    const canJoin = inviteFound && !info?.is_expired && !info?.is_accepted && (info?.member_count ?? 0) < 2;

    return (
      <div className="min-h-screen flex flex-col px-5 pt-6 pb-10">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => { setView('initial'); setPendingCode(null); sessionStorage.removeItem('pendingInviteCode'); setError(null); }} className="text-slate-400 hover:text-slate-200 transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-slate-100">{t('partner.joinTitle')}</h1>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && info && !inviteFound && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-red-400 text-5xl mb-4">error</span>
            <p className="text-slate-300 text-lg font-semibold mb-2">{t('partner.inviteNotFound')}</p>
            <p className="text-sm text-slate-400">{t('partner.inviteNotFoundDesc')}</p>
          </div>
        )}

        {!isLoading && inviteFound && info?.is_expired && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-amber-400 text-5xl mb-4">schedule</span>
            <p className="text-slate-300 text-lg font-semibold mb-2">{t('partner.inviteExpired')}</p>
            <p className="text-sm text-slate-400">{t('partner.inviteExpiredDesc')}</p>
          </div>
        )}

        {!isLoading && inviteFound && !info?.is_expired && info?.is_accepted && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-amber-400 text-5xl mb-4">check_circle</span>
            <p className="text-slate-300 text-lg font-semibold mb-2">{t('partner.inviteAlreadyUsed')}</p>
          </div>
        )}

        {!isLoading && inviteFound && (info?.member_count ?? 0) >= 2 && !info?.is_accepted && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-amber-400 text-5xl mb-4">group</span>
            <p className="text-slate-300 text-lg font-semibold mb-2">{t('partner.householdFull')}</p>
          </div>
        )}

        {!isLoading && canJoin && (
          <div className="flex-1 flex flex-col items-center pt-10">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
              {info?.creator_avatar ? (
                <img src={info.creator_avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary text-4xl">person</span>
              )}
            </div>
            <p className="text-xl font-bold text-slate-100 mb-2">{info?.creator_name}</p>
            <p className="text-sm text-slate-400 text-center mb-8">{t('partner.joinDescription')}</p>

            <button
              onClick={() => handleAcceptInvite(pendingCode!)}
              disabled={acceptMutation.isPending}
              className="w-full h-14 rounded-2xl bg-primary font-bold text-background-dark text-base transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-60"
            >
              {acceptMutation.isPending ? t('auth.loading') : t('partner.acceptInvite')}
            </button>

            {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
          </div>
        )}
      </div>
    );
  }

  // ─── Join success ───
  if (view === 'join-success') {
    return (
      <div className="min-h-screen flex flex-col px-5 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate({ to: '/' })} className="text-slate-400 hover:text-slate-200 transition-colors">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <h1 className="text-lg font-bold text-slate-100">{t('partner.successTitle')}</h1>
        </div>

        <div className="flex-1 flex flex-col items-center pt-4">
          {/* Celebration image placeholder */}
          <div className="w-full max-w-xs aspect-[4/3] rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8 relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined filled-icon text-background-dark text-4xl">favorite</span>
            </div>
            <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-700/60 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">celebration</span>
            </div>
            <div className="absolute bottom-4 left-4 w-10 h-10 rounded-full bg-slate-700/60 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">group</span>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-100 text-center mb-3">
            {t('partner.successHeading')}
          </h2>
          <p className="text-sm text-slate-400 text-center max-w-xs mb-8">
            {t('partner.successDescription')}
          </p>

          {/* Active link card */}
          <div className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4 mb-8">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full bg-primary/30 border-2 border-background-dark flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">person</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/30 border-2 border-background-dark flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">person</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-primary">{t('partner.activeBond')}</p>
              <p className="text-xs text-slate-400">{t('partner.activeBondDesc')}</p>
            </div>
            <span className="material-symbols-outlined filled-icon text-primary">verified</span>
          </div>
        </div>

        {/* Go to dashboard */}
        <button
          onClick={handleGoDashboard}
          className="w-full h-14 rounded-2xl bg-primary font-bold text-background-dark text-base transition-all hover:brightness-110 active:scale-[.98] flex items-center justify-center gap-2"
        >
          {t('partner.goToDashboard')}
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">{t('partner.startSharing')}</p>
      </div>
    );
  }

  return null;
}
