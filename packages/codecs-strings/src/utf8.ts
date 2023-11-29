import {
    Codec,
    combineCodec,
    createDecoder,
    createEncoder,
    VariableSizeDecoder,
    VariableSizeEncoder,
} from '@solana/codecs-core';
import { TextDecoder, TextEncoder } from 'text-encoding-impl';

import { removeNullCharacters } from './null-characters';

/** Encodes UTF-8 strings using the native `TextEncoder` API. */
export const getUtf8Encoder = (): VariableSizeEncoder<string> => {
    let textEncoder: TextEncoder;
    return createEncoder({
        fixedSize: null,
        variableSize: value => (textEncoder ||= new TextEncoder()).encode(value).length,
        write: (value: string, bytes, offset) => {
            const bytesToAdd = (textEncoder ||= new TextEncoder()).encode(value);
            bytes.set(bytesToAdd, offset);
            return offset + bytesToAdd.length;
        },
    });
};

/** Decodes UTF-8 strings using the native `TextDecoder` API. */
export const getUtf8Decoder = (): VariableSizeDecoder<string> => {
    let textDecoder: TextDecoder;
    return createDecoder({
        fixedSize: null,
        read(bytes, offset) {
            const value = (textDecoder ||= new TextDecoder()).decode(bytes.slice(offset));
            return [removeNullCharacters(value), bytes.length];
        },
    });
};

/** Encodes and decodes UTF-8 strings using the native `TextEncoder` and `TextDecoder` API. */
export const getUtf8Codec = (): Codec<string> => combineCodec(getUtf8Encoder(), getUtf8Decoder());
