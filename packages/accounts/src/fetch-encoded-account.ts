import type { Address } from '@solana/addresses';
import type { Slot } from '@solana/rpc-core/dist/types/rpc-methods/common';
import type { GetAccountInfoApi } from '@solana/rpc-core/dist/types/rpc-methods/getAccountInfo';
import type { GetMultipleAccountsApi } from '@solana/rpc-core/dist/types/rpc-methods/getMultipleAccounts';
import type { Rpc } from '@solana/rpc-transport/dist/types/json-rpc-types';
import type { Commitment } from '@solana/rpc-types';

import type { MaybeEncodedAccount } from './maybe-account';
import { parseEncodedAccount } from './parse-encoded-account';

/** Optional configuration for fetching a singular account. */
export type FetchEncodedAccountConfig = {
    commitment?: Commitment;
    minContextSlot?: Slot;
    abortSignal?: AbortSignal;
};

/** Fetch an encoded account that may or may not exist using an RPC client. */
export async function fetchEncodedAccount<TAddress extends string = string>(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address<TAddress>,
    config: FetchEncodedAccountConfig = {}
): Promise<MaybeEncodedAccount<TAddress>> {
    const { abortSignal, ...rpcConfig } = config;
    const response = await rpc.getAccountInfo(address, { ...rpcConfig, encoding: 'base64' }).send({ abortSignal });
    return parseEncodedAccount(address, response.value);
}

/** Optional configuration for fetching multiple accounts. */
export type FetchEncodedAccountsConfig = {
    commitment?: Commitment;
    minContextSlot?: Slot;
    abortSignal?: AbortSignal;
};

/** Fetch multiple encoded accounts that may or may not exist using an RPC client. */
export async function fetchEncodedAccounts(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    config: FetchEncodedAccountsConfig = {}
): Promise<MaybeEncodedAccount[]> {
    const { abortSignal, ...rpcConfig } = config;
    const response = await rpc
        .getMultipleAccounts(addresses, { ...rpcConfig, encoding: 'base64' })
        .send({ abortSignal });
    return response.value.map((account, index) => parseEncodedAccount(addresses[index], account));
}
