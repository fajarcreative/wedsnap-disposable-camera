import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Icon } from '../components/Icon';

type AuthMode = 'login' | 'register';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if already authenticated
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/admin/dashboard', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Silakan masukkan alamat email Anda.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Silakan masukkan nama lengkap Anda.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Email atau kata sandi salah. Silakan coba lagi.');
          } else if (signInError.message.includes('Email not confirmed')) {
            setError('Email belum dikonfirmasi. Silakan cek inbox email Anda.');
          } else {
            setError(`Gagal masuk: ${signInError.message}`);
          }
          return;
        }

        navigate('/admin/dashboard', { replace: true });
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              display_name: name.trim(),
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.');
          } else {
            setError(`Gagal mendaftar: ${signUpError.message}`);
          }
          return;
        }

        setSuccess('Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi akun.');
        setMode('login');
        setPassword('');
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setSuccess(null);
  };

  // Show setup instructions if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-[#fff8f5] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B89758] to-[#755a21] mb-4 shadow-lg">
              <Icon name="camera" className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#755a21]">
              WedSnap
            </h1>
            <p className="text-sm text-[#755a21]/60 font-['Plus_Jakarta_Sans',sans-serif] mt-1">
              by Fajar Creative
            </p>
          </div>

          {/* Setup Instructions Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#B89758]/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Icon name="settings" className="w-5 h-5 text-amber-700" />
              </div>
              <h2 className="font-['Playfair_Display',serif] text-lg font-semibold text-gray-900">
                Konfigurasi Diperlukan
              </h2>
            </div>

            <p className="text-sm text-gray-600 font-['Plus_Jakarta_Sans',sans-serif] mb-4">
              Untuk menggunakan WedSnap, Anda perlu mengonfigurasi Supabase terlebih dahulu.
              Buat file <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-[#755a21]">.env</code> di root project dengan variabel berikut:
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 font-mono text-xs">
              <p className="text-gray-500 mb-1"># .env</p>
              <p className="text-[#755a21]">VITE_SUPABASE_URL=<span className="text-gray-400">https://your-project.supabase.co</span></p>
              <p className="text-[#755a21]">VITE_SUPABASE_ANON_KEY=<span className="text-gray-400">your-anon-key-here</span></p>
            </div>

            <div className="space-y-2 text-sm text-gray-600 font-['Plus_Jakarta_Sans',sans-serif]">
              <p className="font-medium text-gray-800">Langkah-langkah:</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1">
                <li>Buat project di <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#B89758] underline hover:text-[#755a21]">supabase.com</a></li>
                <li>Salin <strong>Project URL</strong> dan <strong>anon public key</strong> dari Settings → API</li>
                <li>Buat file <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.env</code> dan isi variabel di atas</li>
                <li>Restart dev server</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B89758] to-[#755a21] mb-4 shadow-lg">
            <Icon name="camera" className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#755a21]">
            WedSnap
          </h1>
          <p className="text-sm text-[#755a21]/60 font-['Plus_Jakarta_Sans',sans-serif] mt-1">
            by Fajar Creative
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#B89758]/10 p-6">
          <h2 className="font-['Playfair_Display',serif] text-xl font-semibold text-gray-900 text-center mb-1">
            {mode === 'login' ? 'Masuk ke Akun Anda' : 'Buat Akun Baru'}
          </h2>
          <p className="text-sm text-gray-500 font-['Plus_Jakarta_Sans',sans-serif] text-center mb-6">
            {mode === 'login'
              ? 'Kelola acara pernikahan Anda dengan mudah'
              : 'Daftar untuk mulai membuat acara'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <Icon name="alert-circle" className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-['Plus_Jakarta_Sans',sans-serif]">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2">
              <Icon name="check-circle" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 font-['Plus_Jakarta_Sans',sans-serif]">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (register only) */}
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 font-['Plus_Jakarta_Sans',sans-serif] mb-1.5"
                >
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Icon name="user" className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#fff8f5] border border-[#B89758]/20 text-gray-900 placeholder:text-gray-400 font-['Plus_Jakarta_Sans',sans-serif] text-sm transition-all duration-200 focus:bg-white focus:shadow-md focus:border-[#B89758]/40 focus:outline-none focus:ring-2 focus:ring-[#B89758]/20"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 font-['Plus_Jakarta_Sans',sans-serif] mb-1.5"
              >
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Icon name="mail" className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#fff8f5] border border-[#B89758]/20 text-gray-900 placeholder:text-gray-400 font-['Plus_Jakarta_Sans',sans-serif] text-sm transition-all duration-200 focus:bg-white focus:shadow-md focus:border-[#B89758]/40 focus:outline-none focus:ring-2 focus:ring-[#B89758]/20"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 font-['Plus_Jakarta_Sans',sans-serif] mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Icon name="lock" className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-11 pr-12 py-3 rounded-xl bg-[#fff8f5] border border-[#B89758]/20 text-gray-900 placeholder:text-gray-400 font-['Plus_Jakarta_Sans',sans-serif] text-sm transition-all duration-200 focus:bg-white focus:shadow-md focus:border-[#B89758]/40 focus:outline-none focus:ring-2 focus:ring-[#B89758]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#B89758] to-[#755a21] text-white font-semibold font-['Plus_Jakarta_Sans',sans-serif] text-sm shadow-lg shadow-[#B89758]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#B89758]/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {mode === 'login' ? 'Sedang masuk...' : 'Mendaftarkan...'}
                </span>
              ) : mode === 'login' ? (
                'Masuk'
              ) : (
                'Daftar'
              )}
            </button>
          </form>

          {/* Toggle Mode Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm font-['Plus_Jakarta_Sans',sans-serif] text-gray-500 hover:text-[#755a21] transition-colors"
            >
              {mode === 'login' ? (
                <>
                  Belum punya akun?{' '}
                  <span className="font-semibold text-[#B89758] hover:text-[#755a21]">Daftar</span>
                </>
              ) : (
                <>
                  Sudah punya akun?{' '}
                  <span className="font-semibold text-[#B89758] hover:text-[#755a21]">Masuk</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 font-['Plus_Jakarta_Sans',sans-serif] mt-6">
          &copy; {new Date().getFullYear()} WedSnap by Fajar Creative
        </p>
      </div>
    </div>
  );
}
