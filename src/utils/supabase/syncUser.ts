import { pool } from '@/database/db';
import { randomUUID } from 'crypto';

export async function syncUserToSupabaseAuth({
  email,
  name,
  passwordHash,
  id,
}: {
  email: string;
  name: string;
  passwordHash?: string;
  id?: string;
}): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();

  try {
    const existing = await pool.query('SELECT id FROM auth.users WHERE email = $1', [normalizedEmail]);

    if (existing.rows.length > 0) {
      const authId = existing.rows[0].id;
      if (passwordHash) {
        await pool.query(
          'UPDATE auth.users SET encrypted_password = $1, updated_at = $2 WHERE id = $3::uuid',
          [passwordHash, now, authId]
        );
      }
      return authId;
    }

    const authId = id && id.length === 36 ? id : randomUUID();

    await pool.query(
      `
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at, confirmation_token, email_change, 
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', $1::uuid, 'authenticated', 'authenticated', 
        $2, $3, $4, '{"provider":"email","providers":["email"]}', 
        $5, $4, $4, '', '', '', ''
      )
    `,
      [authId, normalizedEmail, passwordHash || '', now, JSON.stringify({ name })]
    );

    await pool.query(
      `
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        $1::uuid, $2, $1::uuid, $3, 'email', $4, $4, $4
      )
    `,
      [authId, authId, JSON.stringify({ sub: authId, email: normalizedEmail }), now]
    );

    return authId;
  } catch (error) {
    console.error('Failed to sync user to Supabase Auth:', error);
    throw error;
  }
}
