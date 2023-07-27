import { assertKeyExporterIsAvailable } from './guard';
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

export async function publicKeyIsOnCurve(publicKey: CryptoKey): Promise<boolean> {
    await assertKeyExporterIsAvailable();
    if (publicKey.type !== 'public' || publicKey.algorithm.name !== 'Ed25519') {
        // TODO: Coded error.
        throw new Error('The `CryptoKey` must be an `Ed25519` public key');
    }
    const byteArrayBuffer = await crypto.subtle.exportKey('raw', publicKey);
    const bytes = new Uint8Array(byteArrayBuffer);
    return await publicKeyBytesAreOnCurve(bytes);
}

export async function publicKeyBytesAreOnCurve(bytes: Uint8Array): Promise<boolean> {
    if (bytes.byteLength !== 32) {
        return false;
    }
    const y = bytesToBigInt(bytes);
    return pointIsOnCurve(y, bytes[31]);
}
