import { combineCodec, FixedSizeCodec, FixedSizeDecoder, FixedSizeEncoder } from '@solana/codecs-core';

import { numberDecoderFactory, numberEncoderFactory } from './utils';

export const getU8Encoder = (): FixedSizeEncoder<number> =>
    numberEncoderFactory({
        name: 'u8',
        range: [0, Number('0xff')],
        set: (view, value) => view.setUint8(0, value),
        size: 1,
    });

export const getU8Decoder = (): FixedSizeDecoder<number> =>
    numberDecoderFactory({
        get: view => view.getUint8(0),
        name: 'u8',
        size: 1,
    });

export const getU8Codec = (): FixedSizeCodec<number> => combineCodec(getU8Encoder(), getU8Decoder());
