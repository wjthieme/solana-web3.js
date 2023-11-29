import { getI16Codec, getU8Codec, getU64Codec } from '@solana/codecs-numbers';
import { getStringCodec } from '@solana/codecs-strings';

import { getTupleCodec } from '../tuple';
import { b } from './__setup__';

describe('getTupleCodec', () => {
    const tuple = getTupleCodec;
    const string = getStringCodec;
    const i16 = getI16Codec;
    const u8 = getU8Codec;
    const u64 = getU64Codec;

    it('encodes tuples', () => {
        // Encode.
        expect(tuple([]).encode([])).toStrictEqual(b(''));
        expect(tuple([u8()]).encode([42])).toStrictEqual(b('2a'));
        expect(tuple([u8(), i16()]).encode([0, -42])).toStrictEqual(b('00d6ff'));
        expect(tuple([string(), u8()]).encode(['Hello', 42])).toStrictEqual(b('0500000048656c6c6f2a'));

        // Decode.
        expect(tuple([]).decode(b(''))).toStrictEqual([]);
        expect(tuple([u8()]).decode(b('2a'))).toStrictEqual([42]);
        expect(tuple([u8(), i16()]).decode(b('00d6ff'))).toStrictEqual([0, -42]);
        expect(tuple([string(), u8()]).decode(b('0500000048656c6c6f2a'))).toStrictEqual(['Hello', 42]);

        // Different From and To types.
        const tupleU8U64 = tuple<[number, number | bigint], [number, bigint]>([u8(), u64()]);
        expect(tupleU8U64.encode([1, 2])).toStrictEqual(b('010200000000000000'));
        expect(tupleU8U64.encode([1, 2n])).toStrictEqual(b('010200000000000000'));
        expect(tupleU8U64.decode(b('010200000000000000'))).toStrictEqual([1, 2n]);
        expect(tupleU8U64.encode([1, 2n ** 63n])).toStrictEqual(b('010000000000000080'));
        expect(tupleU8U64.decode(b('010000000000000080'))).toStrictEqual([1, 2n ** 63n]);
    });

    it('has the right sizes', () => {
        expect(tuple([]).fixedSize).toBe(0);
        expect(tuple([u8()]).fixedSize).toBe(1);
        expect(tuple([u8(), i16()]).fixedSize).toBe(1 + 2);
        expect(tuple([u8(), string(), i16()]).getSizeFromValue([1, 'ABC', 2])).toBe(1 + (4 + 3) + 2);
        expect(tuple([u8(), string(), i16()]).maxSize).toBeUndefined();
        expect(tuple([string(), u8()]).getSizeFromValue(['Hello', 42])).toBe(4 + 5 + 1);
    });
});
