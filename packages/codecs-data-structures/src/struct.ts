import { BaseCodecConfig, Codec, CodecData, combineCodec, Decoder, Encoder, mergeBytes } from '@solana/codecs-core';

import { sumCodecSizes } from './utils';

/** Get the name and encoder of each field in a struct. */
export type StructToEncoderTuple<T extends object> = Array<
    {
        [K in keyof T]: [K, Encoder<T[K]>];
    }[keyof T]
>;

/** Get the name and decoder of each field in a struct. */
export type StructToDecoderTuple<T extends object> = Array<
    {
        [K in keyof T]: [K, Decoder<T[K]>];
    }[keyof T]
>;

/** Get the name and codec of each field in a struct. */
export type StructToCodecTuple<T extends object, U extends T> = Array<
    {
        [K in keyof T]: [K, Codec<T[K], U[K]>];
    }[keyof T]
>;

/** Defines the config for struct codecs. */
export type StructCodecConfig = BaseCodecConfig;

function structCodecHelper(fields: Array<[string | number | symbol, CodecData]>, description?: string): CodecData {
    const fieldDescriptions = fields.map(([name, codec]) => `${String(name)}: ${codec.description}`).join(', ');

    return {
        description: description ?? `struct(${fieldDescriptions})`,
        fixedSize: sumCodecSizes(fields.map(([, field]) => field.fixedSize)),
        maxSize: sumCodecSizes(fields.map(([, field]) => field.maxSize)),
    };
}

/**
 * Creates a encoder for a custom object.
 *
 * @param fields - The name and encoder of each field.
 * @param config - A set of config for the encoder.
 */
export function getStructEncoder<T extends object>(
    fields: StructToEncoderTuple<T>,
    config: StructCodecConfig = {},
): Encoder<T> {
    return {
        ...structCodecHelper(fields, config.description),
        encode: (struct: T) => {
            const fieldBytes = fields.map(([key, codec]) => codec.encode(struct[key]));
            return mergeBytes(fieldBytes);
        },
    };
}

/**
 * Creates a decoder for a custom object.
 *
 * @param fields - The name and decoder of each field.
 * @param config - A set of config for the decoder.
 */
export function getStructDecoder<T extends object>(
    fields: StructToDecoderTuple<T>,
    config: StructCodecConfig = {},
): Decoder<T> {
    return {
        ...structCodecHelper(fields, config.description),
        decode: (bytes: Uint8Array, offset = 0) => {
            const struct: Partial<T> = {};
            fields.forEach(([key, codec]) => {
                const [value, newOffset] = codec.decode(bytes, offset);
                offset = newOffset;
                struct[key] = value;
            });
            return [struct as T, offset];
        },
    };
}

/**
 * Creates a codec for a custom object.
 *
 * @param fields - The name and codec of each field.
 * @param config - A set of config for the codec.
 */
export function getStructCodec<T extends object, U extends T = T>(
    fields: StructToCodecTuple<T, U>,
    config: StructCodecConfig = {},
): Codec<T, U> {
    return combineCodec(getStructEncoder(fields, config), getStructDecoder(fields, config));
}
