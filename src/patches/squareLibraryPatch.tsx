import {
  findInTree,
  findInReactTree,
  findSP,
} from '@decky/ui';
import { RoutePatch, routerHook } from '@decky/api';

import { gamepadLibraryClasses, libraryAssetImageClasses } from '../static-classes';
import { addStyle } from '../utils/styleInjector';

import { createTypePatcher, rerenderAfterPatchUpdate } from './patchUtils';

let patch: RoutePatch | undefined;

// Stringifying a component is slow and this runs on every library render, so remember the result per type
const coverSizeTypeCache = new WeakMap<object, boolean>();
const isCoverSizeType = (type: any) => {
  if (typeof type !== 'function' && typeof type !== 'object') return false;
  const cached = coverSizeTypeCache.get(type);
  if (cached !== undefined) return cached;
  const result: boolean = type.toString().includes('coverSize');
  coverSizeTypeCache.set(type, result);
  return result;
};

const patchGridProps = (props: any) => {
  const gridProps = findInTree(props, (x) => x?.childWidth, { walkable: ['props', 'children', 'childSections'] });
  if (gridProps) {
    gridProps.childHeight = gridProps.childWidth;
  }
};

export const addSquareLibraryPatch = (mounting = false) => {
  addStyle('sgdb-square-capsules-library', `
    .${gamepadLibraryClasses.GamepadLibrary} .${libraryAssetImageClasses.Container}.${libraryAssetImageClasses.PortraitImage} {
      padding-top: 100% !important;
      height: 0 !important;
    }
  `);

  // Reuses one patched type per component so tabs aren't remounted on every render (infinite refresh, #138)
  const patchType = createTypePatcher();

  const patchGrid = (_: any[], ret?: any) => {
    patchGridProps(ret); // Modifying the rendered output fixes the selection border
    return ret;
  };

  const patchInnerCollection = (_: any[], ret6?: any) => {
    // Patch the grid inside the collection
    patchType(findInReactTree(ret6, (x) => x?.type && x.props?.appOverviews), patchGrid);
    return ret6;
  };

  const patchCollectionContainer = (_: any[], ret5?: any) => {
    patchType(findInReactTree(ret5, (x) => x?.type && x.props?.collection?.id), patchInnerCollection);
    return ret5;
  };

  const patchTabContent = (_: any[], ret4?: any) => {
    if (!ret4) return ret4;

    const p1 = findInReactTree(ret4, (x) => x?.type && x.props?.appOverviews);
    if (p1) {
      // Main Library (Installed, All Games)
      // Patch component type so we can intercept the OUTPUT
      patchType(p1, patchGrid);
    } else if (findInReactTree(ret4.props?.children, (x) => x?.type && isCoverSizeType(x.type))) {
      // collections overview page
      return ret4;
    } else if (ret4.props?.children?.[0]?.props?.collectionid) {
      // User Collections
      patchType(ret4.props.children[0], patchCollectionContainer);
    } else {
      // Non-Steam Shortcuts
      const p2 = findInReactTree(ret4, (x) => x?.type && x.props?.collection?.id === 'deck-desktop-apps');
      patchType(p2, patchCollectionContainer);
    }
    return ret4;
  };

  const patchTabs = (_: any[], ret3?: any) => {
    const { tabs, activeTab } = findInReactTree(ret3, (x) => x?.tabs && x?.activeTab) ?? {};
    const tab = tabs?.find((x: any) => x.id == activeTab);

    if (!tab || tab.content.props?.collectionid === null) {
      return ret3;
    }

    if (tab.content.props.children || tab.content.props.collection || tab.content.type) {
      patchType(tab.content.props?.children || tab.content, patchTabContent);
    }
    return ret3;
  };

  const patchTabsWrapper = (_: any[], ret2?: any) => {
    patchType(ret2, patchTabs);
    return ret2;
  };

  const patchLibrary = (_: any[], ret?: any) => {
    patchType(ret, patchTabsWrapper);
    return ret;
  };

  patch = routerHook.addPatch('/library', (props) => {
    patchType(props.children, patchLibrary);
    return props;
  });

  if (!mounting) rerenderAfterPatchUpdate();
};

export function removeSquareLibraryPatch(unmounting = false): void {
  if (patch) {
    findSP().window.document.getElementById('sgdb-square-capsules-library')?.remove();
    routerHook.removePatch('/library', patch);
    patch = undefined;

    if (!unmounting) rerenderAfterPatchUpdate();
  }
}
