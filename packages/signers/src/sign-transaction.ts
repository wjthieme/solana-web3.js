import { SignatureBytes } from '@solana/keys';
import {
    assertTransactionIsFullySigned,
    CompilableTransaction,
    IFullySignedTransaction,
    ITransactionWithSignatures,
    TransactionVersion,
} from '@solana/transactions';

import { getSignersFromTransaction, IInstructionWithSigners } from './account-signer-meta';
import { deduplicateSigners } from './deduplicate-signers';
import { isTransactionModifyingSigner, TransactionModifyingSigner } from './transaction-modifying-signer';
import { isTransactionPartialSigner, TransactionPartialSigner } from './transaction-partial-signer';
import { isTransactionSendingSigner, TransactionSendingSigner } from './transaction-sending-signer';
import { isTransactionSigner, TransactionSigner } from './transaction-signer';

type CompilableTransactionWithSigners = CompilableTransaction<
    TransactionVersion,
    IInstructionWithSigners<string, TransactionSigner>
> &
    Partial<ITransactionWithSignatures>;

/**
 * Signs a transaction using any signers that may be stored in IAccountSignerMeta instruction accounts
 * as well as any signers provided explicitly to this function.
 * It will ignore TransactionSendingSigners since this function does not send the transaction.
 */
export async function partiallySignTransactionWithSigners<
    TTransaction extends CompilableTransactionWithSigners = CompilableTransactionWithSigners
>(
    transaction: TTransaction,
    signers: readonly TransactionSigner[] = []
): Promise<TTransaction & ITransactionWithSignatures> {
    const { partialSigners, modifyingSigners } = categorizeTransactionSigners(
        deduplicateSigners([...getSignersFromTransaction(transaction).filter(isTransactionSigner), ...signers]),
        { identifySendingSigner: false }
    );

    return signModifyingAndPartialTransactionSigners(transaction, modifyingSigners, partialSigners);
}

/**
 * Signs a transaction using any signers that may be stored in IAccountSignerMeta instruction accounts
 * as well as any signers provided explicitly to this function.
 * It will assert that the transaction is fully signed before returning.
 * It will ignore TransactionSendingSigners since this function does not send the transaction.
 */
export async function signTransactionWithSigners<
    TTransaction extends CompilableTransactionWithSigners = CompilableTransactionWithSigners
>(
    transaction: TTransaction,
    signers: readonly TransactionSigner[] = []
): Promise<TTransaction & IFullySignedTransaction> {
    const signedTransaction = await partiallySignTransactionWithSigners(transaction, signers);
    assertTransactionIsFullySigned(signedTransaction);
    return signedTransaction;
}

/**
 * Signs and sends a transaction using any signers that may be stored in IAccountSignerMeta
 * instruction accounts as well as any signers provided explicitly to this function.
 * It will identify a single TransactionSendingSigners to use for sending the transaction, if any.
 * Otherwise, it will send the transaction using the provided fallbackSender.
 */
export async function signAndSendTransactionWithSigners<
    TTransaction extends CompilableTransactionWithSigners = CompilableTransactionWithSigners
>(
    transaction: TTransaction,
    signers: readonly TransactionSigner[] = [],
    fallbackSender?: (transaction: TTransaction & IFullySignedTransaction) => Promise<SignatureBytes>
): Promise<SignatureBytes> {
    const { partialSigners, modifyingSigners, sendingSigner } = categorizeTransactionSigners(
        deduplicateSigners([...getSignersFromTransaction(transaction).filter(isTransactionSigner), ...signers])
    );

    const signedTransaction = await signModifyingAndPartialTransactionSigners(
        transaction,
        modifyingSigners,
        partialSigners
    );

    if (sendingSigner) {
        const [signature] = await sendingSigner.signAndSendTransactions([signedTransaction]);
        return signature;
    }

    if (fallbackSender) {
        assertTransactionIsFullySigned(signedTransaction);
        return fallbackSender(signedTransaction);
    }

    // TODO: Coded error.
    throw new Error('No TransactionSendingSigner was identified and no fallback sender was provided.');
}

/**
 * Identifies each provided TransactionSigner and categorizes them into their respective types.
 * When a signer implements multiple interface, it will try to used to most powerful interface
 * but fallback to the least powerful interface when necessary.
 * For instance, if a signer implements TransactionSendingSigner and TransactionModifyingSigner,
 * it will be categorized as a TransactionSendingSigner if and only if no other signers implement
 * the TransactionSendingSigner interface.
 */
function categorizeTransactionSigners(
    signers: readonly TransactionSigner[],
    options?: { identifySendingSigner: boolean }
): Readonly<{
    modifyingSigners: readonly TransactionModifyingSigner[];
    partialSigners: readonly TransactionPartialSigner[];
    sendingSigner: TransactionSendingSigner | null;
}> {
    // Identify the unique sending signer that should be used.
    const identifySendingSigner = options?.identifySendingSigner ?? true;
    const sendingSigner = identifySendingSigner ? identifyTransactionSendingSigner(signers) : null;

    // Now, focus on the other signers.
    // I.e. the modifying or partial signers that are not the identified sending signer.
    // Note that any other sending only signers will be discarded.
    const otherSigners = signers.filter(
        (signer): signer is TransactionModifyingSigner | TransactionPartialSigner =>
            signer !== sendingSigner && (isTransactionModifyingSigner(signer) || isTransactionPartialSigner(signer))
    );

    // Identify the modifying signers from the other signers.
    const modifyingSigners = identifyTransactionModifyingSigners(otherSigners);

    // Use any remaining signers as partial signers.
    const partialSigners = otherSigners
        .filter(isTransactionPartialSigner)
        .filter(signer => !(modifyingSigners as typeof otherSigners).includes(signer));

    return Object.freeze({ modifyingSigners, partialSigners, sendingSigner });
}

/** Identifies the best signer to use as a TransactionSendingSigner, if any */
function identifyTransactionSendingSigner(signers: readonly TransactionSigner[]): TransactionSendingSigner | null {
    // Ensure there are any TransactionSendingSigners in the first place.
    const sendingSigners = signers.filter(isTransactionSendingSigner);
    if (sendingSigners.length === 0) return null;

    // Prefer sending signers that do not offer other interfaces.
    const sendingOnlySigners = sendingSigners.filter(
        signer => !isTransactionModifyingSigner(signer) && !isTransactionPartialSigner(signer)
    );
    if (sendingOnlySigners.length > 0) {
        return sendingOnlySigners[0];
    }

    // Otherwise, choose any sending signer.
    return sendingSigners[0];
}

/** Identifies the best signers to use as TransactionModifyingSigners, if any */
function identifyTransactionModifyingSigners(
    signers: readonly (TransactionModifyingSigner | TransactionPartialSigner)[]
): readonly TransactionModifyingSigner[] {
    // Ensure there are any TransactionModifyingSigner in the first place.
    const modifyingSigners = signers.filter(isTransactionModifyingSigner);
    if (modifyingSigners.length === 0) return [];

    // Prefer modifying signers that do not offer partial signing.
    const nonPartialSigners = modifyingSigners.filter(signer => !isTransactionPartialSigner(signer));
    if (nonPartialSigners.length > 0) return nonPartialSigners;

    // Otherwise, choose only one modifying signer (whichever).
    return [modifyingSigners[0]];
}

/**
 * Signs a transaction using the provided TransactionModifyingSigners
 * sequentially followed by the TransactionPartialSigners in parallel.
 */
async function signModifyingAndPartialTransactionSigners<
    TTransaction extends CompilableTransactionWithSigners = CompilableTransactionWithSigners
>(
    transaction: TTransaction,
    modifyingSigners: readonly TransactionModifyingSigner[] = [],
    partialSigners: readonly TransactionPartialSigner[] = []
): Promise<TTransaction & ITransactionWithSignatures> {
    // Handle modifying signers sequentially.
    const modifiedTransaction = await modifyingSigners.reduce(async (transaction, modifyingSigner) => {
        const [tx] = await modifyingSigner.modifyAndSignTransactions([await transaction]);
        return Object.freeze(tx);
    }, Promise.resolve(transaction) as Promise<TTransaction>);

    // Handle partial signers in parallel.
    const signatureDictionaries = await Promise.all(
        partialSigners.map(async partialSigner => {
            const [signatures] = await partialSigner.signTransactions([modifiedTransaction]);
            return signatures;
        })
    );
    const signedTransaction: TTransaction & ITransactionWithSignatures = {
        ...modifiedTransaction,
        signatures: Object.freeze(
            signatureDictionaries.reduce((signatures, signatureDictionary) => {
                return { ...signatures, ...signatureDictionary };
            }, modifiedTransaction.signatures ?? {})
        ),
    };

    return Object.freeze(signedTransaction);
}