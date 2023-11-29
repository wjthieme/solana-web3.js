import {
    assertByteArrayHasEnoughBytesForCodec,
    assertByteArrayIsNotEmptyForCodec,
    Codec,
    combineCodec,
    createDecoder,
    createEncoder,
    Decoder,
    Encoder,
    fixDecoder,
    FixedSizeCodec,
    FixedSizeDecoder,
    FixedSizeEncoder,
    fixEncoder,
    getEncodedSize,
    VariableSizeCodec,
    VariableSizeDecoder,
    VariableSizeEncoder,
} from '@solana/codecs-core';
import { getU32Decoder, getU32Encoder, NumberCodec, NumberDecoder, NumberEncoder } from '@solana/codecs-numbers';

import { getUtf8Decoder, getUtf8Encoder } from './utf8';

/** Defines the config for string codecs. */
export type StringCodecConfig<
    TPrefix extends NumberCodec | NumberEncoder | NumberDecoder,
    TEncoding extends Codec<string> | Encoder<string> | Decoder<string>
> = {
    /**
     * The size of the string. It can be one of the following:
     * - a {@link NumberCodec} that prefixes the string with its size.
     * - a fixed number of bytes.
     * - or `'variable'` to use the rest of the byte array.
     * @defaultValue u32 prefix.
     */
    size?: TPrefix | number | 'variable';

    /**
     * The codec to use for encoding and decoding the content.
     * @defaultValue UTF-8 encoding.
     */
    encoding?: TEncoding;
};

/** Encodes strings from a given encoding and size strategy. */
export function getStringEncoder(
    config: StringCodecConfig<NumberEncoder, Encoder<string>> & { size: number }
): FixedSizeEncoder<string>;
export function getStringEncoder(
    config?: StringCodecConfig<NumberEncoder, Encoder<string>>
): VariableSizeEncoder<string>;
export function getStringEncoder(config: StringCodecConfig<NumberEncoder, Encoder<string>> = {}): Encoder<string> {
    const size = config.size ?? getU32Encoder();
    const encoding = config.encoding ?? getUtf8Encoder();

    if (size === 'variable') {
        return encoding;
    }

    if (typeof size === 'number') {
        return fixEncoder(encoding, size);
    }

    return createEncoder({
        fixedSize: null,
        variableSize: (value: string) => {
            const contentSize = getEncodedSize(value, encoding);
            return getEncodedSize(contentSize, size) + contentSize;
        },
        write: (value: string, bytes, offset) => {
            const contentSize = getEncodedSize(value, encoding);
            offset = size.write(contentSize, bytes, offset);
            return encoding.write(value, bytes, offset);
        },
    });
}

/** Decodes strings from a given encoding and size strategy. */
export function getStringDecoder(
    config: StringCodecConfig<NumberDecoder, Decoder<string>> & { size: number }
): FixedSizeDecoder<string>;
export function getStringDecoder(
    config?: StringCodecConfig<NumberDecoder, Decoder<string>>
): VariableSizeDecoder<string>;
export function getStringDecoder(config: StringCodecConfig<NumberDecoder, Decoder<string>> = {}): Decoder<string> {
    const size = config.size ?? getU32Decoder();
    const encoding = config.encoding ?? getUtf8Decoder();

    if (size === 'variable') {
        return encoding;
    }

    if (typeof size === 'number') {
        return fixDecoder(encoding, size);
    }

    return createDecoder({
        fixedSize: null,
        read: (bytes: Uint8Array, offset = 0) => {
            assertByteArrayIsNotEmptyForCodec('string', bytes, offset);
            const [lengthBigInt, lengthOffset] = size.read(bytes, offset);
            const length = Number(lengthBigInt);
            offset = lengthOffset;
            const contentBytes = bytes.slice(offset, offset + length);
            assertByteArrayHasEnoughBytesForCodec('string', length, contentBytes);
            const [value, contentOffset] = encoding.read(contentBytes, 0);
            offset += contentOffset;
            return [value, offset];
        },
    });
}

/** Encodes and decodes strings from a given encoding and size strategy. */
export function getStringCodec(
    config: StringCodecConfig<NumberCodec, Codec<string>> & { size: number }
): FixedSizeCodec<string>;
export function getStringCodec(config?: StringCodecConfig<NumberCodec, Codec<string>>): VariableSizeCodec<string>;
export function getStringCodec(config: StringCodecConfig<NumberCodec, Codec<string>> = {}): Codec<string> {
    return combineCodec(getStringEncoder(config), getStringDecoder(config));
}
