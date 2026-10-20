import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/Icon';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Home() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Check if iOS Safari
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
      if (isIos) {
        setShowIosGuide(true);
      } else {
        alert('Untuk memasang aplikasi ini, buka menu browser (titik tiga) lalu pilih "Tambahkan ke Layar Utama" / "Install App".');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8f5] flex flex-col justify-between text-[#1e1b18] px-4 py-8">
      {/* Top Branding */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#cca72f] to-[#755a21] flex items-center justify-center text-white shadow-md">
            <Icon name="photo_camera" size={24} />
          </div>
          <div>
            <h1 className="font-['Playfair_Display',serif] text-xl font-bold text-[#755a21] leading-tight">
              WedSnap
            </h1>
            <p className="text-[10px] text-[#7f7668] tracking-widest uppercase">
              by Fajar Creative
            </p>
          </div>
        </div>

        {user ? (
          <Link
            to="/admin/dashboard"
            className="px-3 py-1.5 rounded-full bg-[#f5ece7] text-xs font-semibold text-[#755a21] border border-[#d1c5b5] hover:bg-[#ffdea4]/40 transition-colors"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            to="/admin/login"
            className="px-3.5 py-1.5 rounded-full bg-[#755a21] text-xs font-semibold text-white shadow hover:bg-[#725b38] transition-colors"
          >
            Masuk Admin
          </Link>
        )}
      </header>

      {/* Hero Section */}
      <main className="max-w-md mx-auto w-full my-auto py-8 text-center space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#ffdea4]/40 text-[#755a21] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Digital Disposable Camera Pernikahan</span>
          </div>

          <h2 className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-bold text-[#1e1b18] leading-tight">
            Abadikan Momen dari Sudut Pandang Tamu
          </h2>

          <p className="text-xs sm:text-sm text-[#4d4639] leading-relaxed max-w-sm mx-auto">
            Ubah smartphone setiap tamu undangan menjadi kamera sekali pakai bernuansa analog dengan batas 36 foto. Tanpa perlu unduh aplikasi rumit.
          </p>
        </div>

        {/* Feature Highlights Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#d1c5b5]/40 shadow-sm text-left space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#ffdea4]/50 text-[#755a21] flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="qr_code_scanner" size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1e1b18]">1. Pindai QR di Meja</h4>
              <p className="text-[11px] text-[#7f7668]">Tamu cukup memindai QR code di meja jamuan dengan kamera HP.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#ffdea4]/50 text-[#755a21] flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="photo_camera" size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1e1b18]">2. Jepret 36 Foto Rol</h4>
              <p className="text-[11px] text-[#7f7668]">Kamera terbuka otomatis di browser dengan batas 36 foto per tamu.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#ffdea4]/50 text-[#755a21] flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="photo_library" size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1e1b18]">3. Galeri Foto Bersama</h4>
              <p className="text-[11px] text-[#7f7668]">Semua foto terunggah otomatis ke cloud untuk disimpan mempelai.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Link
            to="/camera/demo"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#b89758] to-[#755a21] text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Icon name="photo_camera" size={20} />
            <span>Coba Kamera Tamu Sekarang</span>
          </Link>

          {!isInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 rounded-2xl bg-white border border-[#d1c5b5] text-[#755a21] text-xs font-bold shadow-sm hover:bg-[#f5ece7] transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Icon name="install_mobile" size={18} />
              <span>Pasang WedSnap di HP (PWA)</span>
            </button>
          )}

          <Link
            to="/gallery/demo"
            className="w-full py-2.5 rounded-2xl text-xs font-semibold text-[#725b38] hover:text-[#1e1b18] flex items-center justify-center gap-1.5 transition-colors"
          >
            <Icon name="photo_library" size={16} />
            <span>Lihat Contoh Galeri Foto</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center pb-safe pt-4">
        <p className="text-[11px] text-[#7f7668]">
          WedSnap &bull; Karya Fajar Creative &bull; All Rights Reserved
        </p>
      </footer>

      {/* iOS PWA Install Guide Modal */}
      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 animate-slide-up text-[#1e1b18]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#ffdea4]/40 text-[#755a21] flex items-center justify-center mx-auto">
              <Icon name="ios_share" size={24} />
            </div>

            <h3 className="font-['Playfair_Display',serif] text-lg font-bold">
              Cara Pasang di iPhone / iPad
            </h3>

            <div className="text-left text-xs text-[#4d4639] space-y-2 bg-[#fff8f5] p-3.5 rounded-2xl border border-[#d1c5b5]">
              <p>1. Buka halaman ini di browser <strong>Safari</strong>.</p>
              <p>2. Ketuk ikon <strong>Bagikan / Share</strong> (kotak panah atas) di bilah bawah.</p>
              <p>3. Gulir ke bawah lalu pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (Add to Home Screen).</p>
              <p>4. Ketuk <strong>Tambah</strong> di pojok kanan atas.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#755a21] text-white text-xs font-semibold"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

