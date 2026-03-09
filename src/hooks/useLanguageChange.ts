import { useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import i18n from '../i18n';

export function useLanguageChange() {
  const [, setLocale] = useState(i18n.language);
  const router = useRouter();

  useEffect(() => {
    const handler = (locale: string) => {
      setLocale(locale);
      document.documentElement.lang = locale;
      void router?.invalidate();
    };
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, [router]);
}
