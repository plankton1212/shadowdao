import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      // Don't trigger with modifier keys (except for specific combos)
      if (e.metaKey || e.ctrlKey) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          navigate('/app/create');
          break;
        case 'p':
          e.preventDefault();
          navigate('/app/proposals');
          break;
        case 'd':
          e.preventDefault();
          navigate('/app/dashboard');
          break;
        case 's':
          e.preventDefault();
          navigate('/app/settings');
          break;
        case '?':
          // Could show a shortcuts modal later
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
