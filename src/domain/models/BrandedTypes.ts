export type Branded<T, S extends symbol> = T & { readonly [K in S]: S };

export declare const __contactId: unique symbol;
export declare const __campaignId: unique symbol;

export type ContactId = Branded<string, typeof __contactId>;
export type CampaignId = Branded<string, typeof __campaignId>;
