import { useEffect, useRef } from 'react';

/**
 * Hook that shows a confirmation dialog when the user tries to:
 * - Close the browser tab
 * - Navigate away via browser back/forward
 * - Click a link that leaves the page
 *
 * @param isActive - Whether to guard navigation (e.g., when in a call)
 * @param message - Optional custom message (note: most browsers ignore custom messages for security)
 */
export function useNavigationGuard(isActive: boolean, message?: string) {
  const warningMessage = message || 'You are currently in a call. Are you sure you want to leave?';

  // Use ref to always have current value in event handlers
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const messageRef = useRef(warningMessage);
  messageRef.current = warningMessage;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isActiveRef.current) return;

      event.preventDefault();
      event.returnValue = messageRef.current;
    };

    const handleClick = (event: MouseEvent) => {
      if (!isActiveRef.current) return;

      const target = event.target as HTMLElement;
      const anchor = target.closest('a');

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip if opening in new tab
      if (anchor.target === '_blank') return;

      // Skip hash links on same page
      if (href.startsWith('#')) return;

      // Skip javascript: links
      if (href.startsWith('javascript:')) return;

      const confirmed = window.confirm(messageRef.current);
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const handlePopState = () => {
      if (!isActiveRef.current) return;

      const confirmed = window.confirm(messageRef.current);
      if (!confirmed) {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
