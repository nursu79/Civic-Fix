import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseDirectClient } from '@supabase/supabase-js';

const DEMO_ACCOUNTS: Record<string, { email: string; name: string; role: 'admin' | 'department_officer' | 'citizen'; department?: string; redirectUrl: string }> = {
  admin: {
    email: 'admin@civicfix.gov.et',
    name: 'Municipal Super Admin',
    role: 'admin',
    redirectUrl: '/admin/dashboard',
  },
  department_officer: {
    email: 'officer@civicfix.gov.et',
    name: 'Roads & Infrastructure Officer',
    role: 'department_officer',
    department: 'roads',
    redirectUrl: '/department/dashboard',
  },
  citizen: {
    email: 'citizen@civicfix.gov.et',
    name: 'Addis Ababa Citizen',
    role: 'citizen',
    redirectUrl: '/en/dashboard',
  },
};

const DEMO_PASSWORD = 'CivicFix2026!Demo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const roleKey = (body.role || 'admin') as string;
    const config = DEMO_ACCOUNTS[roleKey] || DEMO_ACCOUNTS.admin;

    const supabase = await createClient();

    // 1. Attempt standard Supabase Sign In with fixed credentials
    let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: config.email,
      password: DEMO_PASSWORD,
    });

    // 2. If account does not exist in Supabase auth yet, auto-provision
    if (signInError || !authData.user) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && serviceRoleKey) {
        // Admin API creation (pre-confirmed email)
        const adminSupabase = createSupabaseDirectClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey);
        const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
          email: config.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: config.name },
        });

        if (!createErr && newUser?.user) {
          await (adminSupabase.from('profiles') as any).upsert({
            id: newUser.user.id,
            display_name: config.name,
            role: config.role,
            department: config.department || null,
          });
        }
      } else {
        // Public SignUp Fallback
        const { data: signUpData } = await supabase.auth.signUp({
          email: config.email,
          password: DEMO_PASSWORD,
          options: { data: { full_name: config.name } },
        });

        if (signUpData?.user) {
          await (supabase.from('profiles') as any).upsert({
            id: signUpData.user.id,
            display_name: config.name,
            role: config.role,
            department: config.department || null,
          });
        }
      }

      // Perform final sign in to generate JWT session cookies
      const retry = await supabase.auth.signInWithPassword({
        email: config.email,
        password: DEMO_PASSWORD,
      });
      authData = retry.data;
    }

    // Ensure profile table entry exists and has correct role
    if (authData?.user) {
      await (supabase.from('profiles') as any).upsert({
        id: authData.user.id,
        display_name: config.name,
        role: config.role,
        department: config.department || null,
      });
    }

    const res = NextResponse.json({
      success: true,
      role: config.role,
      email: config.email,
      password: DEMO_PASSWORD,
      user: authData?.user || null,
      redirectUrl: config.redirectUrl,
    });

    // Set role cookie
    res.cookies.set({
      name: 'sb-user-role',
      value: config.role,
      path: '/',
      maxAge: 604800,
      sameSite: 'lax',
    });

    return res;
  } catch (err: any) {
    console.error('Demo auth error:', err);
    return NextResponse.json(
      { error: err.message || 'Demo authentication failed' },
      { status: 500 }
    );
  }
}
