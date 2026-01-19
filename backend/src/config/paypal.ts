import * as paypal from '@paypal/checkout-server-sdk';

class PayPalClientWrapper {
  private client: any;

  constructor() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox';

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials are required. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment variables.');
    }

    // Create environment based on mode
    const environment = mode === 'live'
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);

    // Create PayPal HTTP client
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  getClient(): any {
    return this.client;
  }
}

export default new PayPalClientWrapper();
