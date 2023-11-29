import {
    combineCodec,
    createDecoder,
    createEncoder,
    mapDecoder,
    mapEncoder,
    VariableSizeCodec,
    VariableSizeDecoder,
    VariableSizeEncoder,
} from '@solana/codecs-core';

import { assertValidBaseString } from './assertions';
import { getBaseXResliceDecoder, getBaseXResliceEncoder } from './baseX-reslice';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Encodes strings in base64. */
export const getBase64Encoder = (): VariableSizeEncoder<string> => {
    if (__BROWSER__) {
        return createEncoder({
            getSizeFromValue: (value: string) => {
                try {
                    return (atob as Window['atob'])(value).length;
                } catch (e) {
                    // TODO: Coded error.
                    throw new Error(`Expected a string of base 64, got [${value}].`);
                }
            },
            write(value: string, bytes, offset) {
                try {
                    const bytesToAdd = (atob as Window['atob'])(value)
                        .split('')
                        .map(c => c.charCodeAt(0));
                    bytes.set(bytesToAdd, offset);
                    return bytesToAdd.length + offset;
                } catch (e) {
                    // TODO: Coded error.
                    throw new Error(`Expected a string of base 64, got [${value}].`);
                }
            },
        });
    }

    if (__NODEJS__) {
        return createEncoder({
            getSizeFromValue: (value: string) => Buffer.from(value, 'base64').length,
            write(value: string, bytes, offset) {
                assertValidBaseString(alphabet, value.replace(/=/g, ''));
                const buffer = Buffer.from(value, 'base64');
                bytes.set(buffer, offset);
                return buffer.length + offset;
            },
        });
    }

    return mapEncoder(getBaseXResliceEncoder(alphabet, 6), (value: string): string => value.replace(/=/g, ''));
};

/** Decodes strings in base64. */
export const getBase64Decoder = (): VariableSizeDecoder<string> => {
    if (__BROWSER__) {
        return createDecoder({
            read(bytes, offset = 0) {
                const slice = bytes.slice(offset);
                const value = (btoa as Window['btoa'])(String.fromCharCode(...slice));
                return [value, bytes.length];
            },
        });
    }

    if (__NODEJS__) {
        return createDecoder({
            read: (bytes, offset = 0) => [Buffer.from(bytes, offset).toString('base64'), bytes.length],
        });
    }

    return mapDecoder(getBaseXResliceDecoder(alphabet, 6), (value: string): string =>
        value.padEnd(Math.ceil(value.length / 4) * 4, '=')
    );
};

/** Encodes and decodes strings in base64. */
export const getBase64Codec = (): VariableSizeCodec<string> => combineCodec(getBase64Encoder(), getBase64Decoder());
