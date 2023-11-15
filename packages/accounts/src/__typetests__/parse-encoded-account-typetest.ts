import { Address } from '@solana/addresses';

import { RpcAccount } from '../__tests__/__setup__';
import { EncodedAccount } from '../account';
import { MaybeEncodedAccount } from '../maybe-account';
import { parseEncodedAccount } from '../parse-encoded-account';

const address = '1111' as Address<'1111'>;

{
    // It returns a EncodedAccount when the RPC account is not nullable.
    const account = parseEncodedAccount(address, {} as RpcAccount);
    account satisfies EncodedAccount;
}

{
    // It returns a MaybeEncodedAccount when the RPC account is nullable.
    const account = parseEncodedAccount(address, {} as RpcAccount | null);
    account satisfies MaybeEncodedAccount;
    // @ts-expect-error The account should not be an EncodedAccount as null can be provided.
    account satisfies EncodedAccount;
}
