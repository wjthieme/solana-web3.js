import { Offset } from '@solana/codecs-core';
import { NumberCodec, NumberDecoder, NumberEncoder } from '@solana/codecs-numbers';

/**
 * Represents all the size options for array-like codecs
 * — i.e. `array`, `map` and `set`.
 *
 * It can be one of the following:
 * - a {@link NumberCodec} that prefixes its content with its size.
 * - a fixed number of items.
 * - or `'remainder'` to infer the number of items by dividing
 *   the rest of the byte array by the fixed size of its item.
 *   Note that this option is only available for fixed-size items.
 */
export type ArrayLikeCodecSize<TPrefix extends NumberCodec | NumberEncoder | NumberDecoder> =
    | TPrefix
    | number
    | 'remainder';

export function readArrayLikeCodecSize(
    size: ArrayLikeCodecSize<NumberDecoder>,
    itemSize: number | null,
    bytes: Uint8Array,
    offset: Offset
): [number | bigint, Offset] {
    if (typeof size === 'number') {
        return [size, offset];
    }

    if (typeof size === 'object') {
        return size.read(bytes, offset);
    }

    if (size === 'remainder') {
        if (itemSize === null) {
            // TODO: Coded error.
            throw new Error('Codecs of "remainder" size must have fixed-size items.');
        }
        const remainder = Math.max(0, bytes.length - offset);
        if (remainder % itemSize !== 0) {
            // TODO: Coded error.
            throw new Error(
                `The remainder of the byte array (${remainder} bytes) cannot be split into chunks of ${itemSize} bytes. ` +
                    `Codecs of "remainder" size must have a remainder that is a multiple of its item size. ` +
                    `In other words, ${remainder} modulo ${itemSize} should be equal to zero.`
            );
        }
        return [remainder / itemSize, offset];
    }

    // TODO: Coded error.
    throw new Error(`Unrecognized array-like codec size: ${JSON.stringify(size)}`);
}

export function computeArrayLikeCodecSize(size: object | number | 'remainder', itemSize: number | null): number | null {
    if (typeof size !== 'number') return null;
    if (size === 0) return 0;
    return itemSize === null ? null : itemSize * size;
}
