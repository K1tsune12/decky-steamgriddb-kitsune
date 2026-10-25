import { showModal, ModalRoot } from '@decky/ui';

const showQrModal = async (url: string) => {
  // Loaded on demand to keep plugin startup light
  const { QRCodeSVG } = await import('qrcode.react');
  showModal(
    <ModalRoot>
      <QRCodeSVG
        style={{ margin: '0 auto 1.5em auto' }}
        value={url}
        includeMargin
        size={256}
      />
      <span style={{ textAlign: 'center', wordBreak: 'break-word' }}>{url}</span>
    </ModalRoot>,
    window
  );
};

export default showQrModal;
