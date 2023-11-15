import type { Address } from '@solana/addresses';
import { getBase58Encoder, getBase64Encoder } from '@solana/codecs-strings';
import type {
    AccountInfoBase,
    AccountInfoWithBase58Bytes,
    AccountInfoWithBase58EncodedData,
    AccountInfoWithBase64EncodedData,
} from '@solana/rpc-core/dist/types/rpc-methods/common';

import type { EncodedAccount } from './account';
import { MaybeEncodedAccount } from './maybe-account';

type RpcAccount = AccountInfoBase &
    (AccountInfoWithBase58Bytes | AccountInfoWithBase58EncodedData | AccountInfoWithBase64EncodedData);

/** Parse an account object received from an RPC call into an EncodedAccount or MaybeEncodedAccount type. */
export function parseEncodedAccount<TAddress extends string = string>(
    address: Address<TAddress>,
    rpcAccount: RpcAccount
): EncodedAccount<TAddress>;
export function parseEncodedAccount<TAddress extends string = string>(
    address: Address<TAddress>,
    rpcAccount: RpcAccount | null
): MaybeEncodedAccount<TAddress>;
export function parseEncodedAccount<TAddress extends string = string>(
    address: Address<TAddress>,
    rpcAccount: RpcAccount | null
): EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress> {
    if (!rpcAccount) return Object.freeze({ address, exists: false });

    const data = (() => {
        if (typeof rpcAccount.data === 'string') return getBase58Encoder().encode(rpcAccount.data);
        if (rpcAccount.data[1] === 'base58') return getBase58Encoder().encode(rpcAccount.data[0]);
        if (rpcAccount.data[1] === 'base64') return getBase64Encoder().encode(rpcAccount.data[0]);
        // TODO: Coded error.
        throw new Error(`Unexpected account data format: ${rpcAccount.data}`);
    })();

    return Object.freeze({
        address,
        data,
        executable: rpcAccount.executable,
        exists: true,
        lamports: rpcAccount.lamports,
        programAddress: rpcAccount.owner,
        rentEpoch: rpcAccount.rentEpoch,
    });
}
