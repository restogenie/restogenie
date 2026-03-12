import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// ENCRYPTION_KEY must be exactly 32 bytes (256 bits)
// In production, configure this in .env. For fallback, we generate a deterministic one or slice the existing string.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
    ? crypto.createHash('sha256').update(String(process.env.ENCRYPTION_KEY)).digest('base64').substring(0, 32)
    : crypto.createHash('sha256').update('restogenie-secure-fallback-key-2026').digest('base64').substring(0, 32);

/**
 * Encrypts a plain text string using AES-256-GCM.
 * @param text The plain text API key to encrypt.
 * @returns The encrypted string in format `iv:authTag:encryptedData`.
 */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string back to plain text.
 * @param encryptedText The encrypted string in format `iv:authTag:encryptedData`.
 * @returns The decrypted plain text API key.
 */
export function decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }
    
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    
    const decipher = crypto.createDecipheriv(
        ALGORITHM, 
        Buffer.from(ENCRYPTION_KEY), 
        Buffer.from(ivHex, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}
