import { fakeRenderComponent } from '@decky/ui';

const getCurrentDispatcher = () => {
  const react = (window as any).SP_REACT;
  return react?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.H ??
    react?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher?.current;
};

/**
 * Safer version of `fakeRenderComponent` for finding Steam components by test rendering them.
 *
 * The @decky/ui version stubs the hooks of React's idle dispatcher, but it doesn't restore them when
 * the render throws and never restores `customHooks` at all. Either way Steam keeps the stubs until it
 * restarts, which breaks unrelated parts of the client.
 *
 * The stubs only apply outside of a React render, so this returns undefined when called during one.
 */
export default function safeFakeRender<T>(fn: (hooks: any) => T, customHooks: Record<string, any> = {}): T | undefined {
  let result: T | undefined;
  fakeRenderComponent((hooks: any) => {
    if (getCurrentDispatcher() && getCurrentDispatcher() !== hooks) return;

    const originalHooks: Record<string, any> = {};
    for (const key of Object.keys(customHooks)) {
      originalHooks[key] = hooks[key];
      hooks[key] = customHooks[key];
    }
    try {
      result = fn(hooks);
    } catch {
      result = undefined;
    } finally {
      Object.assign(hooks, originalHooks);
    }
  });
  return result;
}
