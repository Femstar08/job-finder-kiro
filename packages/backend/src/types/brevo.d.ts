declare module '@getbrevo/brevo' {
  export class ApiClient {
    static instance: ApiClient;
    authentications: {
      'api-key': {
        apiKey: string;
      };
    };
  }

  export class SendSmtpEmail {
    sender?: {
      email: string;
      name: string;
    };
    to?: Array<{ email: string; name?: string }>;
    subject?: string;
    htmlContent?: string;
    textContent?: string;
  }

  export class SendTransacSms {
    sender?: string;
    recipient?: string;
    content?: string;
    type?: string;
  }

  export class TransactionalEmailsApi {
    sendTransacEmail(sendSmtpEmail: SendSmtpEmail): Promise<{
      messageId: string;
    }>;
  }

  export class TransactionalSMSApi {
    sendTransacSms(sendTransacSms: SendTransacSms): Promise<{
      reference: string;
    }>;
  }
}