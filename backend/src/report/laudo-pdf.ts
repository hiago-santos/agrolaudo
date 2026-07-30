import puppeteer, { type Browser } from 'puppeteer';

/**
 * Um único Chromium reaproveitado entre requisições — lançar o browser do zero a
 * cada laudo custa ~1-2s e não escala para 100 laudos/mês emitidos em rajadas.
 * `fecharBrowserPdf()` é chamado no `onClose` do Fastify (ver app.ts) pra encerrar
 * limpo no shutdown.
 */
let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  browserPromise ??= puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  return browserPromise;
}

export async function renderHtmlParaPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // HTML autocontido (CSS inline, QR em data URI) — 'load' basta, não há rede a esperar.
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBytes = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return Buffer.from(pdfBytes);
  } finally {
    await page.close();
  }
}

export async function fecharBrowserPdf(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  await browser.close();
  browserPromise = null;
}
