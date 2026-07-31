import QRCode from 'qrcode';

/** Data URI PNG do QR Code de verificação — embutido direto no PDF, sem host externo. */
export function generateQrCodeDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    margin: 1,
    width: 256,
    color: { dark: '#1E4D2B', light: '#FFFFFF' },
  });
}
