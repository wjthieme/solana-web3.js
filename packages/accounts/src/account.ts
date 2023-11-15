import { Address } from '@solana/addresses';

import { AccountHeader } from './account-header';

/** Defines a Solana account with its generic details and parsed or encoded data. */
export type Account<TData extends object | Uint8Array, TAddress extends string = string> = AccountHeader & {
    readonly address: Address<TAddress>;
    readonly data: TData;
};

/** Defines a Solana account with its generic details and encoded data. */
export type EncodedAccount<TAddress extends string = string> = Account<Uint8Array, TAddress>;
