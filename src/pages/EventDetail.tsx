import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Icon } from '../components/Icon';
import type { Event, Photo } from '../types/database';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyGallerySuccess, setCopyGallerySuccess] = useState(false);
  const [updatingMode, setUpdatingMode] = useState(false);

  const qrCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEventData = async () => {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured() || id?.startsWith('demo-')) {
        // Mock demo event
        setEvent({
          id: id || 'demo-1',
          admin_id: 'demo-admin',
          title: 'Radit & Aluna',
          slug: 'radit-aluna',
          event_date: '2025-10-18',
          location: 'Gedung Arsip Nasional, Jakarta',
          cover_url: null,
          photo_limit: 36,
          gallery_mode: 'public',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setGuestCount(24);
        setPhotos([]);
        setLoading(false);
        return;
      }

      try {
        if (!id) {
          setError('ID acara tidak ditemukan.');
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/admin/login', { replace: true });
          return;
        }

        // Fetch event - ensure admin ownership via admin_id
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .eq('admin_id', session.user.id)
          .single();

        if (eventError || !eventData) {
          setError('Acara tidak ditemukan atau Anda tidak memiliki izin akses.');
          setLoading(false);
          return;
        }

        const typedEvent = eventData as unknown as Event;
        setEvent(typedEvent);

        // Fetch photos
        const { data: photosData } = await supabase
          .from('photos')
          .select('*')
          .eq('event_id', typedEvent.id)
          .order('created_at', { ascending: false });

        if (photosData) {
          setPhotos(photosData as unknown as Photo[]);
        }

        // Fetch guest sessions count
        const { count: sessionCount } = await supabase
          .from('camera_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', typedEvent.id);

        setGuestCount(sessionCount || 0);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Gagal memuat detail acara.');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id, navigate]);

  const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, '');
  const cameraUrl = event
    ? `${window.location.origin}${basePrefix}/camera/${event.slug}`
    : '';
  const galleryUrl = event
    ? `${window.location.origin}${basePrefix}/gallery/${event.slug}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(cameraUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = cameraUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handleCopyGalleryLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopyGallerySuccess(true);
      setTimeout(() => setCopyGallerySuccess(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = galleryUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyGallerySuccess(true);
      setTimeout(() => setCopyGallerySuccess(false), 2500);
    }
  };

  // Toggle Gallery Mode between public & locked
  const handleToggleGalleryMode = async () => {
    if (!event) return;
    const newMode = event.gallery_mode === 'public' ? 'locked' : 'public';
    setUpdatingMode(true);

    if (isSupabaseConfigured() && !event.id.startsWith('demo-')) {
      const { error: updateError } = await supabase
        .from('events')
        .update({ gallery_mode: newMode } as never)
        .eq('id', event.id);

      if (updateError) {
        alert('Gagal mengubah pengaturan galeri: ' + updateError.message);
        setUpdatingMode(false);
        return;
      }
    }

    setEvent({ ...event, gallery_mode: newMode });
    setUpdatingMode(false);
  };

  // Download Printable Table Card as high-res PNG
  const handleDownloadTableCard = () => {
    if (!event) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High resolution for 300 DPI print card (A6 portrait proportion: 1200 x 1600)
    canvas.width = 1200;
    canvas.height = 1600;

    // Background Warm Ivory
    ctx.fillStyle = '#fff8f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Elegant Double Gold Border
    ctx.strokeStyle = '#cca72f';
    ctx.lineWidth = 6;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

    ctx.strokeStyle = '#d1c5b5';
    ctx.lineWidth = 2;
    ctx.strokeRect(65, 65, canvas.width - 130, canvas.height - 130);

    // Brand Label
    ctx.fillStyle = '#755a21';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('WEDSNAP DISPOSABLE CAMERA', canvas.width / 2, 160);

    // Decorative line
    ctx.strokeStyle = '#b89758';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 120, 200);
    ctx.lineTo(canvas.width / 2 + 120, 200);
    ctx.stroke();

    // Event Title (Couple Names)
    ctx.fillStyle = '#1e1b18';
    ctx.font = 'bold 64px "Playfair Display", Georgia, serif';
    ctx.fillText(event.title, canvas.width / 2, 300);

    // Event Date & Location
    ctx.fillStyle = '#725b38';
    ctx.font = '36px "Plus Jakarta Sans", sans-serif';
    const dateFormatted = new Date(event.event_date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const subText = event.location
      ? `${dateFormatted} • ${event.location}`
      : dateFormatted;
    ctx.fillText(subText, canvas.width / 2, 360);

    // Instructions
    ctx.fillStyle = '#4d4639';
    ctx.font = 'italic 34px "Playfair Display", Georgia, serif';
    ctx.fillText('Pindai kode QR untuk memotret momen bahagia kami', canvas.width / 2, 450);

    // Find rendered QR canvas
    const sourceQrCanvas = qrCanvasRef.current?.querySelector('canvas');
    if (sourceQrCanvas) {
      // Draw white card mount for QR
      const qrBoxSize = 560;
      const qrBoxX = (canvas.width - qrBoxSize) / 2;
      const qrBoxY = 530;

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(117, 90, 33, 0.15)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.shadowColor = 'transparent'; // reset shadow

      ctx.strokeStyle = '#d1c5b5';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

      // Draw QR Code
      ctx.drawImage(sourceQrCanvas, qrBoxX + 40, qrBoxY + 40, qrBoxSize - 80, qrBoxSize - 80);
    }

    // Camera details bottom note
    ctx.fillStyle = '#755a21';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Maksimal ${event.photo_limit} Foto per Tamu`, canvas.width / 2, 1200);

    ctx.fillStyle = '#7f7668';
    ctx.font = '28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Tanpa unduh aplikasi • Langsung buka kamera HP Anda', canvas.width / 2, 1260);

    // Footer brand
    ctx.fillStyle = '#b89758';
    ctx.font = '30px "Playfair Display", Georgia, serif';
    ctx.fillText('WedSnap by Fajar Creative', canvas.width / 2, 1480);

    // Trigger download
    const link = document.createElement('a');
    link.download = `WedSnap-Kartu-Meja-${event.slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff8f5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#B89758]/20 flex items-center justify-center mx-auto mb-3 animate-pulse text-[#755a21]">
            <Icon name="photo_camera" filled size={28} />
          </div>
          <p className="text-sm text-[#4d4639]">Memuat detail acara...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#fff8f5] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-red-200 text-center max-w-sm">
          <Icon name="error" size={36} className="text-red-500 mx-auto mb-2" />
          <h2 className="font-['Playfair_Display',serif] text-lg font-bold text-[#1e1b18] mb-1">
            Terjadi Kesalahan
          </h2>
          <p className="text-xs text-[#4d4639] mb-4">{error || 'Acara tidak ditemukan'}</p>
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 rounded-xl bg-[#755a21] text-white text-xs font-semibold"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.event_date).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#fff8f5] pb-16 text-[#1e1b18]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#d1c5b5]/30 sticky top-0 z-30 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="w-10 h-10 rounded-xl bg-[#fff8f5] border border-[#d1c5b5] flex items-center justify-center text-[#1e1b18] hover:bg-[#f5ece7] transition-colors"
              aria-label="Kembali"
            >
              <Icon name="arrow_back" size={20} />
            </button>
            <div>
              <h1 className="font-['Playfair_Display',serif] text-lg font-bold text-[#1e1b18] truncate max-w-[200px]">
                {event.title}
              </h1>
              <p className="text-[11px] text-[#7f7668]">Detail &amp; QR Code Meja</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/gallery/${event.slug}`}
              target="_blank"
              className="w-10 h-10 rounded-xl bg-[#f5ece7] text-[#755a21] flex items-center justify-center hover:bg-[#ffdea4]/40 transition-colors"
              title="Buka Galeri Acara"
            >
              <Icon name="photo_library" size={20} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-6">
        {/* Event Banner Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#d1c5b5]/40 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#755a21] block">
                Acara Pernikahan
              </span>
              <h2 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#1e1b18] mt-0.5">
                {event.title}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Aktif
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-[#4d4639]">
            <div className="flex items-center gap-2">
              <Icon name="calendar_today" size={16} className="text-[#725b38]" />
              <span>{formattedDate}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <Icon name="location_on" size={16} className="text-[#725b38]" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#f5ece7] text-center">
            <div className="p-2 rounded-xl bg-[#fff8f5]">
              <span className="text-[11px] text-[#7f7668] block">Total Foto</span>
              <span className="font-['Playfair_Display',serif] text-xl font-bold text-[#755a21]">
                {photos.length}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[#fff8f5]">
              <span className="text-[11px] text-[#7f7668] block">Tamu Memotret</span>
              <span className="font-['Playfair_Display',serif] text-xl font-bold text-emerald-700">
                {guestCount}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[#fff8f5]">
              <span className="text-[11px] text-[#7f7668] block">Batas/Tamu</span>
              <span className="font-['Playfair_Display',serif] text-xl font-bold text-amber-800">
                {event.photo_limit}
              </span>
            </div>
          </div>
        </div>

        {/* Printable Table Card Preview with QR Code */}
        <div className="bg-[#fff8f5] rounded-3xl p-6 border-2 border-[#cca72f] shadow-md text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#cca72f]/20 text-[#755a21] text-[11px] font-bold uppercase tracking-widest mb-3">
            <Icon name="photo_camera" size={16} />
            Kartu Meja Pernikahan
          </div>

          <h3 className="font-['Playfair_Display',serif] text-xl font-bold text-[#1e1b18]">
            {event.title}
          </h3>
          <p className="text-xs text-[#725b38] mt-0.5 mb-4">
            Pindai QR ini dengan kamera HP untuk mulai memotret
          </p>

          {/* QR Code Container */}
          <div
            ref={qrCanvasRef}
            className="inline-block p-4 bg-white rounded-2xl shadow-inner border border-[#d1c5b5] mb-4"
          >
            <QRCodeCanvas
              value={cameraUrl}
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>

          <p className="text-xs font-semibold text-[#755a21] mb-1">
            Batas Rol: {event.photo_limit} Foto per Tamu
          </p>
          <p className="text-[11px] text-[#7f7668]">
            Tidak perlu unduh aplikasi • Cukup arahkan kamera smartphone
          </p>

          {/* Download Table Card Button */}
          <div className="mt-5 pt-4 border-t border-[#cca72f]/30 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleDownloadTableCard}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b89758] to-[#755a21] text-white text-xs font-semibold shadow hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Icon name="download" size={18} />
              Unduh Kartu Meja Siap Cetak (PNG)
            </button>
          </div>
        </div>

        {/* Link Sharing & Actions */}
        <div className="bg-white rounded-2xl p-5 border border-[#d1c5b5]/40 shadow-sm space-y-4">
          <h4 className="font-['Playfair_Display',serif] text-sm font-bold text-[#1e1b18] flex items-center gap-2">
            <Icon name="link" size={18} className="text-[#755a21]" />
            Tautan Akses Cepat
          </h4>

          {/* Camera Link */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#7f7668] block">
              Tautan Kamera Tamu
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={cameraUrl}
                className="flex-1 px-3 py-2 bg-[#fff8f5] rounded-xl border border-[#d1c5b5] text-xs font-mono text-[#4d4639] select-all truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1 ${
                  copySuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#755a21] text-white hover:bg-[#725b38]'
                }`}
              >
                <Icon name={copySuccess ? 'check' : 'content_copy'} size={16} />
                <span>{copySuccess ? 'Tersalin!' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* Gallery Link */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-[#7f7668] block">
              Tautan Galeri Foto
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={galleryUrl}
                className="flex-1 px-3 py-2 bg-[#fff8f5] rounded-xl border border-[#d1c5b5] text-xs font-mono text-[#4d4639] select-all truncate"
              />
              <button
                type="button"
                onClick={handleCopyGalleryLink}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1 ${
                  copyGallerySuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#755a21] text-white hover:bg-[#725b38]'
                }`}
              >
                <Icon name={copyGallerySuccess ? 'check' : 'content_copy'} size={16} />
                <span>{copyGallerySuccess ? 'Tersalin!' : 'Salin'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              to={`/camera/${event.slug}`}
              target="_blank"
              className="py-2.5 px-3 rounded-xl bg-[#fff8f5] border border-[#d1c5b5] text-xs font-semibold text-[#1e1b18] hover:bg-[#f5ece7] transition-colors flex items-center justify-center gap-1.5"
            >
              <Icon name="camera" size={16} className="text-[#755a21]" />
              Uji Kamera Tamu
            </Link>
            <Link
              to={`/gallery/${event.slug}`}
              target="_blank"
              className="py-2.5 px-3 rounded-xl bg-[#fff8f5] border border-[#d1c5b5] text-xs font-semibold text-[#1e1b18] hover:bg-[#f5ece7] transition-colors flex items-center justify-center gap-1.5"
            >
              <Icon name="photo_library" size={16} className="text-[#755a21]" />
              Buka Galeri Foto
            </Link>
          </div>
        </div>

        {/* Gallery Access Mode Toggle */}
        <div className="bg-white rounded-2xl p-5 border border-[#d1c5b5]/40 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              event.gallery_mode === 'public' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              <Icon name={event.gallery_mode === 'public' ? 'visibility' : 'lock'} size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1e1b18]">
                {event.gallery_mode === 'public' ? 'Galeri Publik' : 'Galeri Terkunci'}
              </h4>
              <p className="text-[11px] text-[#7f7668]">
                {event.gallery_mode === 'public'
                  ? 'Tamu undangan dapat melihat galeri bersama'
                  : 'Hanya admin yang dapat melihat foto yang masuk'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={updatingMode}
            onClick={handleToggleGalleryMode}
            className="px-3 py-1.5 rounded-lg border border-[#d1c5b5] bg-[#fff8f5] text-xs font-semibold text-[#755a21] hover:bg-[#f5ece7] transition-colors disabled:opacity-50"
          >
            {updatingMode ? 'Mengubah...' : 'Ubah Akses'}
          </button>
        </div>
      </main>
    </div>
  );
}
