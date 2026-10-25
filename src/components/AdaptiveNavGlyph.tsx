import { Module, findModuleByExport } from '@decky/ui';
import { ComponentType, FC, useEffect, useState } from 'react';

import safeFakeRender from '../utils/safeFakeRender';

type AdaptiveNavGlyphProps = {
  button: number;
  bAllowKeyboard?: boolean;
  bKnockout?: boolean;
  className?: string;
};

const findAdaptiveNavGlyph = () => {
  // Only components from the glyph module itself are test rendered.
  // Older clients needed a fallback that test rendered unrelated Steam components,
  // so when the module isn't found the glyph is just not shown.
  const glyphModule = findModuleByExport((e) => typeof e === 'function' && e.toString().includes('GamepadUI_KeyboardNavGlyphsDisabled'));
  if (!glyphModule) return undefined;

  return Object.values(glyphModule).find((mod: Module) => {
    if (typeof mod?.type !== 'function') return false;

    return safeFakeRender(() => {
      const rendered = mod.type({
        button: 2,
        bAllowKeyboard: false,
      });
      const props = rendered?.props;
      return props != null &&
            'controllerType' in props &&
            'controllerStyle' in props &&
            'controllerSource' in props &&
            'controllerModeInput' in props;
    }, { useSyncExternalStore: (_: any, x: () => any) => x?.() }) ?? false;
  }) as ComponentType<AdaptiveNavGlyphProps> | undefined;
};

// null means not looked up yet, undefined means not found
let Glyph: ComponentType<AdaptiveNavGlyphProps> | undefined | null = null;

/**
 * Looks up Steam's glyph component. Must run outside of a React render,
 * it's called once Steam is idle after startup so the module scan doesn't slow down boot.
 */
export const resolveAdaptiveNavGlyph = () => {
  if (Glyph === null) Glyph = findAdaptiveNavGlyph();
  return Glyph;
};

const AdaptiveNavGlyph: FC<AdaptiveNavGlyphProps> = (props) => {
  const [Component, setComponent] = useState(() => Glyph);

  useEffect(() => {
    // Opened before the idle lookup ran, effects run outside of render so it's safe to look it up here
    if (Component === null) setComponent(() => resolveAdaptiveNavGlyph());
  }, [Component]);

  return Component ? <Component {...props} /> : null;
};

export default AdaptiveNavGlyph;
