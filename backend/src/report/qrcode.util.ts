import QRCode from 'qrcode';

/** Data URI PNG do QR Code de verificação — embutido direto no HTML/PDF, sem host externo. */
export function gerarQrCodeDataUrl(conteudo: string): Promise<string> {
  return QRCode.toDataURL(conteudo, {
    margin: 1,
    width: 256,
    color: { dark: '#1E4D2B', light: '#FFFFFF' },
  });
}
