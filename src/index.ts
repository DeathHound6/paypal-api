import axios, { AxiosRequestConfig, Method, AxiosResponse } from 'axios';
import {

    // PAYPAL TYPES (obtained from GET requests)
    Product,
    Plan,
    Subscription,

    // PAYPAL-API LIB TYPES (used for POST requests)
    ProductCreateOptions,
    PlanCreateOptions,
    PlanCreateSuccess,
    SubscriptionCreateOptions,
    SubscriptionCreateSuccess,
    CapturePaymentOptions,
    PayoutCreateOptions,
    SubscriptionTransaction
} from './types'
import { Webhook, WebhookCreateOptions } from './types/Webhook';

interface PayPalOptions {
    sandboxMode: boolean;
    clientID: string;
    clientSecret: string;
};

interface AccessTokenData {
    value: string;
    expiresAt: number;
};

export = class PayPal {
    public sandboxMode: boolean;
    public clientID: string;
    public clientSecret: string;
    public baseURL: string;
    public accessToken?: AccessTokenData;
    public accessTokenPromise: Promise<void>;

    constructor (options: PayPalOptions) {
        this.sandboxMode = options.sandboxMode
        this.baseURL = this.sandboxMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
        this.clientID = options.clientID
        this.clientSecret = options.clientSecret

        this.accessTokenPromise = null
    }

    public async request (url: string, method: Method, options?: AxiosRequestConfig) {
        if (this.accessTokenPromise) await this.accessTokenPromise
        if (!this.accessToken || this.accessToken?.expiresAt <= Date.now()) await this.fetchToken()
        const defaultOptions = {
            headers: {
                Authorization: `Bearer ${this.accessToken.value}`
            }
        }
        const value = await axios(url, {
            ...{
                method
            },
            ...options,
            ...defaultOptions
        })
        return value
    }

    public fetchToken () : Promise<void> {
        this.accessTokenPromise = new Promise((resolve: Function) => {
            const params = new URLSearchParams()
            params.set('grant_type', 'client_credentials')
            axios(`${this.baseURL}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Accept-Language': 'en_US',
                    Authorization: 'Basic ' + Buffer.from(`${this.clientID}:${this.clientSecret}`).toString('base64')
                },
                data: params.toString()
            }).then((res: AxiosResponse) => {
                this.accessToken = {
                    value: res.data.access_token,
                    expiresAt: Date.now() + (res.data.expires_in)
                }
                resolve()
            })
        })
        return this.accessTokenPromise
    }

    async listProducts (): Promise<Product[]> {
        const res = await this.request(`${this.baseURL}/v1/catalogs/products?page_size=2&page=1&total_required=true`, 'GET')
        return res.data.products
    }

    async createProduct (data: Partial<ProductCreateOptions>): Promise<Product> {
        const res = await this.request(`${this.baseURL}/v1/catalogs/products`, 'POST', {
            data
        })
        return res.data
    }

    async listPlans (productID: string): Promise<Plan[]> {
        const res = await this.request(`${this.baseURL}/v1/billing/plans?product_id=${productID}&page_size=2&page=1&total_required=true`, 'GET')
        return res.data.plans
    }

    async createPlan (data: Partial<PlanCreateOptions>): Promise<PlanCreateSuccess> {
        const res = await this.request(`${this.baseURL}/v1/billing/plans`, 'POST', {
            data
        })
        return res.data
    }

    async createSubscription (data: Partial<SubscriptionCreateOptions>): Promise<SubscriptionCreateSuccess> {
        const res = await this.request(`${this.baseURL}/v1/billing/subscriptions`, 'POST', {
            data
        })
        return res.data
    }

    async getSubscription (subscriptionID: string): Promise<Subscription> {
        const res = await this.request(`${this.baseURL}/v1/billing/subscriptions/${subscriptionID}`, 'GET')
        return res.data
    }

    async cancelSubscription(subscriptionID: string): Promise<void> {
        const res = await this.request(`${this.baseURL}/v1/billing/subscriptions/${subscriptionID}/cancel`, 'POST')
        return res.data
    }

    async activateSubscription(subscriptionID: string): Promise<void> {
        const res = await this.request(`${this.baseURL}/v1/billing/subscriptions/${subscriptionID}/activate`, 'POST')
        return res.data
    }

    async listSubscriptionTransactions(subscriptionID: string, startTime: string, endTime: string): Promise<SubscriptionTransaction[]> {
        const res = await this.request(`${this.baseURL}/v1/billing/subscriptions/${subscriptionID}/transactions?start_time=${startTime}&end_time=${endTime}`, 'GET')
        return res.data
    }

    async capturePayment (subscriptionID: string, data: CapturePaymentOptions): Promise<string> {
        const res = await this.request(`${this.baseURL}/v1/billing/subscriptions/${subscriptionID}/capture`, 'POST', {
            data
        })
        return res.data
    }

    async listWebhooks (): Promise<Webhook[]> {
        const res = await this.request(`${this.baseURL}/v1/notifications/webhooks`, 'GET')
        return res.data.webhooks
    }

    async createWebhook (data: Partial<WebhookCreateOptions>): Promise<Webhook> {
        const res = await this.request(`${this.baseURL}/v1/notifications/webhooks`, 'POST', {
            data
        })
        return res.data
    }

    async deleteWebhook (webhookID: string): Promise<void> {
        await this.request(`${this.baseURL}/v1/notifications/webhooks/${webhookID}`, 'DELETE')
    }

    async createPayout (data: Partial<PayoutCreateOptions>): Promise<Partial<PayoutCreateOptions>> {
        const res = await this.request(`${this.baseURL}/v1/payments/payouts`, 'POST', {
            data
        })
        return res.data
    }
    
};
