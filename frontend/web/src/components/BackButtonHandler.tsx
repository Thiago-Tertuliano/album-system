import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BackButtonHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    let unregister: (() => void) | undefined;

    async function setup() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        const handler = await App.addListener('backButton', () => {
          navigate(-1);
        });
        unregister = handler.remove;
      } catch {
        /* web-only */
      }
    }

    setup();

    return () => {
      unregister?.();
    };
  }, [navigate]);

  return null;
}
