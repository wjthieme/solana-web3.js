import type { Address } from '@solana/addresses';
import type { Decoder } from '@solana/codecs-core';
import type {
    AccountInfoBase,
    AccountInfoWithBase64EncodedData,
    RpcResponse,
} from '@solana/rpc-core/dist/types/rpc-methods/common';
import type { GetAccountInfoApi } from '@solana/rpc-core/dist/types/rpc-methods/getAccountInfo';
import type { GetMultipleAccountsApi } from '@solana/rpc-core/dist/types/rpc-methods/getMultipleAccounts';
import type { PendingRpcRequest, Rpc } from '@solana/rpc-transport/dist/types/json-rpc-types';

export type RpcAccount = AccountInfoBase & AccountInfoWithBase64EncodedData;
export type NullableRpcAccount = RpcAccount | null;

export function getMockRpc(
    accounts: Record<Address, RpcAccount>
): Rpc<GetAccountInfoApi | GetMultipleAccountsApi> & { getAccountInfo: jest.Mock; getMultipleAccounts: jest.Mock } {
    const wrapInPendingResponse = <T>(value: T): PendingRpcRequest<RpcResponse<T>> => {
        const send = jest.fn().mockResolvedValue({ context: { slot: 0n }, value });
        return { send };
    };

    const getAccountInfo = jest
        .fn()
        .mockImplementation(
            (address: Address): PendingRpcRequest<RpcResponse<NullableRpcAccount>> =>
                wrapInPendingResponse(accounts[address] ?? null)
        );

    const getMultipleAccounts = jest
        .fn()
        .mockImplementation(
            (addresses: Address[]): PendingRpcRequest<RpcResponse<NullableRpcAccount[]>> =>
                wrapInPendingResponse(addresses.map(address => accounts[address] ?? null))
        );

    return { getAccountInfo, getMultipleAccounts };
}

export function getMockDecoder<T>(mockValue: T): Decoder<T> {
    return {
        decode: jest.fn().mockReturnValueOnce([mockValue, 42]),
        description: 'MockDecoder',
        fixedSize: null,
        maxSize: null,
    } as Decoder<T>;
}
