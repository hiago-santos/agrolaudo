/**
 * Porta de notificação — hoje só loga no console do servidor (simula o envio).
 * Trocar por WhatsApp/e-mail de verdade (Z-API, Evolution API, Twilio...) depois é
 * escrever um novo adapter implementando essa interface e trocar uma linha no
 * container de dependências (app.ts); nada no resto do sistema muda.
 */
export interface NotificacaoPort {
  enviarLinkAssinatura(params: {
    nomeSignatario: string;
    laudoNumero: string;
    link: string;
  }): Promise<void>;
}

export class ConsoleNotificacaoAdapter implements NotificacaoPort {
  async enviarLinkAssinatura(params: {
    nomeSignatario: string;
    laudoNumero: string;
    link: string;
  }): Promise<void> {
    console.log(
      `[NOTIFICACAO/sandbox] Link de assinatura para ${params.nomeSignatario} — ` +
        `Laudo ${params.laudoNumero}: ${params.link}`,
    );
  }
}

export const notificacaoPort: NotificacaoPort = new ConsoleNotificacaoAdapter();
