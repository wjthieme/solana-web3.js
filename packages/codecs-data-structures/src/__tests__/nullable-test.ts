import { FixedSizeCodec } from '@solana/codecs-core';
import { getU8Codec, getU16Codec, getU64Codec } from '@solana/codecs-numbers';
import { getStringCodec } from '@solana/codecs-strings';

import { getNullableCodec } from '../nullable';
import { getUnitCodec } from '../unit';
import { b } from './__setup__';

describe('getNullableCodec', () => {
    const nullable = getNullableCodec;
    const u8 = getU8Codec;
    const u16 = getU16Codec;
    const u64 = getU64Codec;
    const string = getStringCodec;
    const unit = getUnitCodec;

    it('encodes nullables', () => {
        // Null.
        expect(nullable(u8()).encode(null)).toStrictEqual(b('00'));
        expect(nullable(u8()).read(b('00'), 0)).toStrictEqual([null, 1]);
        expect(nullable(u8()).read(b('ffff00'), 2)).toStrictEqual([null, 3]);

        // Null with custom prefix.
        expect(nullable(u8(), { prefix: u16() }).encode(null)).toStrictEqual(b('0000'));
        expect(nullable(u8(), { prefix: u16() }).read(b('0000'), 0)).toStrictEqual([null, 2]);

        // Some.
        expect(nullable(u8()).encode(42)).toStrictEqual(b('012a'));
        expect(nullable(u8()).read(b('012a'), 0)).toStrictEqual([42, 2]);
        expect(nullable(u8()).read(b('ffff012a'), 2)).toStrictEqual([42, 4]);

        // Some with custom prefix.
        expect(nullable(u8(), { prefix: u16() }).encode(42)).toStrictEqual(b('01002a'));
        expect(nullable(u8(), { prefix: u16() }).read(b('01002a'), 0)).toStrictEqual([42, 3]);

        // Some with strings.
        expect(nullable(string()).encode('Hello')).toStrictEqual(b('010500000048656c6c6f'));
        expect(nullable(string()).read(b('010500000048656c6c6f'), 0)).toStrictEqual(['Hello', 10]);

        // Different From and To types.
        const nullableU64 = nullable<number | bigint, bigint>(u64());
        expect(nullableU64.encode(2)).toStrictEqual(b('010200000000000000'));
        expect(nullableU64.encode(2n)).toStrictEqual(b('010200000000000000'));
        expect(nullableU64.read(b('010200000000000000'), 0)).toStrictEqual([2n, 9]);
    });

    it('encodes fixed nullables', () => {
        const fixedU8 = nullable(u8(), { fixed: true });
        const fixedU8WithU16Prefix = nullable(u8(), { fixed: true, prefix: u16() });
        const fixedString = nullable(string({ size: 5 }), { fixed: true });

        // Null.
        expect(fixedU8.encode(null)).toStrictEqual(b('0000'));
        expect(fixedU8.read(b('0000'), 0)).toStrictEqual([null, 2]);
        expect(fixedU8.read(b('ffff0000'), 2)).toStrictEqual([null, 4]);

        // Null with custom prefix.
        expect(fixedU8WithU16Prefix.encode(null)).toStrictEqual(b('000000'));
        expect(fixedU8WithU16Prefix.read(b('000000'), 0)).toStrictEqual([null, 3]);

        // Some.
        expect(fixedU8.encode(42)).toStrictEqual(b('012a'));
        expect(fixedU8.read(b('012a'), 0)).toStrictEqual([42, 2]);
        expect(fixedU8.read(b('ffff012a'), 2)).toStrictEqual([42, 4]);

        // Some with custom prefix.
        expect(fixedU8WithU16Prefix.encode(42)).toStrictEqual(b('01002a'));
        expect(fixedU8WithU16Prefix.read(b('01002a'), 0)).toStrictEqual([42, 3]);

        // Some with fixed strings.
        expect(fixedString.encode('Hello')).toStrictEqual(b('0148656c6c6f'));
        expect(fixedString.read(b('0148656c6c6f'), 0)).toStrictEqual(['Hello', 6]);

        // Different From and To types.
        const nullableU64 = nullable<number | bigint, bigint>(u64());
        expect(nullableU64.encode(2)).toStrictEqual(b('010200000000000000'));
        expect(nullableU64.encode(2n)).toStrictEqual(b('010200000000000000'));
        expect(nullableU64.read(b('010200000000000000'), 0)).toStrictEqual([2n, 9]);

        // Fixed nullables must wrap fixed-size items.
        // @ts-expect-error It cannot wrap a variable size item when fixed is true.
        expect(() => nullable(string(), { fixed: true })).toThrow(
            'Fixed nullables can only be used with fixed-size codecs'
        );
    });

    it('has the right sizes', () => {
        expect(nullable(u8()).getSizeFromValue(null)).toBe(1);
        expect(nullable(u8()).getSizeFromValue(42)).toBe(2);
        expect(nullable(u8()).maxSize).toBe(2);
        expect(nullable(string()).getSizeFromValue(null)).toBe(1);
        expect(nullable(string()).getSizeFromValue('ABC')).toBe(1 + 4 + 3);
        expect(nullable(string()).maxSize).toBeUndefined();
        expect(nullable(u8(), { prefix: u16() }).getSizeFromValue(null)).toBe(2);
        expect(nullable(u8(), { prefix: u16() }).getSizeFromValue(42)).toBe(3);
        expect(nullable(u8(), { prefix: u16() }).maxSize).toBe(3);

        // Fixed.
        expect(nullable(u8(), { fixed: true }).fixedSize).toBe(2);
        expect(nullable(string({ size: 5 }), { fixed: true }).fixedSize).toBe(6);
        expect(nullable(u8(), { fixed: true, prefix: u16() }).fixedSize).toBe(3);

        // Zero-size items.
        expect(nullable(unit() as FixedSizeCodec<void> & { fixedSize: 0 }).fixedSize).toBe(1);
    });
});
