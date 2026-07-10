'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '../../features/auth/components/auth-provider';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
    } catch {
      setServerError('Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: 'var(--accent)' }}>
            <Heart size={19} className="text-white" fill="white" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Techciko</div>
            <div className="text-[11px] font-medium" style={{ color: 'var(--sub)' }}>Health Suite</div>
          </div>
        </div>

        <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <h1 className="text-[17px] font-semibold text-center">Sign in</h1>
          <p className="text-[12.5px] text-center mt-1 mb-5" style={{ color: 'var(--sub)' }}>Access your clinic dashboard</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div>
              <label className="text-[12px] font-medium">Email</label>
              <input {...register('email')} type="email" autoComplete="email"
                className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none focus:border-blue-500"
                style={{ borderColor: 'var(--border)', background: 'var(--faint)', color: 'var(--text)' }} />
              {errors.email && <p className="text-[11px] mt-1" style={{ color: '#dc2626' }}>{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-[12px] font-medium">Password</label>
              <input {...register('password')} type="password" autoComplete="current-password"
                className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none focus:border-blue-500"
                style={{ borderColor: 'var(--border)', background: 'var(--faint)', color: 'var(--text)' }} />
              {errors.password && <p className="text-[11px] mt-1" style={{ color: '#dc2626' }}>{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>{serverError}</div>
            )}

            <button type="submit" disabled={isSubmitting}
              className="w-full h-10 rounded-lg text-[13px] font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'var(--accent)' }}>
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-center mt-4" style={{ color: '#94a3b8' }}>
          Techciko Health Suite · demonstration environment
        </p>
      </div>
    </div>
  );
}
