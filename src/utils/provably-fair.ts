import SHA256 from 'crypto-js/sha256';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import Hex from 'crypto-js/enc-hex';

export class ProvablyFair {
    // Generate a random server seed (in a real app, this is secret until hash is revealed)
    static generateServerSeed() {
        const randomValues = new Uint8Array(32);
        crypto.getRandomValues(randomValues);
        return Array.from(randomValues).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Generate a client seed
    static generateClientSeed() {
        const randomValues = new Uint8Array(10);
        crypto.getRandomValues(randomValues);
        return Array.from(randomValues).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Hash the server seed (publicly visible before game)
    static hashSeed(seed: string) {
        return SHA256(seed).toString(Hex);
    }

    // Combine seeds and nonce to get a deterministic float 0-1
    static generateResult(serverSeed: string, clientSeed: string, nonce: number): number {
        const message = `${clientSeed}:${nonce}`;
        const hmac = HmacSHA256(message, serverSeed).toString(Hex);
        
        // Take first 4 bytes (8 hex chars)
        const sub = hmac.substring(0, 8);
        const decimal = parseInt(sub, 16);
        
        // Max value of 4 bytes is 2^32 - 1 = 4294967295
        return decimal / 4294967296;
    }

    // Generate multiple floats (for mines, plinko path, etc)
    static generateFloats(serverSeed: string, clientSeed: string, nonce: number, count: number): number[] {
        const floats: number[] = [];
        
        for (let i = 0; i < count; i++) {
            // If we run out of bytes in the hash (32 bytes = 8 floats of 4 bytes), we'd need to rehash.
            // For simplicity in this demo, we'll re-hash the current hash to get a new stream if needed.
            // Or just slide window.
            // Real implementation: https://dicesites.com/provably-fair
            
            // Simplified: Generate a new HMAC for each number index to ensure independence
            const itemHmac = HmacSHA256(`${clientSeed}:${nonce}:${i}`, serverSeed).toString(Hex);
            const sub = itemHmac.substring(0, 8);
            floats.push(parseInt(sub, 16) / 4294967296);
        }
        return floats;
    }
}
