import {
  ModalRoot,
  DialogButton,
  DialogButtonPrimary,
  joinClassNames,
  Focusable,
  Navigation,
} from '@decky/ui';
import { FC, MouseEvent, useState } from 'react';

import Asset, { AssetProps } from '../components/asset/Asset';
import Markdown from '../components/Markdown';
import t from '../utils/i18n';
import { SGDB_ASSET_TYPE_READABLE, SGDB_MIME_MAP } from '../constants';

const APPLY_AS_ASSET_TYPES: SGDBAssetType[] = ['grid_p', 'grid_l', 'hero', 'logo'];

const DetailsModal: FC<{
  closeModal?: () => void,
  asset: any,
  assetType: SGDBAssetType,
  onAssetChange?: () => Promise<any>,
  onApplyAs?: (assetType: SGDBAssetType) => Promise<any>,
  assetProps?: Partial<AssetProps>
}> = ({ closeModal, asset, assetType, onAssetChange, onApplyAs, assetProps }) => {
  const [downloading, setDownloading] = useState(false); // props don't update in modals, need to repeat this here

  // Some games only have one kind of artwork, allow using it for the others too.
  // Icons are left out, their size is too different to be useful anywhere else.
  const otherAssetTypes = assetType === 'icon' ? [] : APPLY_AS_ASSET_TYPES.filter((type) => type !== assetType);

  const handleDownload = async (evt: Event | MouseEvent) => {
    evt.preventDefault();
    setDownloading(true);
    await onAssetChange?.();
    setDownloading(false);
  };

  const handleApplyAs = async (targetType: SGDBAssetType) => {
    setDownloading(true);
    await onApplyAs?.(targetType);
    setDownloading(false);
  };

  return (
    <ModalRoot
      className="sgdb-modal sgdb-modal-details"
      closeModal={closeModal}
      bDisableBackgroundDismiss={false}
      bHideCloseIcon={false}
    >
      <div className={joinClassNames('sgdb-modal-details-wrapper', asset.width > asset.height ? 'wide' : '')}>
        <Asset
          src={asset.url}
          width={asset.width}
          height={asset.height}
          assetType={assetType}
          isAnimated={false}
          isDownloading={downloading}
          onClick={handleDownload}
          {...assetProps}
        />
        <div className="info">
          <DialogButtonPrimary
            onClick={handleDownload}
            onOKActionDescription={t('ACTION_ASSET_APPLY', 'Apply {assetType}').replace('{assetType}', SGDB_ASSET_TYPE_READABLE[assetType])}
          >
            {t('ACTION_ASSET_APPLY', 'Apply {assetType}').replace('{assetType}', SGDB_ASSET_TYPE_READABLE[assetType])}
          </DialogButtonPrimary>
          {onApplyAs && otherAssetTypes.length > 0 && (
            <Focusable className="apply-as" flow-children="row">
              {otherAssetTypes.map((type) => (
                <DialogButton
                  key={type}
                  disabled={downloading}
                  onClick={() => handleApplyAs(type)}
                  onOKActionDescription={t('ACTION_ASSET_APPLY_AS', 'Use as {assetType}').replace('{assetType}', SGDB_ASSET_TYPE_READABLE[type])}
                >
                  {t('ACTION_ASSET_APPLY_AS', 'Use as {assetType}').replace('{assetType}', SGDB_ASSET_TYPE_READABLE[type])}
                </DialogButton>
              ))}
            </Focusable>
          )}
          <span className="meta">
            {[
              SGDB_MIME_MAP[asset.mime] || asset.mime,
              asset.style.replace(/_/g, ' '),
              asset.width > 0 ? `${asset.width}×${asset.height}` : undefined,
            ].filter(Boolean).join(' • ')}
          </span>
          <Focusable className="author" onActivate={() => {
            Navigation.NavigateToExternalWeb(`https://steamcommunity.com/profiles/${asset.author.steam64}`);
            closeModal?.();
          }}
          >
            <img src={asset.author.avatar} alt="" />
            <span>{asset.author.name}</span>
          </Focusable>
          {asset.notes && (
            <Markdown
              onLinkClick={closeModal}
              focusableProps={{ className: 'notes' }}
            >
              {asset.notes}
            </Markdown>
          )}
        </div>
      </div>
    </ModalRoot>
  );
};

export default DetailsModal;
