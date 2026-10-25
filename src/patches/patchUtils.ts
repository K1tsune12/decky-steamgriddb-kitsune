import { Navigation, afterPatch } from '@decky/ui';

export function rerenderAfterPatchUpdate(): void {
  if (window.location.pathname.startsWith('/routes/library/home')) {
    Navigation.Navigate('/library/home');
    // ? We need to navigate back to not clog up the nav.
    Navigation.NavigateBack();
  } else if (window.location.pathname.startsWith('/routes/library')) {
    Navigation.Navigate('/library');
    // ? We need to navigate back to not clog up the nav.
    Navigation.NavigateBack();
  }
}

export type TypePatcher = (element: any, handler: (args: any[], ret: any) => any) => void;

/**
 * Creates a function that patches the component type of a React element.
 *
 * Each original component type is patched only once and every later render reuses that same patched type.
 * Patching a fresh copy on every render gives React a new component type each time, which makes it remount
 * the whole subtree (losing focus, scroll and tab state) and can loop forever.
 *
 * The handler of the first patch is the one that sticks, so handlers must not rely on per render variables.
 * Create a new patcher whenever the patch is (re)applied.
 */
export function createTypePatcher(): TypePatcher {
  const cache = new WeakMap<object, any>();

  return (element, handler) => {
    const original = element?.type;
    if (!original || (typeof original !== 'function' && typeof original !== 'object')) return;

    let patched = cache.get(original);
    if (!patched) {
      if (typeof original === 'function') {
        // plain function component
        const holder = { type: original };
        afterPatch(holder, 'type', handler);
        patched = holder.type;
      } else if (typeof original.type === 'function') {
        // memo component, patch a copy so the original stays untouched
        patched = { ...original };
        afterPatch(patched, 'type', handler);
      } else {
        return;
      }
      cache.set(original, patched);
      // the element may already carry the patched type on later renders
      cache.set(patched, patched);
    }
    element.type = patched;
  };
}
