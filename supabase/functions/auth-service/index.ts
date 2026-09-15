import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 1. PBKDF2 hash & verify
async function hashPassword(plainText: string, saltHex?: string | null): Promise<string> {
  if (!plainText) return '';
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(String(plainText).trim());
  
  let salt: Uint8Array;
  if (saltHex) {
    const match = saltHex.match(/.{1,2}/g) || [];
    salt = new Uint8Array(match.map(byte => parseInt(byte, 16)));
  } else {
    salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
  }
  const currentSaltHex = Array.from(salt, b => b.toString(16).padStart(2, '0')).join('');

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashHex = Array.from(new Uint8Array(derivedBits), b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:100000:${currentSaltHex}:${hashHex}`;
}

async function verifyPassword(inputPassword: string, storedPasswordOrHash: string): Promise<boolean> {
  if (!storedPasswordOrHash || !inputPassword) return false;
  const trimmedInput = String(inputPassword).trim();
  const trimmedStored = String(storedPasswordOrHash).trim();

  // A. PBKDF2
  if (trimmedStored.startsWith('pbkdf2:')) {
    const parts = trimmedStored.split(':');
    if (parts.length === 4) {
      const saltHex = parts[2];
      const computed = await hashPassword(trimmedInput, saltHex);
      return computed === trimmedStored;
    }
  }

  // B. SHA-256
  if (trimmedStored.startsWith('sha256:')) {
    const encoder = new TextEncoder();
    const data = encoder.encode(trimmedInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const computedSha = 'sha256:' + Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
    return computedSha === trimmedStored;
  }

  // C. Plaintext fallback
  return trimmedStored === trimmedInput;
}

// 2. TOTP Verification (RFC 6238)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32ToBytes(base32: string): Uint8Array {
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

async function generateTOTPToken(secret: string, timestampMs: number = Date.now(), period: number = 30): Promise<string | null> {
  try {
    const keyBytes = base32ToBytes(secret);
    if (keyBytes.length === 0) return null;
    const epoch = Math.floor(timestampMs / 1000);
    const timeStep = Math.floor(epoch / period);
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, timeStep, false);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
    const hash = new Uint8Array(signature);
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch {
    return null;
  }
}

async function verifyTOTPToken(secret: string, userToken: string, period: number = 30, windowTolerance: number = 2): Promise<boolean> {
  if (!secret || !userToken) return false;
  const cleanToken = String(userToken).trim();
  if (cleanToken.length !== 6) return false;
  const now = Date.now();
  const stepMs = period * 1000;
  for (let w = -windowTolerance; w <= windowTolerance; w++) {
    const checkTime = now + w * stepMs;
    const expected = await generateTOTPToken(secret, checkTime, period);
    if (expected === cleanToken) return true;
  }
  return false;
}

// Robust lookup helper by UUID or username
function getUserQuery(client: any, idOrUsername: string) {
  const clean = String(idOrUsername).trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  if (isUuid) {
    return client.from('profiles').select('*').eq('id', clean);
  }
  return client.from('profiles').select('*').ilike('username', clean);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action } = body;

    // 1. ACTION: LOGIN
    if (action === 'login') {
      const { username, password, totpCode } = body;
      if (!username || !password) {
        return new Response(JSON.stringify({ success: false, message: 'Kullanıcı adı ve şifre zorunludur.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: user, error } = await getUserQuery(adminClient, username).maybeSingle();

      if (error || !user) {
        return new Response(JSON.stringify({ success: false, message: 'Kullanıcı adı veya şifre hatalı!' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (user.is_active === false) {
        return new Response(JSON.stringify({ success: false, message: 'Bu kullanıcı hesabı merkez tarafından askıya alınmıştır/pasiftir!' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const isMatch = await verifyPassword(password, user.password);
      if (!isMatch) {
        return new Response(JSON.stringify({ success: false, message: 'Kullanıcı adı veya şifre hatalı!' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Auto-promote legacy password to PBKDF2 if needed
      if (user.password && !user.password.startsWith('pbkdf2:')) {
        const newHash = await hashPassword(password);
        await adminClient.from('profiles').update({ password: newHash, updated_at: new Date().toISOString() }).eq('id', user.id);
      }

      // 2FA Check
      if (user.two_factor_enabled && user.two_factor_secret) {
        if (!totpCode) {
          return new Response(JSON.stringify({
            success: true,
            requires2FA: true,
            tempUser: {
              id: user.id,
              username: user.username,
              name: user.name
            }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Verify TOTP or backup code
        let isTotpValid = await verifyTOTPToken(user.two_factor_secret, totpCode);
        if (!isTotpValid && Array.isArray(user.two_factor_backup_codes)) {
          const cleanCode = String(totpCode).trim();
          const matchIdx = user.two_factor_backup_codes.indexOf(cleanCode);
          if (matchIdx !== -1) {
            isTotpValid = true;
            // Remove used backup code
            const updatedBackupCodes = user.two_factor_backup_codes.filter((_: any, idx: number) => idx !== matchIdx);
            await adminClient.from('profiles').update({ two_factor_backup_codes: updatedBackupCodes }).eq('id', user.id);
          }
        }

        if (!isTotpValid) {
          return new Response(JSON.stringify({ success: false, message: 'Geçersiz 2FA doğrulama kodu!' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Update last_login
      const nowIso = new Date().toISOString();
      await adminClient.from('profiles').update({ last_login: nowIso }).eq('id', user.id);

      // Return SANITIZED user profile (ZERO sensitive secrets)
      const safeUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: (user.role || 'STAFF').toUpperCase(),
        city: user.city || 'İstanbul',
        branch: user.branch || 'Genel Merkez',
        phone: user.phone || '',
        email: user.email || '',
        avatarImage: user.avatar_image || null,
        isActive: user.is_active !== false,
        twoFactorEnabled: Boolean(user.two_factor_enabled),
        readAnnouncements: Array.isArray(user.read_announcements) ? user.read_announcements : [],
        lastLogin: nowIso
      };

      return new Response(JSON.stringify({ success: true, user: safeUser }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1B. ACTION: VERIFY 2FA
    if (action === 'verify-2fa') {
      const { userId, totpCode } = body;
      if (!userId || !totpCode) {
        return new Response(JSON.stringify({ success: false, message: 'Kullanıcı ve doğrulama kodu zorunludur.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: user, error } = await getUserQuery(adminClient, userId).maybeSingle();

      if (error || !user) {
        return new Response(JSON.stringify({ success: false, message: 'Kullanıcı bulunamadı.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verify TOTP or backup code
      let isTotpValid = await verifyTOTPToken(user.two_factor_secret, totpCode);
      if (!isTotpValid && Array.isArray(user.two_factor_backup_codes)) {
        const cleanCode = String(totpCode).trim();
        const matchIdx = user.two_factor_backup_codes.indexOf(cleanCode);
        if (matchIdx !== -1) {
          isTotpValid = true;
          // Remove used backup code
          const updatedBackupCodes = user.two_factor_backup_codes.filter((_: any, idx: number) => idx !== matchIdx);
          await adminClient.from('profiles').update({ two_factor_backup_codes: updatedBackupCodes }).eq('id', user.id);
        }
      }

      if (!isTotpValid) {
        return new Response(JSON.stringify({ success: false, message: 'Geçersiz 2FA doğrulama kodu!' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update last_login
      const nowIso = new Date().toISOString();
      await adminClient.from('profiles').update({ last_login: nowIso }).eq('id', user.id);

      const safeUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: (user.role || 'STAFF').toUpperCase(),
        city: user.city || 'İstanbul',
        branch: user.branch || 'Genel Merkez',
        phone: user.phone || '',
        email: user.email || '',
        avatarImage: user.avatar_image || null,
        isActive: user.is_active !== false,
        twoFactorEnabled: Boolean(user.two_factor_enabled),
        readAnnouncements: Array.isArray(user.read_announcements) ? user.read_announcements : [],
        lastLogin: nowIso
      };

      return new Response(JSON.stringify({ success: true, user: safeUser }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. ACTION: CHANGE PASSWORD
    if (action === 'change-password') {
      const { userId, oldPassword, newPassword } = body;
      if (!userId || !oldPassword || !newPassword) {
        return new Response(JSON.stringify({ success: false, message: 'Eksik parametre.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: user, error } = await getUserQuery(adminClient, userId).maybeSingle();

      if (error || !user) {
        return new Response(JSON.stringify({ success: false, message: 'Kullanıcı bulunamadı.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const isMatch = await verifyPassword(oldPassword, user.password);
      if (!isMatch) {
        return new Response(JSON.stringify({ success: false, message: 'Mevcut şifreniz doğru değil.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const newHash = await hashPassword(newPassword);
      await adminClient.from('profiles').update({
        password: newHash,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);

      return new Response(JSON.stringify({ success: true, message: 'Şifreniz başarıyla değiştirildi.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. ACTION: RESET PASSWORD (Admin only)
    if (action === 'reset-password') {
      const { adminUserId, targetUserId, newPassword } = body;
      if (!adminUserId || !targetUserId || !newPassword) {
        return new Response(JSON.stringify({ success: false, message: 'Eksik parametre.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check admin
      const { data: adminUser } = await getUserQuery(adminClient, adminUserId).maybeSingle();

      if (!adminUser || String(adminUser.role).toUpperCase() !== 'ADMIN') {
        return new Response(JSON.stringify({ success: false, message: 'Yetkisiz işlem: Sadece Genel Merkez şifre sıfırlayabilir.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: targetUser } = await getUserQuery(adminClient, targetUserId).maybeSingle();
      if (!targetUser) {
        return new Response(JSON.stringify({ success: false, message: 'Hedef personel bulunamadı.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const newHash = await hashPassword(newPassword);
      await adminClient.from('profiles').update({
        password: newHash,
        updated_at: new Date().toISOString()
      }).eq('id', targetUser.id);

      return new Response(JSON.stringify({ success: true, message: 'Personel şifresi başarıyla güncellendi.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. ACTION: RESET 2FA (Admin only)
    if (action === 'reset-2fa') {
      const { adminUserId, targetUserId } = body;
      if (!adminUserId || !targetUserId) {
        return new Response(JSON.stringify({ success: false, message: 'Eksik parametre.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: adminUser } = await getUserQuery(adminClient, adminUserId).maybeSingle();

      if (!adminUser || String(adminUser.role).toUpperCase() !== 'ADMIN') {
        return new Response(JSON.stringify({ success: false, message: 'Yetkisiz işlem: Sadece Genel Merkez 2FA sıfırlayabilir.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: targetUser } = await getUserQuery(adminClient, targetUserId).maybeSingle();
      if (!targetUser) {
        return new Response(JSON.stringify({ success: false, message: 'Hedef personel bulunamadı.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await adminClient.from('profiles').update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: [],
        updated_at: new Date().toISOString()
      }).eq('id', targetUser.id);

      return new Response(JSON.stringify({ success: true, message: 'Personel 2FA koruması sıfırlandı.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Bilinmeyen işlem' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Sunucu hatası' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
