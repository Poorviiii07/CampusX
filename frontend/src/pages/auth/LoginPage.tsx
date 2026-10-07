import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, GraduationCap, ChevronDown, ChevronUp, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { AxiosError } from 'axios';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

function redirectFor(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/analytics';
    case 'FACULTY':
      return '/timetable';
    case 'STUDENT':
      return '/timetable';
    default:
      return '/campus-map';
  }
}

const demoCreds = [
  { role: 'Admin', email: 'admin@campusx.edu', password: 'Admin@123' },
  { role: 'Faculty', email: 'faculty@campusx.edu', password: 'Faculty@123' },
  { role: 'Student', email: 'student@campusx.edu', password: 'Student@123' },
  { role: 'Guest', email: 'guest@campusx.edu', password: 'Guest@123' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [showCreds, setShowCreds] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await login(values.email, values.password);
      push(`Welcome back, ${res.user.name}`, 'success');
      navigate(redirectFor(res.user.role), { replace: true });
    } catch (err) {
      const message =
        (err as AxiosError<{ message?: string }>)?.response?.data?.message ??
        'Login failed. Check your credentials.';
      setError('email', { message: ' ' });
      setError('password', { message: message });
      push(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #5E574D 0%, #7D6D61 50%, #9DAD6F 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl text-white mb-4" style={{ backgroundColor: '#9DAD6F' }}>
            <GraduationCap size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">CAMPUS-X</h1>
          <p className="mt-1" style={{ color: '#C3DFE0' }}>AI-Powered Smart Campus Management</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="you@campusx.edu"
              leftIcon={<Mail size={16} />}
              error={errors.email?.message}
              register={register('email')}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              error={errors.password?.message}
              register={register('password')}
              autoComplete="current-password"
            />
            <Button type="submit" size="lg" loading={submitting} leftIcon={<LogIn size={16} />}>
              Sign in
            </Button>
          </form>

          <div className="mt-4 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setShowCreds((s) => !s)}
              className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-primary-700"
            >
              <span>Demo credentials</span>
              {showCreds ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showCreds && (
              <ul className="mt-2 space-y-1.5 text-xs text-gray-600">
                {demoCreds.map((c) => (
                  <li key={c.email} className="flex justify-between rounded bg-gray-50 px-3 py-2">
                    <span className="font-medium text-gray-700">{c.role}</span>
                    <span>
                      {c.email} / <span className="font-mono">{c.password}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
