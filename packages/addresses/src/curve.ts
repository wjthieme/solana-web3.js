import { pointIsOnCurve } from './vendor/noble/ed25519';

function byteToHex(byte: number): string {
    const hexString = byte.toString(16);
    if (hexString.length === 1) {
        return `0${hexString}`;
    } else {
        return hexString;
    }
}

function bytesToBigInt(bytes: Uint8Array): bigint {
    const hexString = bytes.reduce((acc, byte, ii) => `${byteToHex(ii === 31 ? byte & ~0x80 : byte)}${acc}`, '');
    const integerLiteralString = `0x${hexString}`;
    return BigInt(integerLiteralString);
}

export async function publicKeyBytesAreOnCurve(bytes: Uint8Array): Promise<boolean> {
    if (bytes.byteLength !== 32) {
        return false;
    }
    const y = bytesToBigInt(bytes);
    return pointIsOnCurve(y, bytes[31]);
}
