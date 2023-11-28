import {
    assertIsFixedSizeCodec,
    Codec,
    combineCodec,
    createDecoder,
    createEncoder,
    Decoder,
    Encoder,
    FixedSizeCodec,
    FixedSizeDecoder,
    FixedSizeEncoder,
    getEncodedSize,
    VariableSizeCodec,
    VariableSizeDecoder,
    VariableSizeEncoder,
} from '@solana/codecs-core';
import { getU32Decoder, getU32Encoder, NumberCodec, NumberDecoder, NumberEncoder } from '@solana/codecs-numbers';

import { ArrayLikeCodecSize, computeArrayLikeCodecSize, readArrayLikeCodecSize } from './array-like-codec-size';
import { assertValidNumberOfItemsForCodec } from './assertions';
import { getFixedSize, getMaxSize } from './utils';

/** Defines the config for set codecs. */
export type SetCodecConfig<TPrefix extends NumberCodec | NumberEncoder | NumberDecoder> = {
    /**
     * The size of the set.
     * @defaultValue u32 prefix.
     */
    size?: ArrayLikeCodecSize<TPrefix>;
};

/**
 * Encodes an set of items.
 *
 * @param item - The encoder to use for the set's items.
 * @param config - A set of config for the encoder.
 */
export function getSetEncoder<TFrom>(
    item: Encoder<TFrom>,
    config: SetCodecConfig<NumberEncoder> & { size: 0 }
): FixedSizeEncoder<Set<TFrom>, 0>;
export function getSetEncoder<TFrom>(
    item: FixedSizeEncoder<TFrom>,
    config: SetCodecConfig<NumberEncoder> & { size: number }
): FixedSizeEncoder<Set<TFrom>>;
export function getSetEncoder<TFrom>(
    item: FixedSizeEncoder<TFrom>,
    config: SetCodecConfig<NumberEncoder> & { size: 'remainder' }
): VariableSizeEncoder<Set<TFrom>>;
export function getSetEncoder<TFrom>(
    item: Encoder<TFrom>,
    config?: SetCodecConfig<NumberEncoder> & { size?: number | NumberEncoder }
): VariableSizeEncoder<Set<TFrom>>;
export function getSetEncoder<TFrom>(
    item: Encoder<TFrom>,
    config: SetCodecConfig<NumberEncoder> = {}
): Encoder<Set<TFrom>> {
    const size = config.size ?? getU32Encoder();
    if (size === 'remainder') {
        assertIsFixedSizeCodec(item, 'Codecs of "remainder" size must have fixed-size items.');
    }

    const fixedSize = computeArrayLikeCodecSize(size, getFixedSize(item));
    const maxSize = computeArrayLikeCodecSize(size, getMaxSize(item)) ?? undefined;

    return createEncoder({
        ...(fixedSize !== null
            ? { fixedSize }
            : {
                  getSizeFromValue: (set: Set<TFrom>) => {
                      const prefixSize = typeof size === 'object' ? getEncodedSize(set.size, size) : 0;
                      return prefixSize + [...set].reduce((all, value) => all + getEncodedSize(value, item), 0);
                  },
                  maxSize,
              }),
        write: (set: Set<TFrom>, bytes, offset) => {
            if (typeof size === 'number') {
                assertValidNumberOfItemsForCodec('set', size, set.size);
            }
            if (typeof size === 'object') {
                offset = size.write(set.size, bytes, offset);
            }
            set.forEach(value => {
                offset = item.write(value, bytes, offset);
            });
            return offset;
        },
    });
}

/**
 * Decodes an set of items.
 *
 * @param item - The encoder to use for the set's items.
 * @param config - A set of config for the encoder.
 */
export function getSetDecoder<TTo>(
    item: Decoder<TTo>,
    config: SetCodecConfig<NumberDecoder> & { size: 0 }
): FixedSizeDecoder<Set<TTo>, 0>;
export function getSetDecoder<TTo>(
    item: FixedSizeDecoder<TTo>,
    config: SetCodecConfig<NumberDecoder> & { size: number }
): FixedSizeDecoder<Set<TTo>>;
export function getSetDecoder<TTo>(
    item: FixedSizeDecoder<TTo>,
    config: SetCodecConfig<NumberDecoder> & { size: 'remainder' }
): VariableSizeDecoder<Set<TTo>>;
export function getSetDecoder<TTo>(
    item: Decoder<TTo>,
    config?: SetCodecConfig<NumberDecoder> & { size?: number | NumberDecoder }
): VariableSizeDecoder<Set<TTo>>;
export function getSetDecoder<TTo>(item: Decoder<TTo>, config: SetCodecConfig<NumberDecoder> = {}): Decoder<Set<TTo>> {
    const size = config.size ?? getU32Decoder();
    if (size === 'remainder') {
        assertIsFixedSizeCodec(item, 'Codecs of "remainder" size must have fixed-size items.');
    }

    const itemSize = getFixedSize(item);
    const fixedSize = computeArrayLikeCodecSize(size, itemSize);
    const maxSize = computeArrayLikeCodecSize(size, getMaxSize(item)) ?? undefined;

    return createDecoder({
        ...(fixedSize !== null ? { fixedSize } : { maxSize }),
        read: (bytes: Uint8Array, offset) => {
            const set: Set<TTo> = new Set();
            if (typeof size === 'object' && bytes.slice(offset).length === 0) {
                return [set, offset];
            }
            const [resolvedSize, newOffset] = readArrayLikeCodecSize(size, itemSize, bytes, offset);
            offset = newOffset;
            for (let i = 0; i < resolvedSize; i += 1) {
                const [value, newOffset] = item.read(bytes, offset);
                offset = newOffset;
                set.add(value);
            }
            return [set, offset];
        },
    });
}

/**
 * Creates a codec for an set of items.
 *
 * @param item - The codec to use for the set's items.
 * @param config - A set of config for the codec.
 */
export function getSetCodec<TFrom, TTo extends TFrom>(
    item: Codec<TFrom, TTo>,
    config: SetCodecConfig<NumberCodec> & { size: 0 }
): FixedSizeCodec<Set<TFrom>, Set<TTo>, 0>;
export function getSetCodec<TFrom, TTo extends TFrom>(
    item: FixedSizeCodec<TFrom, TTo>,
    config: SetCodecConfig<NumberCodec> & { size: number }
): FixedSizeCodec<Set<TFrom>, Set<TTo>>;
export function getSetCodec<TFrom, TTo extends TFrom>(
    item: FixedSizeCodec<TFrom, TTo>,
    config: SetCodecConfig<NumberCodec> & { size: 'remainder' }
): VariableSizeCodec<Set<TFrom>, Set<TTo>>;
export function getSetCodec<TFrom, TTo extends TFrom>(
    item: Codec<TFrom, TTo>,
    config?: SetCodecConfig<NumberCodec> & { size?: number | NumberCodec }
): VariableSizeCodec<Set<TFrom>, Set<TTo>>;
export function getSetCodec<TFrom, TTo extends TFrom>(
    item: Codec<TFrom, TTo>,
    config: SetCodecConfig<NumberCodec> = {}
): Codec<Set<TFrom>, Set<TTo>> {
    return combineCodec(getSetEncoder(item, config as object), getSetDecoder(item, config as object));
}
