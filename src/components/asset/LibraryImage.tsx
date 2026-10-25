import { FC, CSSProperties } from 'react';
import { findModuleExport, Export } from '@decky/ui';

export interface LibraryImageProps {
  app?: AppStoreAppOverview;
  rgSources?: any;
  appid?: number;
  eAssetType: eAssetType;
  className?: string;
  imageClassName?: string;
  allowCustomization?: boolean;
  neverShowTitle?: boolean;
  name?: string;
  suppressTransitions?: boolean;
  bShortDisplay?: boolean;
  backgroundType?: 'transparent';
  onIncrementalError?: (evt: Event, t: any, r: any) => void;
  onLoad?: (evt: Event) => void;
  onError?: (evt: Event) => void;
  style?: CSSProperties;
}

// Resolved on first render instead of at plugin load, the module scan is expensive during Steam startup
let SteamLibraryImage: FC<LibraryImageProps> | undefined | null = null;

const LibraryImage: FC<LibraryImageProps> = (props) => {
  if (SteamLibraryImage === null) {
    SteamLibraryImage = findModuleExport((e: Export) => e?.toString && e.toString().includes('Either rgSources or app must be specified'));
  }
  return SteamLibraryImage ? <SteamLibraryImage {...props} /> : null;
};

export default LibraryImage;
