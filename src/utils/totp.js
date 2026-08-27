/**
 * RFC 6238 Time-based One-Time Password (TOTP) Implementation for Google Authenticator
 * Built using native Web Crypto API (zero external runtime dependencies).
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// 1. Generate Random 16-character Base32 Secret Key
export function generateTOTPSecret(length = 16) {
  let secret = '';
  const randomBytes = new Uint8Array(length);
  window.crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[randomBytes[i] % BASE32_CHARS.length];
  }
  return secret;
}

// 2. Decode Base32 String to Uint8Array
function base32ToBytes(base32) {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

// 3. Generate 6-digit TOTP token for given secret and timestamp
export async function generateTOTPToken(secret, timestampMs = Date.now(), period = 30) {
  try {
    const keyBytes = base32ToBytes(secret);
    if (keyBytes.length === 0) return null;

    const epoch = Math.floor(timestampMs / 1000);
    const timeStep = Math.floor(epoch / period);

    // Convert timeStep to 8-byte big-endian buffer
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, timeStep, false); // Big endian

    // HMAC-SHA-1 via Web Crypto API
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
    const hash = new Uint8Array(signature);

    // Dynamic Truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch (e) {
    console.error('TOTP Generation Error:', e);
    return null;
  }
}

// 4. Verify user-entered 6-digit code with window tolerance (±2 steps / 60 sec drift)
export async function verifyTOTPToken(secret, userToken, period = 30, windowTolerance = 2) {
  if (!secret || !userToken) return false;
  const cleanToken = String(userToken).trim();
  if (cleanToken.length !== 6) return false;

  const now = Date.now();
  const stepMs = period * 1000;

  for (let w = -windowTolerance; w <= windowTolerance; w++) {
    const checkTime = now + w * stepMs;
    const expected = await generateTOTPToken(secret, checkTime, period);
    console.log(`[TOTP] Window ${w}: expected=${expected}, got=${cleanToken}, match=${expected === cleanToken}`);
    if (expected === cleanToken) {
      return true;
    }
  }
  console.warn('[TOTP] Verification failed for all windows. Secret:', secret?.substring(0, 4) + '...');
  return false;
}

// 5. Generate Standard Google Authenticator URI
export function getTOTPUri(username, secret, issuer = 'İnzar Turizm') {
  const cleanUser = encodeURIComponent(username || 'Misafir');
  const cleanIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${cleanIssuer}:${cleanUser}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// 6. Generate 5 Random Backup Codes
export function generateBackupCodes(count = 5) {
  const codes = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < count; i++) {
    let code = '';
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    for (let j = 0; j < 8; j++) {
      if (j === 4) code += '-';
      code += chars[bytes[j] % chars.length];
    }
    codes.push(code);
  }
  return codes;
}
