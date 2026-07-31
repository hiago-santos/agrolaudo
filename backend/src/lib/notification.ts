/**
 * Porta de notificação — hoje só loga no console do servidor (simula o envio).
 * Trocar por WhatsApp/e-mail de verdade (Z-API, Evolution API, Twilio...) depois é
 * escrever um novo adapter implementando essa interface e trocar uma linha no
 * container de dependências (app.ts); nada no resto do sistema muda.
 */
export interface NotificationPort {
  sendSignatureLink(params: { signatoryName: string; projectNumber: string; link: string }): Promise<void>;
}

export class ConsoleNotificationAdapter implements NotificationPort {
  async sendSignatureLink(params: {
    signatoryName: string;
    projectNumber: string;
    link: string;
  }): Promise<void> {
    console.log(
      `[NOTIFICATION/sandbox] Link de assinatura para ${params.signatoryName} — ` +
        `Projeto ${params.projectNumber}: ${params.link}`,
    );
  }
}

export const notificationPort: NotificationPort = new ConsoleNotificationAdapter();
