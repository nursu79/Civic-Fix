import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_MS = 2 * 60 * 1000; // 2 minutes before timeout

export function useSessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const locale = useLocale();

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login?expired=true`);
  }, [supabase, router, locale]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    
    setShowWarning(false);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
    }, TIMEOUT_MS - WARNING_MS);

    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    // Only set up listeners if we have an active session
    let isActive = false;
    
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        isActive = true;
        resetTimer();
        
        // Listeners for user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        const handleActivity = () => {
          if (!showWarning) {
            resetTimer();
          }
        };

        events.forEach(event => {
          window.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
          events.forEach(event => {
            window.removeEventListener(event, handleActivity);
          });
        };
      }
    };
    
    checkSession();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer, supabase, showWarning]);

  return {
    showWarning,
    extendSession: async () => {
      // Force refresh the token
      await supabase.auth.getSession();
      resetTimer();
    }
  };
}
