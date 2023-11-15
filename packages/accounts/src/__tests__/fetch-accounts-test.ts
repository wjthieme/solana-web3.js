import 'test-matchers/toBeFrozenObject';

import { Address } from '@solana/addresses';

import { fetchEncodedAccount, fetchEncodedAccounts } from '../fetch-encoded-account';
import { MaybeEncodedAccount } from '../maybe-account';
import { getMockRpc, RpcAccount } from './__setup__';

describe('fetchEncodedAccount', () => {
    it('fetches and parses an existing encoded account from an RPC', async () => {
        expect.assertions(2);

        // Given a mock RPC client returning a mock account at a given address.
        const address = '1111' as Address<'1111'>;
        const rpc = getMockRpc({
            [address]: <RpcAccount>{
                data: ['somedata', 'base64'],
                executable: false,
                lamports: 1_000_000_000n,
                owner: '9999',
                rentEpoch: 42n,
            },
        });

        // When we fetch that account using the fetchEncodedAccount function.
        const account = await fetchEncodedAccount(rpc, address);

        // Then we expect the following parsed encoded account to be returned.
        account satisfies MaybeEncodedAccount;
        expect(account).toStrictEqual({
            address,
            data: new Uint8Array([178, 137, 158, 117, 171, 90]),
            executable: false,
            exists: true,
            lamports: 1_000_000_000n,
            programAddress: '9999',
            rentEpoch: 42n,
        });

        // And the getAccountInfo RPC method to have been called with the given address and an explicity base64 encoding.
        expect(rpc.getAccountInfo).toHaveBeenCalledWith(address, { encoding: 'base64' });
    });

    it('fetches and parses a missing encoded account from an RPC', async () => {
        expect.assertions(2);

        // Given an address and a mock RPC that does not contain an account at that address.
        const address = '1111' as Address<'1111'>;
        const rpc = getMockRpc({});

        // When we try to fetch the account at that address using the fetchEncodedAccount function.
        const account = await fetchEncodedAccount(rpc, address);

        // Then we expect the following non-existing account to be returned.
        account satisfies MaybeEncodedAccount;
        expect(account).toStrictEqual({ address, exists: false });

        // And the getAccountInfo RPC method to have been called with the given address and an explicity base64 encoding.
        expect(rpc.getAccountInfo).toHaveBeenCalledWith(address, { encoding: 'base64' });
    });

    it('freezes the returned account', async () => {
        expect.assertions(1);

        // Given a mock RPC client returning a mock account at a given address.
        const address = '1111' as Address<'1111'>;
        const rpc = getMockRpc({
            [address]: <RpcAccount>{
                data: ['somedata', 'base64'],
                executable: false,
                lamports: 1_000_000_000n,
                owner: '9999',
                rentEpoch: 42n,
            },
        });

        // When we fetch that account using the fetchEncodedAccount function.
        const account = await fetchEncodedAccount(rpc, address);

        // Then we expect the returned account to be frozen.
        expect(account).toBeFrozenObject();
    });
});

describe('fetchEncodedAccounts', () => {
    it('fetches and parses multiple accounts from an RPC', async () => {
        expect.assertions(3);

        // Given two addresses A and B.
        const addressA = '1111' as Address<'1111'>;
        const addressB = '2222' as Address<'2222'>;

        // And a mock RPC client such that A exists and B does not.
        const rpc = getMockRpc({
            [addressA]: <RpcAccount>{
                data: ['somedata', 'base64'],
                executable: false,
                lamports: 1_000_000_000n,
                owner: '9999',
                rentEpoch: 42n,
            },
        });

        // When we fetch both of these accounts using the fetchEncodedAccounts function.
        const [accountA, accountB] = await fetchEncodedAccounts(rpc, [addressA, addressB]);

        // Then each account is returned as a MaybeEncodedAccount.
        accountA satisfies MaybeEncodedAccount;
        accountB satisfies MaybeEncodedAccount;

        // And account A is returned as an existing account.
        expect(accountA).toStrictEqual({
            address: addressA,
            data: new Uint8Array([178, 137, 158, 117, 171, 90]),
            executable: false,
            exists: true,
            lamports: 1_000_000_000n,
            programAddress: '9999',
            rentEpoch: 42n,
        });

        // And account B is returned as a non-existing account.
        expect(accountB).toStrictEqual({ address: addressB, exists: false });

        // And the getMultipleAccounts RPC method to have been called with the given addresses and an explicity base64 encoding.
        expect(rpc.getMultipleAccounts).toHaveBeenCalledWith([addressA, addressB], { encoding: 'base64' });
    });

    it('freezes the returned accounts', async () => {
        expect.assertions(2);

        // Given two addresses A and B.
        const addressA = '1111' as Address<'1111'>;
        const addressB = '2222' as Address<'2222'>;

        // And a mock RPC client such that A exists and B does not.
        const rpc = getMockRpc({
            [addressA]: <RpcAccount>{
                data: ['somedata', 'base64'],
                executable: false,
                lamports: 1_000_000_000n,
                owner: '9999',
                rentEpoch: 42n,
            },
        });

        // When we fetch both of these accounts using the fetchEncodedAccounts function.
        const [accountA, accountB] = await fetchEncodedAccounts(rpc, [addressA, addressB]);

        // Then both accounts are frozen.
        expect(accountA).toBeFrozenObject();
        expect(accountB).toBeFrozenObject();
    });
});
