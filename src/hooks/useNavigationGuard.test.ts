import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNavigationGuard } from './useNavigationGuard';

describe('useNavigationGuard', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let documentAddEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let documentRemoveEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    documentAddEventListenerSpy = vi.spyOn(document, 'addEventListener');
    documentRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('event listener registration', () => {
    it('registers beforeunload listener on window', () => {
      renderHook(() => useNavigationGuard(true));

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('registers click listener on document with capture', () => {
      renderHook(() => useNavigationGuard(true));

      expect(documentAddEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
    });

    it('registers popstate listener on window', () => {
      renderHook(() => useNavigationGuard(true));

      expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('pushes initial history state', () => {
      renderHook(() => useNavigationGuard(true));

      expect(pushStateSpy).toHaveBeenCalledWith(null, '', window.location.href);
    });
  });

  describe('cleanup', () => {
    it('removes all event listeners on unmount', () => {
      const { unmount } = renderHook(() => useNavigationGuard(true));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        true
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
  });

  describe('beforeunload handler', () => {
    it('prevents unload when active', () => {
      renderHook(() => useNavigationGuard(true));

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1] as EventListener;

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      // returnValue is set (browsers may coerce to boolean)
      expect(event.returnValue).toBeTruthy();
    });

    it('does not prevent unload when not active', () => {
      renderHook(() => useNavigationGuard(false));

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1] as EventListener;

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      handler(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('uses custom message in confirm dialogs', () => {
      renderHook(() => useNavigationGuard(true, 'Custom warning!'));

      // Test with click handler which uses confirm() with the message
      const handler = documentAddEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'click'
      )?.[1] as EventListener;

      const anchor = document.createElement('a');
      anchor.href = '/other-page';
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: anchor });

      handler(event);

      expect(confirmSpy).toHaveBeenCalledWith('Custom warning!');
    });
  });

  describe('click handler', () => {
    function createAnchorClickEvent(href: string, target?: string): MouseEvent {
      const anchor = document.createElement('a');
      anchor.href = href;
      if (target) {
        anchor.target = target;
      }
      document.body.appendChild(anchor);

      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'target', { value: anchor });

      return event;
    }

    it('shows confirm dialog when clicking link while active', () => {
      renderHook(() => useNavigationGuard(true));

      const handler = documentAddEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'click'
      )?.[1] as EventListener;

      const event = createAnchorClickEvent('/other-page');
      handler(event);

      expect(confirmSpy).toHaveBeenCalledWith(
        'You are currently in a call. Are you sure you want to leave?'
      );
    });

    it('prevents navigation when user cancels', () => {
      confirmSpy.mockReturnValue(false);

      renderHook(() => useNavigationGuard(true));

      const handler = documentAddEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'click'
      )?.[1] as EventListener;

      const event = createAnchorClickEvent('/other-page');
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('allows navigation when user confirms', () => {
      confirmSpy.mockReturnValue(true);

      renderHook(() => useNavigationGuard(true));

      const handler = documentAddEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'click'
      )?.[1] as EventListener;

      const event = createAnchorClickEvent('/other-page');
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      handler(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('does not show confirm for non-anchor elements', () => {
      renderHook(() => useNavigationGuard(true));

      const handler = documentAddEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'click'
      )?.[1] as EventListener;

      const button = document.createElement('button');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: button });

      handler(event);

      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('skips links opening in new tab (_blank)', () => {
      renderHook(() => useNavigationGuard(true));

      const handler = documentAddEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'click'
      )?.[1] as EventListener;

      const event = createAnchorClickEvent('/other-page', '_blank');
      handler(event);

      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('skips hash links', () => {
      renderHook(() => useNavigationGuard(true));

      const handler = documentAddEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'click'
      )?.[1] as EventListener;

      const event = createAnchorClickEvent('#section');
      handler(event);

      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('skips javascript: links', () => {
      renderHook(() => useNavigationGuard(true));

      const handler = documentAddEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'click'
      )?.[1] as EventListener;

      const event = createAnchorClickEvent('javascript:void(0)');
      handler(event);

      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('does not show confirm when not active', () => {
      renderHook(() => useNavigationGuard(false));

      const handler = documentAddEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'click'
      )?.[1] as EventListener;

      const event = createAnchorClickEvent('/other-page');
      handler(event);

      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe('popstate handler (back/forward)', () => {
    it('shows confirm dialog on popstate when active', () => {
      renderHook(() => useNavigationGuard(true));

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'popstate'
      )?.[1] as EventListener;

      handler(new PopStateEvent('popstate'));

      expect(confirmSpy).toHaveBeenCalled();
    });

    it('pushes state back when user cancels', () => {
      confirmSpy.mockReturnValue(false);
      pushStateSpy.mockClear();

      renderHook(() => useNavigationGuard(true));

      // Clear the initial pushState call
      pushStateSpy.mockClear();

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'popstate'
      )?.[1] as EventListener;

      handler(new PopStateEvent('popstate'));

      expect(pushStateSpy).toHaveBeenCalledWith(null, '', window.location.href);
    });

    it('does not push state when user confirms', () => {
      confirmSpy.mockReturnValue(true);

      renderHook(() => useNavigationGuard(true));

      pushStateSpy.mockClear();

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'popstate'
      )?.[1] as EventListener;

      handler(new PopStateEvent('popstate'));

      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it('does not show confirm when not active', () => {
      renderHook(() => useNavigationGuard(false));

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'popstate'
      )?.[1] as EventListener;

      handler(new PopStateEvent('popstate'));

      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe('active state changes', () => {
    it('respects changes to isActive', () => {
      const { rerender } = renderHook(({ isActive }) => useNavigationGuard(isActive), {
        initialProps: { isActive: false },
      });

      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1] as EventListener;

      // Initially not active
      const event1 = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy1 = vi.spyOn(event1, 'preventDefault');
      beforeUnloadHandler(event1);
      expect(preventDefaultSpy1).not.toHaveBeenCalled();

      // Become active
      rerender({ isActive: true });

      const event2 = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy2 = vi.spyOn(event2, 'preventDefault');
      beforeUnloadHandler(event2);
      expect(preventDefaultSpy2).toHaveBeenCalled();
    });
  });
});
