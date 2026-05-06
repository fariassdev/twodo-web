import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
} from '../../lib/queryHooks';
import type { HouseholdInviteResult } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import {
  partnerInviteCodeFormSchema,
  partnerInviteEmailFormSchema,
  type PartnerInviteCodeFormValues,
  type PartnerInviteEmailFormValues,
} from '../../helpers/schemas';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import TextInput from '../ui/TextInput';
import Card from '../ui/Card';
import IconBox from '../ui/IconBox';
import TwodoLogo from '../ui/TwodoLogo';
import FullPageLoading from '../ui/FullPageLoading';


type View = 'initial' | 'invite-created' | 'join-confirm' | 'join-success' | 'enter-code';

export default function ConnectPartner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, profileId, householdId } = useAuthScope();
  const signOutMutation = useSignOutMutation();
  const existingInviteLoadKeyRef = useRef<string | null>(null);

  const {
    register: registerManualCode,
    handleSubmit: handleSubmitManualCode,
    watch: watchManualCode,
    setValue: setManualCodeValue,
    formState: { errors: manualCodeErrors },
  } = useForm<PartnerInviteCodeFormValues>({
    resolver: zodResolver(partnerInviteCodeFormSchema),
    defaultValues: {
      code: '',
    },
  });

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    watch: watchEmail,
    setValue: setEmailValue,
    formState: { errors: emailErrors },
  } = useForm<PartnerInviteEmailFormValues>({
    resolver: zodResolver(partnerInviteEmailFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const [view, setView] = useState<View>('initial');
  const [inviteData, setInviteData] = useState<HouseholdInviteResult | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copiedState, setCopiedState] = useState<'none' | 'link' | 'code'>('none');
  const [error, setError] = useState<string | null>(null);

  const manualCode = watchManualCode('code');
  const emailInput = watchEmail('email');

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
    } catch {
      setError(t('partner.joinError'));
    }
  }

  const handleSendEmail = handleSubmitEmail(async ({ email }) => {
    if (!inviteData) return;

    setError(null);
    try {
      await sendEmailMutation.mutateAsync({
        inviteCode: inviteData.invite_code,
        email: email.trim(),
        senderName: profile?.name ?? 'Someone',
      });
      setEmailSent(true);
    } catch {
      setError(t('partner.emailError'));
    }
  });

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

  const handleEnterCode = handleSubmitManualCode(({ code }) => {
    const normalizedCode = code.trim().toUpperCase();
    setPendingCode(normalizedCode);
    setView('join-confirm');
  });

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
      <div className="min-h-screen flex flex-col bg-background-dark">
        <PageHeader 
          title={t('partner.title')}
          showLogo={false}
          showAvatars={false}
          backAction={{ onClick: handleSignOut, ariaLabel: t('topBar.back') }}
        />

        <div className="flex-1 flex flex-col px-5 pt-10 pb-10 max-w-lg mx-auto w-full">
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-10">
            <TwodoLogo width={224} className="mb-8" />
            <h2 className="text-3xl font-black text-surface-2 leading-tight mb-4">
              {t('partner.heroTitle')}
            </h2>
            <p className="text-base text-surface-2/60 leading-relaxed max-w-sm">
              {t('partner.heroSubtitle')}
            </p>
          </div>

          <div className="space-y-6">
            {householdId ? (
              <Card variant="elevated" className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center h-12">
                    {getOrCreateInviteMutation.isPending ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    ) : (
                      <Button
                        variant="subtle"
                        onClick={handleRetryLoadInvite}
                        fullWidth
                      >
                        {t('partner.retryLoadInvite')}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-surface-2/40 text-center">{t('partner.prepareInvite')}</p>
                </div>
              </Card>
            ) : (
              <Button
                onClick={handleCreateHousehold}
                loading={createMutation.isPending}
                size="lg"
                fullWidth
              >
                {t('partner.createCta')}
              </Button>
            )}

            {!householdId && (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-border-subtle" />
                  <span className="text-[10px] font-black text-surface-2/30 uppercase tracking-widest">{t('partner.or')}</span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>

                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-surface-2/60">{t('partner.haveLink')}</p>
                  <Button
                    variant="ghost"
                    onClick={() => setView('enter-code')}
                    className="text-primary font-bold"
                  >
                    {t('partner.enterCode')}
                  </Button>
                </div>
              </>
            )}

            {error && (
              <Card variant="error" padding="sm" radius="xl" className="mt-4">
                <p className="text-xs font-semibold text-center">{error}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Enter code manually ───
  if (view === 'enter-code') {
    return (
      <div className="min-h-screen flex flex-col bg-background-dark">
        <PageHeader 
          title={t('partner.enterCodeTitle')}
          showLogo={false}
          showAvatars={false}
          backAction={{ 
            onClick: () => { setView(inviteData ? 'invite-created' : 'initial'); setError(null); },
            ariaLabel: t('topBar.back')
          }}
        />

        <div className="flex-1 flex flex-col px-5 pt-8 pb-10 max-w-lg mx-auto w-full">
          <p className="text-base text-surface-2/60 mb-8">{t('partner.enterCodeDescription')}</p>

          <div className="space-y-6">
            <TextInput
              variant="elevated"
              size="lg"
              {...registerManualCode('code')}
              value={manualCode}
              onChange={(event) => {
                setManualCodeValue('code', event.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true });
              }}
              placeholder="ABCD1234"
              maxLength={8}
              inputClassName="text-center font-mono tracking-[0.3em] text-xl"
            />
            {manualCodeErrors.code && (
              <p className="text-xs font-semibold text-danger -mt-4 pl-1">
                {t(manualCodeErrors.code.message!)}
              </p>
            )}

            <Button
              onClick={handleEnterCode}
              disabled={manualCode.trim().length < 4}
              size="lg"
              fullWidth
            >
              {t('partner.joinCta')}
            </Button>

            {error && (
              <Card variant="error" padding="sm" radius="xl">
                <p className="text-xs font-semibold text-center">{error}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Invite created – share options ───
  if (view === 'invite-created' && inviteData) {
    return (
      <div className="min-h-screen flex flex-col bg-background-dark">
        <PageHeader 
          title={t('partner.title')}
          showLogo={false}
          showAvatars={false}
          backAction={{ onClick: handleSignOut, ariaLabel: t('auth.signOut') }}
        />

        <div className="flex-1 flex flex-col px-5 pt-8 pb-10 max-w-lg mx-auto w-full">
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-8">
            <TwodoLogo width={160} className="mb-6 opacity-80" />
            <h2 className="text-2xl font-black text-surface-2 leading-tight mb-2">
              {t('partner.heroTitle')}
            </h2>
            <p className="text-sm text-surface-2/60 leading-relaxed max-w-xs">
              {t('partner.heroSubtitle')}
            </p>
          </div>

          {/* Email invite card */}
          <Card variant="elevated" className="mb-6">
            <h3 className="font-bold text-surface-2 mb-1">{t('partner.inviteByEmail')}</h3>
            <p className="text-xs text-surface-2/60 mb-4">{t('partner.inviteByEmailDesc')}</p>

            <div className="space-y-3">
              <TextInput
                variant="soft"
                type="email"
                {...registerEmail('email')}
                value={emailInput}
                onChange={(event) => {
                  setEmailValue('email', event.target.value, { shouldDirty: true, shouldValidate: true });
                  setEmailSent(false);
                }}
                placeholder={t('partner.emailPlaceholder')}
                leading={<span className="material-symbols-outlined text-lg">mail</span>}
              />
              {emailErrors.email && (
                <p className="text-xs font-semibold text-danger -mt-2 pl-1">
                  {t(emailErrors.email.message!)}
                </p>
              )}

              <Button
                onClick={handleSendEmail}
                loading={sendEmailMutation.isPending}
                disabled={!emailInput || emailSent}
                fullWidth
                endIcon={!emailSent && !sendEmailMutation.isPending && <span className="material-symbols-outlined text-lg">send</span>}
              >
                {emailSent ? t('partner.emailSentSuccess') : t('partner.sendInvitation')}
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="mb-1.5 text-[10px] font-black text-surface-2/40 uppercase tracking-widest">{t('partner.inviteLinkLabel')}</p>
                <TextInput
                  readOnly
                  value={inviteUrl}
                  variant="soft"
                  size="md"
                  inputClassName="text-[10px]"
                  trailing={
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={handleCopyLink}
                      className="h-8 rounded-md"
                    >
                      {t('partner.copyLink')}
                    </Button>
                  }
                />
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-black text-surface-2/40 uppercase tracking-widest">{t('partner.codeLabel')}</p>
                <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                  <p className="text-sm font-mono font-bold tracking-widest text-primary">{inviteData.invite_code}</p>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-8 rounded-md"
                  >
                    {t('partner.copyCode')}
                  </Button>
                </div>
              </div>
            </div>

            {copiedState !== 'none' && (
              <p className="mt-3 text-center text-xs font-bold text-primary animate-in fade-in slide-in-from-top-1">
                {copiedState === 'link' ? t('partner.linkCopied') : t('partner.codeCopied')}
              </p>
            )}
          </Card>

          {/* Divider */}
          <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-[10px] font-black text-surface-2/30 uppercase tracking-widest">{t('partner.or')}</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {/* Share & QR actions */}
          <div className="flex flex-col gap-3 mt-4">
            <Button
              variant="subtle"
              onClick={handleShareLink}
              size="lg"
              fullWidth
              startIcon={<span className="material-symbols-outlined">share</span>}
            >
              {t('partner.shareLink')}
            </Button>

            <Button
              variant="subtle"
              onClick={() => setShowQR(!showQR)}
              size="lg"
              fullWidth
              startIcon={<span className="material-symbols-outlined">qr_code_2</span>}
              className="border-border-subtle text-surface-2/60"
            >
              {t('partner.showQR')}
            </Button>
          </div>

          {/* QR Modal */}
          {showQR && (
            <div className="fixed inset-0 bg-surface-2/80 backdrop-blur-sm z-50 flex items-center justify-center px-6" onClick={() => setShowQR(false)}>
              <Card variant="modal" padding="xl" className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-surface-2">{t('partner.qrTitle')}</h3>
                  <Button variant="icon" size="icon" onClick={() => setShowQR(false)}>
                    <span className="material-symbols-outlined">close</span>
                  </Button>
                </div>
                <div className="flex justify-center mb-6 bg-white rounded-2xl p-6 shadow-card-md">
                  <QRCodeSVG value={inviteUrl} size={180} />
                </div>
                <p className="text-center text-sm text-surface-2/60 mb-4">{t('partner.qrDescription')}</p>
                <p className="text-center text-2xl font-mono font-black tracking-[0.2em] text-primary">{inviteData.invite_code}</p>
              </Card>
            </div>
          )}

          {/* Enter code link */}
          <div className="mt-10 flex flex-col items-center gap-2">
            <p className="text-sm text-surface-2/60">{t('partner.haveLink')}</p>
            <Button
              variant="ghost"
              onClick={() => setView('enter-code')}
              className="text-primary font-bold"
            >
              {t('partner.enterCode')}
            </Button>
          </div>

          {error && (
            <Card variant="error" padding="sm" radius="xl" className="mt-6">
              <p className="text-xs font-semibold text-center">{error}</p>
            </Card>
          )}

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="mt-8 text-surface-2/40 text-xs font-bold uppercase tracking-widest"
          >
            {t('auth.signOut')}
          </Button>
        </div>
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
      <div className="min-h-screen flex flex-col bg-background-dark">
        <PageHeader 
          title={t('partner.joinTitle')}
          showLogo={false}
          showAvatars={false}
          backAction={{ 
            onClick: () => { setView('initial'); setPendingCode(null); sessionStorage.removeItem('pendingInviteCode'); setError(null); },
            ariaLabel: t('topBar.back')
          }}
        />

        <div className="flex-1 flex flex-col px-5 pt-10 pb-10 max-w-lg mx-auto w-full">
          {isLoading && <FullPageLoading message={t('loading')} />}


          {!isLoading && info && !inviteFound && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <IconBox tone="danger" size="lg" className="mb-6">
                <span className="material-symbols-outlined text-3xl">error</span>
              </IconBox>
              <h2 className="text-2xl font-black text-surface-2 mb-3">{t('partner.inviteNotFound')}</h2>
              <p className="text-base text-surface-2/60">{t('partner.inviteNotFoundDesc')}</p>
            </div>
          )}

          {!isLoading && inviteFound && info?.is_expired && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <IconBox tone="warning" size="lg" className="mb-6">
                <span className="material-symbols-outlined text-3xl">schedule</span>
              </IconBox>
              <h2 className="text-2xl font-black text-surface-2 mb-3">{t('partner.inviteExpired')}</h2>
              <p className="text-base text-surface-2/60">{t('partner.inviteExpiredDesc')}</p>
            </div>
          )}

          {!isLoading && inviteFound && !info?.is_expired && info?.is_accepted && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <IconBox tone="success" size="lg" className="mb-6">
                <span className="material-symbols-outlined filled-icon text-3xl">check_circle</span>
              </IconBox>
              <h2 className="text-2xl font-black text-surface-2 mb-3">{t('partner.inviteAlreadyUsed')}</h2>
            </div>
          )}

          {!isLoading && inviteFound && (info?.member_count ?? 0) >= 2 && !info?.is_accepted && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <IconBox tone="warning" size="lg" className="mb-6">
                <span className="material-symbols-outlined text-3xl">group</span>
              </IconBox>
              <h2 className="text-2xl font-black text-surface-2 mb-3">{t('partner.householdFull')}</h2>
            </div>
          )}

          {!isLoading && canJoin && (
            <div className="flex-1 flex flex-col items-center pt-8">
              <div className="w-24 h-24 rounded-full border-4 border-surface-1 bg-primary/20 flex items-center justify-center mb-6 overflow-hidden shadow-card-md">
                {info?.creator_avatar ? (
                  <img src={info.creator_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-primary text-5xl">person</span>
                )}
              </div>
              <h2 className="text-2xl font-black text-surface-2 mb-3">{info?.creator_name}</h2>
              <p className="text-base text-surface-2/60 text-center mb-10 max-w-xs">{t('partner.joinDescription')}</p>

              <Button
                onClick={() => handleAcceptInvite(pendingCode!)}
                loading={acceptMutation.isPending}
                size="lg"
                fullWidth
              >
                {t('partner.acceptInvite')}
              </Button>

              {error && (
                <Card variant="error" padding="sm" radius="xl" className="mt-6">
                  <p className="text-xs font-semibold text-center">{error}</p>
                </Card>
              )}
            </div>
          )}

          <div className="mt-auto">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              fullWidth
              className="text-surface-2/40 text-xs font-bold uppercase tracking-widest"
            >
              {t('auth.signOut')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Join success ───
  if (view === 'join-success') {
    return (
      <div className="min-h-screen flex flex-col bg-background-dark">
        <PageHeader 
          title={t('partner.successTitle')}
          showLogo={false}
          showAvatars={false}
          backAction={{ onClick: handleGoDashboard, ariaLabel: t('topBar.back') }}
        />

        <div className="flex-1 flex flex-col px-5 pt-10 pb-10 max-w-lg mx-auto w-full">
          <div className="flex-1 flex flex-col items-center pt-4">
            {/* Celebration Illustration Placeholder */}
            <div className="w-full aspect-[4/3] rounded-3xl bg-surface-1 border border-border-subtle flex items-center justify-center mb-10 relative overflow-hidden shadow-card-md">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)]" />
              </div>
              
              <IconBox tone="primary" size="lg" className="w-20 h-20 rounded-full shadow-glow-primary z-10">
                <span className="material-symbols-outlined filled-icon text-4xl">favorite</span>
              </IconBox>
              
              <div className="absolute top-6 right-6">
                <IconBox tone="warning" size="md" className="rounded-full shadow-card-sm">
                  <span className="material-symbols-outlined text-xl">celebration</span>
                </IconBox>
              </div>
              <div className="absolute bottom-6 left-6">
                <IconBox tone="primary" size="md" className="rounded-full shadow-card-sm">
                  <span className="material-symbols-outlined text-xl">group</span>
                </IconBox>
              </div>
            </div>

            <h2 className="text-3xl font-black text-surface-2 text-center mb-4">
              {t('partner.successHeading')}
            </h2>
            <p className="text-base text-surface-2/60 text-center max-w-sm mb-10">
              {t('partner.successDescription')}
            </p>

            {/* Active bond card */}
            <Card variant="elevated" className="w-full flex items-center gap-4 mb-10 border-primary/20">
              <div className="flex -space-x-3">
                <div className="w-12 h-12 rounded-full border-2 border-surface-1 bg-primary/20 flex items-center justify-center overflow-hidden z-10 shadow-card-sm">
                  <span className="material-symbols-outlined text-primary">person</span>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-surface-1 bg-primary/20 flex items-center justify-center overflow-hidden z-0 shadow-card-sm">
                  <span className="material-symbols-outlined text-primary">person</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-primary uppercase tracking-wider">{t('partner.activeBond')}</p>
                <p className="text-xs text-surface-2/60 font-semibold">{t('partner.activeBondDesc')}</p>
              </div>
              <IconBox tone="success" size="sm" className="rounded-full">
                <span className="material-symbols-outlined filled-icon text-base">verified</span>
              </IconBox>
            </Card>
          </div>

          <div className="mt-auto space-y-4">
            <Button
              onClick={handleGoDashboard}
              size="lg"
              fullWidth
              endIcon={<span className="material-symbols-outlined">arrow_forward</span>}
            >
              {t('partner.goToDashboard')}
            </Button>
            <p className="text-[10px] font-black text-surface-2/30 text-center uppercase tracking-[0.2em]">{t('partner.startSharing')}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
