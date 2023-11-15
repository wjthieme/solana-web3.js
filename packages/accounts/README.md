[![npm][npm-image]][npm-url]
[![npm-downloads][npm-downloads-image]][npm-url]
[![semantic-release][semantic-release-image]][semantic-release-url]
<br />
[![code-style-prettier][code-style-prettier-image]][code-style-prettier-url]

[code-style-prettier-image]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square
[code-style-prettier-url]: https://github.com/prettier/prettier
[npm-downloads-image]: https://img.shields.io/npm/dm/@solana/accounts/experimental.svg?style=flat
[npm-image]: https://img.shields.io/npm/v/@solana/accounts/experimental.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@solana/accounts/v/experimental
[semantic-release-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release

# @solana/accounts

This package contains types and helper methods for representing, fetching and decoding Solana accounts. It can be used standalone, but it is also exported as part of the Solana JavaScript SDK [`@solana/web3.js@experimental`](https://github.com/solana-labs/solana-web3.js/tree/master/packages/library).

It provides a unified definition of a Solana account regardless of how it was retrieved and can represent both encoded and decoded accounts. It also introduces the concept of a `MaybeAccount` which represents a fetched account that may or may not exist on-chain whilst keeping track of its address in both cases.

Helper functions are provided for fetching, parsing and decoding accounts as well as asserting that an account exists.

```ts
// Fetch.
const myAddress = address('1234..5678');
const myAccount = fetchEncodedAccount(rpc, myAddress);
myAccount satisfies MaybeEncodedAccount<'1234..5678'>;

// Assert.
assertAccountExists(myAccount);
myAccount satisfies EncodedAccount<'1234..5678'>;

// Decode.
type MyAccountData = { name: string; age: number };
const myDecoder: Decoder<MyAccountData> = getStructDecoder([
    ['name', getStringDecoder({ size: getU32Decoder() })],
    ['age', getU32Decoder()],
]);
const myDecodedAccount = decodeAccount(myAccount, myDecoder);
myDecodedAccount satisfies Account<MyAccountData, '1234..5678'>;
```

## Types

### `AccountHeader`

The `AccountHeader` type defines the attributes common to all Solana accounts. Namely, it contains everything stored on-chain except the account data itself.

```ts
const accountHeader: AccountHeader = {
    executable: false,
    lamports: lamports(1_000_000_000n),
    programAddress: address('1111..1111'),
    rentEpoch: 42n,
};
```

This package also exports an `ACCOUNT_HEADER_SIZE` constant representing the size of an account header in bytes.

```ts
const myTotalAccountSize = myAccountDataSize + ACCOUNT_HEADER_SIZE;
```

### `Account` and `EncodedAccount`

The `Account` type contains all the information relevant to a Solana account. It contains the `AccountHeader` described above as well as the account data and the address of the account.

The account data can be represented as either a `Uint8Array` — meaning the account is encoded — or a custom data type — meaning the account is decoded.

```ts
// Encoded.
const myEncodedAccount: Account<Uint8Array, '1234..5678'> = {
    address: address('1234..5678'),
    data: new Uint8Array([1, 2, 3]),
    executable: false,
    lamports: lamports(1_000_000_000n),
    programAddress: address('1111..1111'),
    rentEpoch: 42n,
};

// Decoded.
type MyAccountData = { name: string; age: number };
const myDecodedAccount: Account<MyAccountData, '1234..5678'> = {
    address: address('1234..5678'),
    data: { name: 'Alice', age: 30 },
    executable: false,
    lamports: lamports(1_000_000_000n),
    programAddress: address('1111..1111'),
    rentEpoch: 42n,
};
```

The `EncodedAccount` type can also be used to represent an encoded account and is equivalent to an `Account` with a `Uint8Array` account data.

```ts
myEncodedAccount satisfies EncodedAccount<'1234..5678'>;
```

### `MaybeAccount` and `MaybeEncodedAccount`

The `MaybeAccount` type is a union type representing an account that may or may not exist on-chain. When the account exists, it is represented as an `Account` type with an additional `exists` attribute set to `true`. When it does not exist, it is represented by an object containing only the address of the account and an `exists` attribute set to `false`.

```ts
// Account exists.
const myExistingAccount: MaybeAccount<MyAccountData, '1234..5678'> = {
    exists: true,
    address: address('1234..5678'),
    data: { name: 'Alice', age: 30 },
    executable: false,
    lamports: lamports(1_000_000_000n),
    programAddress: address('1111..1111'),
    rentEpoch: 42n,
};

// Account does not exist.
const myMissingAccount: MaybeAccount<MyAccountData, '8765..4321'> = {
    exists: false,
    address: address('8765..4321'),
};
```

Similarly to the `Account` type, the `MaybeAccount` type can be used to represent an encoded account by using the `Uint8Array` data type or by using the `MaybeEncodedAccount` helper type.

```ts
// Encoded account exists.
const myExistingAccount: MaybeEncodedAccount<'1234..5678'> = {
    exists: true,
    address: address('1234..5678'),
    data: new Uint8Array([1, 2, 3]),
    // ...
};

// Encoded account does not exist.
const myMissingAccount: MaybeEncodedAccount<'8765..4321'> = {
    exists: false,
    address: address('8765..4321'),
};
```

## Functions

### `assertAccountExists()`

Given a `MaybeAccount`, this function asserts that the account exists and allows it to be used as an `Account` type going forward.

```ts
const myAccount: MaybeEncodedAccount<'1234..5678'>;
assertAccountExists(myAccount);

// Now we can use myAccount as an Account.
myAccount satisfies EncodedAccount<'1234..5678'>;
```

### `parseEncodedAccount()`

This function parses the raw data provided by the RPC client into an `EncodedAccount` type or a `MaybeEncodedAccount` type if the raw data can be set to `null`.

```ts
const myAddress = address('1234..5678');
const myRpcAccount = await rpc.getAccountInfo(myAddress).send();
const myAccount: MaybeEncodedAccount<'1234..5678'> = parseEncodedAccount(myRpcAccount);
```

### `fetchEncodedAccount()`

This function fetches a `MaybeEncodedAccount` from the provided RPC client and address. It uses the `getAccountInfo` RPC method under the hood and an additional configuration object can be provided to customize the behavior of the RPC call.

```ts
const myAddress = address('1234..5678');
const myAccount: MaybeEncodedAccount<'1234..5678'> = await fetchEncodedAccount(rpc, myAddress);

// With custom configuration.
const myAccount: MaybeEncodedAccount<'1234..5678'> = await fetchEncodedAccount(rpc, myAddress, {
    abortSignal: myAbortController.signal,
    commitment: 'confirmed',
});
```

### `fetchEncodedAccounts()`

This function fetches an array of `MaybeEncodedAccount` from the provided RPC client and an array of addresses. It uses the `getMultipleAccounts` RPC method under the hood and an additional configuration object can be provided to customize the behavior of the RPC call.

```ts
const myAddressA = address('1234..5678');
const myAddressB = address('8765..4321');
const [myAccountA, myAccountB] = await fetchEncodedAccounts(rpc, [myAddressA, myAddressB]);
myAccountA satisfies MaybeEncodedAccount<'1234..5678'>;
myAccountB satisfies MaybeEncodedAccount<'8765..4321'>;

// With custom configuration.
const [myAccountA, myAccountB] = await fetchEncodedAccounts(rpc, [myAddressA, myAddressB], {
    abortSignal: myAbortController.signal,
    commitment: 'confirmed',
});
```

### `decodeAccount()`

This function transforms an `EncodedAccount` into an `Account` (or a `MaybeEncodedAccount` into a `MaybeAccount`) by decoding the account data using the provided `Decoder` instance.

```ts
type MyAccountData = { name: string; age: number };

const myAccount: EncodedAccount<'1234..5678'>;
const myDecoder: Decoder<MyAccountData> = getStructDecoder([
    ['name', getStringDecoder({ size: getU32Decoder() })],
    ['age', getU32Decoder()],
]);

const myDecodedAccount = decodeAccount(myAccount, myDecoder);
myDecodedAccount satisfies Account<MyAccountData, '1234..5678'>;
```
