// Deno Edge Function for Admin Credentials Validation & IP Rate Limiting
// Path: supabase/functions/admin-auth/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts"

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
  ];
  
  let allowedOrigin = '';
  if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('github.dev')) {
    allowedOrigin = origin;
  } else {
    allowedOrigin = 'https://creative-manager-psi.vercel.app';
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req, connInfo) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const adminJwtSecret = Deno.env.get('ADMIN_JWT_SECRET') || 'batman_dark_knight_secret_key_2026';
    
    // Extract client IP address
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     (connInfo?.remoteAddr as Deno.NetAddr)?.hostname || 
                     '127.0.0.1';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check IP lockout status
    const { data: lockoutRow } = await supabase
      .from('admin_rate_limits')
      .select('*')
      .eq('ip_address', clientIP)
      .single();

    if (lockoutRow) {
      const now = new Date();
      if (lockoutRow.locked_until && new Date(lockoutRow.locked_until) > now) {
        const lockoutTimeRemaining = Math.ceil(
          (new Date(lockoutRow.locked_until).getTime() - now.getTime()) / 60000
        );
        return new Response(JSON.stringify({ 
          error: `Maximum attempts exceeded. This terminal is locked. Try again in ${lockoutTimeRemaining} minutes.` 
        }), {
          status: 423,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Parse body parameters
    const { username, password } = await req.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Helper to log a failed attempt
    const recordFailedAttempt = async () => {
      const nowStr = new Date().toISOString();
      const currentAttempts = lockoutRow ? lockoutRow.attempt_count + 1 : 1;
      
      let lockedUntilStr = null;
      if (currentAttempts >= 5) {
        // Lockout for 30 minutes
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 30);
        lockedUntilStr = lockedUntil.toISOString();
      }

      if (lockoutRow) {
        await supabase
          .from('admin_rate_limits')
          .update({ 
            attempt_count: currentAttempts, 
            locked_until: lockedUntilStr,
            last_attempt: nowStr
          })
          .eq('ip_address', clientIP);
      } else {
        await supabase
          .from('admin_rate_limits')
          .insert({
            ip_address: clientIP,
            attempt_count: currentAttempts,
            locked_until: lockedUntilStr,
            last_attempt: nowStr
          });
      }
    };

    // 2. Fetch admin user profile by username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('role', 'admin')
      .single();

    if (profileError || !profile || profile.is_suspended) {
      await recordFailedAttempt();
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Authenticate with Supabase Auth using their email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: password
    });

    if (authError || !authData.user) {
      await recordFailedAttempt();
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Successful login: reset rate limit attempts
    if (lockoutRow) {
      await supabase
        .from('admin_rate_limits')
        .delete()
        .eq('ip_address', clientIP);
    }

    // 5. Sign custom Admin JWT (2 hours expiry)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(adminJwtSecret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: profile.id,
        username: profile.username,
        role: "admin",
        exp: getNumericDate(2 * 60 * 60) // 2 hours from now
      },
      key
    );

    return new Response(JSON.stringify({ token: jwt }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unhandled Admin Auth Error:', error);
    return new Response(JSON.stringify({ error: 'Server Error: Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
