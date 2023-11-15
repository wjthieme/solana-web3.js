import 'test-matchers/toBeFrozenObject';

import type { Address } from '@solana/addresses';
import type {
    AccountInfoBase,
    AccountInfoWithBase58Bytes,
    AccountInfoWithBase58EncodedData,
    AccountInfoWithBase64EncodedData,
} from '@solana/rpc-core/dist/types/rpc-methods/common';

import { EncodedAccount } from '../account';
import { MaybeEncodedAccount } from '../maybe-account';
import { parseEncodedAccount } from '../parse-encoded-account';

describe('parseEncodedAccount', () => {
    it('parses an encoded account with base64 data', () => {
        // Given an address and an RPC account with base64 data.
        const address = '1111' as Address<'1111'>;
        const rpcAccount = <AccountInfoBase & AccountInfoWithBase64EncodedData>{
            data: ['somedata', 'base64'],
            executable: false,
            lamports: 1_000_000_000n,
            owner: '9999',
            rentEpoch: 42n,
        };

        // When we parse that RPC account using the parseEncodedAccount function.
        const account = parseEncodedAccount(address, rpcAccount);

        // Then we expect account to be an EncodedAccount.
        account satisfies EncodedAccount;

        // And we expect the following parsed encoded account to be returned.
        expect(account).toStrictEqual({
            address: '1111',
            data: new Uint8Array([178, 137, 158, 117, 171, 90]),
            executable: false,
            exists: true,
            lamports: 1_000_000_000n,
            programAddress: '9999',
            rentEpoch: 42n,
        });
    });

    it('parses an encoded account with base58 data', () => {
        // Given an address and an RPC account with base58 data.
        const address = '1111' as Address<'1111'>;
        const rpcAccount = <AccountInfoBase & AccountInfoWithBase58EncodedData>{
            data: ['somedata', 'base58'],
            executable: false,
            lamports: 1_000_000_000n,
            owner: '9999',
            rentEpoch: 42n,
        };

        // When we parse that RPC account using the parseEncodedAccount function.
        const account = parseEncodedAccount(address, rpcAccount);

        // Then we expect account to be an EncodedAccount.
        account satisfies EncodedAccount;

        // And we expect the following parsed encoded account to be returned.
        expect(account).toStrictEqual({
            address: '1111',
            data: new Uint8Array([102, 6, 221, 155, 82, 67]),
            executable: false,
            exists: true,
            lamports: 1_000_000_000n,
            programAddress: '9999',
            rentEpoch: 42n,
        });
    });

    it('parses an encoded account with implicit base58 data', () => {
        // Given an address and an RPC account with implicit base58 data.
        const address = '1111' as Address<'1111'>;
        const rpcAccount = <AccountInfoBase & AccountInfoWithBase58Bytes>{
            data: 'somedata',
            executable: false,
            lamports: 1_000_000_000n,
            owner: '9999',
            rentEpoch: 42n,
        };

        // When we parse that RPC account using the parseEncodedAccount function.
        const account = parseEncodedAccount(address, rpcAccount);

        // Then we expect account to be an EncodedAccount.
        account satisfies EncodedAccount;

        // And we expect the following parsed encoded account to be returned.
        expect(account).toStrictEqual({
            address: '1111',
            data: new Uint8Array([102, 6, 221, 155, 82, 67]),
            executable: false,
            exists: true,
            lamports: 1_000_000_000n,
            programAddress: '9999',
            rentEpoch: 42n,
        });
    });

    it('parses an empty account', () => {
        // Given an address with no matching RPC account.
        const address = '1111' as Address<'1111'>;

        // When we parse null for that address using the parseEncodedAccount function.
        const account = parseEncodedAccount(address, null);

        // Then we expect account to be a MaybeEncodedAccount.
        account satisfies MaybeEncodedAccount;

        // And we expect the following parsed data to be returned.
        expect(account).toStrictEqual({ address: '1111', exists: false });
    });

    it('freezes the returned encoded account', () => {
        // Given an address and an RPC account with base64 data.
        const address = '1111' as Address<'1111'>;
        const rpcAccount = <AccountInfoBase & AccountInfoWithBase64EncodedData>{
            data: ['somedata', 'base64'],
            executable: false,
            lamports: 1_000_000_000n,
            owner: '9999',
            rentEpoch: 42n,
        };

        // When we parse that RPC account using the parseEncodedAccount function.
        const account = parseEncodedAccount(address, rpcAccount);

        // Then we expect the returned account to be frozen.
        expect(account).toBeFrozenObject();
    });

    it('freezes the returned empty account', () => {
        // Given an address with no matching RPC account.
        const address = '1111' as Address<'1111'>;

        // When we parse that address with a null RPC account.
        const account = parseEncodedAccount(address, null);

        // Then we expect the returned empty account to be frozen.
        expect(account).toBeFrozenObject();
    });
});
