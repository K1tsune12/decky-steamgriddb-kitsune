import { findInReactTree, findSP } from '@decky/ui';
import { RoutePatch, routerHook } from '@decky/api';

import { libraryAssetImageClasses, appportraitClasses, homeCarouselClasses, miscInfoClasses } from '../static-classes';
import { addStyle, removeStyle } from '../utils/styleInjector';

import { createTypePatcher, rerenderAfterPatchUpdate } from './patchUtils';

let patch: RoutePatch | undefined;

/*
  Calculating the same way Steam does it
  175/262.5 is a hardcoded value in the library code
  Used as a fallback for first (?) render while afterPatch runs to get width
  Might break if user is changing asset container sizes via CSS, but only once
 */
const calculateDefaultCapsuleWidth = (newHeight: number) => {
  const originalWidth = 175;
  const originalHeight = 262.5;
  const ratio = originalWidth / originalHeight;
  return newHeight * ratio;
};

/**
 * Returns the patched version of `original`, creating it only once per original function.
 * Handing the carousel a new function on every render makes it re-layout and jump back to the focused item.
 */
const getCachedPatch = <T extends (...args: any[]) => any>(cache: WeakMap<T, T>, original: T, createPatch: (original: T) => T): T => {
  if (cache.has(original)) return cache.get(original) as T;
  const patched = createPatch(original);
  cache.set(original, patched);
  cache.set(patched, patched);
  return patched;
};

export const addHomePatch = (mounting = false, square = false, matchFeatured = false, carouselLogo = false) => {
  if (square) {
    addStyle('sgdb-square-capsules-home', `
      /* only select home page */
      .${appportraitClasses.InRecentGames} .${libraryAssetImageClasses.Container}.${libraryAssetImageClasses.PortraitImage} {
        padding-top: 100% !important;
      }
    `);
  } else {
    removeStyle('sgdb-square-capsules-home');
  }

  if (carouselLogo) {
    addStyle('sgdb-carousel-logo', `
      .${homeCarouselClasses.CarouselGameLabelWrapper} {
        /* margin-top: -30px; */
      }
      /* allow drop-shadow to extend outside containers */
      .${homeCarouselClasses.CarouselGameLabelWrapper} .${miscInfoClasses.Container},
      .${homeCarouselClasses.CarouselGameLabelWrapper} > div > div { /* this is bleh */
        overflow: visible;
      }
      /* parent container of .sgdb-carousel-logo-container */
      .${homeCarouselClasses.CarouselGameLabelWrapper} .${miscInfoClasses.Content} {
        width: 100%; /* full width of capsule box so logo can be centered */
      }
      .sgdb-carousel-logo-container {
        width: inherit; /* inherit above */
        height: 39px; /* exact height of the replaced text box on unmodified steam css */
        filter: drop-shadow(0 1px 1px #000) drop-shadow(0 4px 6px rgba(255, 255, 255, .4));
        overflow: visible;
      }
      .sgdb-carousel-logo-img {
        height: 100%;
        width: 100%;
        object-fit: contain;
        object-position: center top;
      }
    `);
  } else {
    removeStyle('sgdb-carousel-logo');
  }

  const patchType = createTypePatcher();
  const rendererCache = new WeakMap<(...args: any[]) => any, (...args: any[]) => any>();
  const columnWidthCache = new WeakMap<(...args: any[]) => any, (...args: any[]) => any>();

  // Shared with the cached carousel callbacks, updated on every carousel render
  const carousel = {
    itemHeight: 0,
    hasSeparator: false,
    siblingWidth: 0,
  };

  const patchCarouselProps = (carouselProps: any) => {
    carousel.itemHeight = carouselProps.nItemHeight;
    // detected again by the item renderer, the separator isn't always there
    carousel.hasSeparator = false;

    /*
      Instead of hacking around with CSS to make the image square, make the featured
      item render the portrait component by changing the `bFeatured` flag to false.

      To get the first item in recents, Valve checks if the index is 0:
        `bFeatured: 0 === t,`
      Can't get the index of the element from `fnItemRenderer`, so we just just check if the current
      position of the item (`nLeft`) in the carousel is leftmost (0) or out of the screen (negative float)
    */
    carouselProps.fnItemRenderer = getCachedPatch(rendererCache, carouselProps.fnItemRenderer, (original) => (...args: any[]) => {
      const item = original(...args);
      if (!item?.props) return item;

      if (item.props.nLeft <= 0 && ('bFeatured' in item.props)) {
        item.props.bFeatured = !matchFeatured;
      }

      // find the separator item if it's there
      if (
        !('bFeatured' in item.props) &&
        item.props.focusable === false &&
        item.props.className?.includes(homeCarouselClasses.FeaturedSeparator)
      ) {
        carousel.hasSeparator = true;
      }
      return item;
    });

    /* Unminified version of `fnGetColumnWidth`:
      if (index === 0 && showFeaturedItem) {
        return (690 / 215) * nItemWidth;
      } else if (games[index] === 0) { // not so sure about this
        return 10;
      } else {
        return nItemWidth;
      }
    */
    carouselProps.fnGetColumnWidth = getCachedPatch(columnWidthCache, carouselProps.fnGetColumnWidth, (original) => (index: number, ...rest: any[]) => {
      const colWidth = original(index, ...rest);

      // width of a regular capsule, used for the featured one when matching it
      if ((carousel.hasSeparator && index === 2) || (!carousel.hasSeparator && index === 1)) {
        carousel.siblingWidth = colWidth;
      }

      // Leave horizontal grid as wide
      if (index === 0 && !matchFeatured) return colWidth;
      // the separator item should not be changed
      if (index === 1 && carousel.hasSeparator) return colWidth;

      /* this is how valve does it -.-
        height: a - parseInt(or().LabelHeight)
      */
      const capsuleHeight = carousel.itemHeight - parseInt(homeCarouselClasses.LabelHeight);
      if (square) return capsuleHeight;
      return carousel.siblingWidth || calculateDefaultCapsuleWidth(capsuleHeight);
    });
  };

  const patchCarousel = (_: any[], ret5?: any) => {
    const carouselProps = findInReactTree(ret5, (x) => x?.nItemHeight && x?.fnItemRenderer && x?.fnGetColumnWidth);
    if (carouselProps) patchCarouselProps(carouselProps);
    return ret5;
  };

  const patchRecentsList = (_: any[], ret4?: any) => {
    patchType(ret4, patchCarousel);
    return ret4;
  };

  const patchRecents = (_: any[], ret3?: any) => {
    const recentsList = findInReactTree(ret3, (x) => x?.props?.games && x?.props.onItemFocus);
    patchType(recentsList, patchRecentsList);
    return ret3;
  };

  const patchHomeContent = (_: any[], ret2?: any) => {
    const recents = findInReactTree(ret2, (x) => x?.props && ('autoFocus' in x.props) && ('showBackground' in x.props));
    patchType(recents, patchRecents);
    return ret2;
  };

  const patchHome = (_: any[], ret?: any) => {
    patchType(ret, patchHomeContent);
    return ret;
  };

  patch = routerHook.addPatch('/library/home', (props) => {
    patchType(props.children, patchHome);
    return props;
  });

  // ? Always rerender bc onMount users land here too.
  // rerenderAfterPatchUpdate();
  if (!mounting) rerenderAfterPatchUpdate();
};

export function removeHomePatch(unmounting = false): void {
  if (patch) {
    findSP().window.document.getElementById('sgdb-square-capsules-home')?.remove();
    routerHook.removePatch('/library/home', patch);
    patch = undefined;

    if (!unmounting) rerenderAfterPatchUpdate();
  }
}
