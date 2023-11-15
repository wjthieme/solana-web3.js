import { Address } from '@solana/addresses';
import { LamportsUnsafeBeyond2Pow53Minus1 } from '@solana/rpc-types';

/** The amount of bytes required to store the account header. */
export const ACCOUNT_HEADER_SIZE = 128;

/** Describe the generic account details applicable to every account. */
export type AccountHeader = {
    readonly programAddress: Address;
    readonly executable: boolean;
    readonly lamports: LamportsUnsafeBeyond2Pow53Minus1;
    readonly rentEpoch?: bigint;
};
