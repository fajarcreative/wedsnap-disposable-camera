import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Icon } from '../components/Icon';
import type { Event } from '../types/database';

interface FormData {
  title: string;
  date: string;
  location: string;
  photoLimit: number;
  galleryMode: 'public' | 'locked';
  coverPhoto: File | null;
}

interface FormErrors {
  title?: string;
  date?: string;
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    photoLimit: 36,
    galleryMode: 'public',
    coverPhoto: null,
  });
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdSlug, setCreatedSlug] = useState('');
  const [createdEventId, setCreatedEventId] = useState('');

  // Generate slug from title
  const generateSlug = (title: string): string => {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return baseSlug ? `${baseSlug}-${randomSuffix}` : `event-${randomSuffix}`;
  };

  // Handle cover photo selection
  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSubmitError('File harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Ukuran foto sampul maksimal 5MB.');
      return;
    }

    setFormData((prev) => ({ ...prev, coverPhoto: file }));
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCoverPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    setSubmitError(null);
  };

  const removeCoverPhoto = () => {
    setFormData((prev) => ({ ...prev, coverPhoto: null }));
    setCoverPreview(null);
  };

  // Photo limit controls
  const incrementPhotoLimit = () => {
    setFormData((prev) => ({
      ...prev,
      photoLimit: Math.min(prev.photoLimit + 6, 72),
    }));
  };

  const decrementPhotoLimit = () => {
    setFormData((prev) => ({
      ...prev,
      photoLimit: Math.max(prev.photoLimit - 6, 12),
    }));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Nama acara atau pengantin wajib diisi.';
    }
    if (!formData.date) {
      newErrors.date = 'Tanggal acara pernikahan wajib diisi.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setSubmitting(true);
    const slug = generateSlug(formData.title);

    // If Supabase is not configured, show success mock state
    if (!isSupabaseConfigured()) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setCreatedSlug(slug);
      setCreatedEventId('demo-' + Date.now());
      setShowSuccess(true);
      setSubmitting(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/admin/login', { replace: true });
        return;
      }

      let coverUrl: string | null = null;

      // Upload cover photo if provided
      if (formData.coverPhoto) {
        const fileExt = formData.coverPhoto.name.split('.').pop() || 'jpg';
        const fileName = `${slug}-${Date.now()}.${fileExt}`;
        const filePath = `covers/${session.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('wedsnap-photos')
          .upload(filePath, formData.coverPhoto);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('wedsnap-photos')
            .getPublicUrl(filePath);
          coverUrl = urlData.publicUrl;
        } else {
          console.warn('Cover photo upload note:', uploadError.message);
        }
      }

      // Insert event into database
      const insertPayload = {
        admin_id: session.user.id,
        title: formData.title.trim(),
        slug,
        event_date: formData.date,
        location: formData.location.trim() || null,
        cover_url: coverUrl,
        photo_limit: formData.photoLimit,
        gallery_mode: formData.galleryMode,
        is_active: true,
      };

      const { data: eventData, error: insertError } = await supabase
        .from('events')
        .insert(insertPayload as never)
        .select()
        .single();

      if (insertError) {
        setSubmitError(`Gagal membuat acara: ${insertError.message}`);
        return;
      }

      const created = eventData as unknown as Event;
      setCreatedSlug(created.slug);
      setCreatedEventId(created.id);
      setShowSuccess(true);
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError('Terjadi kesalahan saat menyimpan acara. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, '');
  const cameraUrl = `${window.location.origin}${basePrefix}/camera/${createdSlug}`;

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#fff8f5] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-lg border border-[#d1c5b5]/30 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Icon name="check_circle" filled size={40} />
          </div>

          <h2 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#1e1b18] mb-2">
            Acara Berhasil Dibuat!
          </h2>
          <p className="text-sm text-[#4d4639] mb-6">
            Acara <strong>{formData.title}</strong> siap digunakan. Anda dapat mencetak kartu meja QR Code dan membagikan tautan kamera kepada para tamu.
          </p>

          <div className="p-3.5 bg-[#f5ece7] rounded-xl text-left mb-6">
            <span className="text-[11px] font-semibold text-[#7f7668] uppercase tracking-wider block mb-1">
              Tautan Kamera Tamu
            </span>
            <div className="text-xs font-mono text-[#755a21] truncate break-all select-all">
              {cameraUrl}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate(`/admin/events/${createdEventId}`)}
              className="w-full py-3.5 rounded-xl bg-[#755a21] text-white text-sm font-semibold shadow hover:bg-[#725b38] transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="qr_code_2" size={20} />
              Lihat Detail &amp; Unduh QR Code
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="w-full py-3 rounded-xl bg-[#fff8f5] border border-[#d1c5b5] text-[#1e1b18] text-sm font-semibold hover:bg-[#f5ece7] transition-colors"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f5] pb-12">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#d1c5b5]/30 sticky top-0 z-30 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-[#fff8f5] border border-[#d1c5b5] flex items-center justify-center text-[#1e1b18] hover:bg-[#f5ece7] transition-colors"
            aria-label="Kembali"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <div>
            <h1 className="font-['Playfair_Display',serif] text-lg font-bold text-[#1e1b18]">
              Buat Acara Baru
            </h1>
            <p className="text-[11px] text-[#7f7668]">
              Disposable Wedding Camera Setup
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <Icon name="error" size={18} />
              <span>{submitError}</span>
            </div>
          )}

          {/* Nama Acara / Pasangan */}
          <div className="bg-white p-5 rounded-2xl border border-[#d1c5b5]/40 shadow-sm space-y-4">
            <h2 className="font-['Playfair_Display',serif] text-base font-bold text-[#1e1b18] flex items-center gap-2">
              <Icon name="favorite" size={20} className="text-[#b89758]" filled />
              Informasi Pasangan
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#1e1b18] mb-1.5">
                Nama Acara / Pasangan Pengantin <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Radit &amp; Aluna"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[#fff8f5] focus:outline-none focus:ring-2 focus:ring-[#b89758] ${
                  errors.title ? 'border-red-400' : 'border-[#d1c5b5]'
                }`}
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1e1b18] mb-1.5">
                Tanggal Acara <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[#fff8f5] focus:outline-none focus:ring-2 focus:ring-[#b89758] ${
                  errors.date ? 'border-red-400' : 'border-[#d1c5b5]'
                }`}
              />
              {errors.date && (
                <p className="text-xs text-red-500 mt-1">{errors.date}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1e1b18] mb-1.5">
                Lokasi / Venue (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Gedung Arsip Nasional, Jakarta"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d1c5b5] text-sm bg-[#fff8f5] focus:outline-none focus:ring-2 focus:ring-[#b89758]"
              />
            </div>
          </div>

          {/* Konfigurasi Kamera Disposable */}
          <div className="bg-white p-5 rounded-2xl border border-[#d1c5b5]/40 shadow-sm space-y-4">
            <h2 className="font-['Playfair_Display',serif] text-base font-bold text-[#1e1b18] flex items-center gap-2">
              <Icon name="photo_camera" size={20} className="text-[#b89758]" filled />
              Pengaturan Rol Kamera
            </h2>

            {/* Quota Limit Stepper */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold text-[#1e1b18] block">
                    Batas Foto per Tamu
                  </span>
                  <span className="text-[11px] text-[#7f7668]">
                    Menyerupai rol film analog (Standar 36 foto)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={decrementPhotoLimit}
                    className="w-8 h-8 rounded-lg bg-[#f5ece7] text-[#1e1b18] font-bold flex items-center justify-center hover:bg-[#e9e1dc] active:scale-95"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-base text-[#755a21] font-mono">
                    {formData.photoLimit}
                  </span>
                  <button
                    type="button"
                    onClick={incrementPhotoLimit}
                    className="w-8 h-8 rounded-lg bg-[#f5ece7] text-[#1e1b18] font-bold flex items-center justify-center hover:bg-[#e9e1dc] active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery Access Mode */}
            <div className="pt-3 border-t border-[#f5ece7]">
              <span className="text-xs font-semibold text-[#1e1b18] block mb-2">
                Akses Galeri Foto
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, galleryMode: 'public' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.galleryMode === 'public'
                      ? 'border-[#755a21] bg-[#ffdea4]/20'
                      : 'border-[#d1c5b5] bg-[#fff8f5]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[#1e1b18] mb-0.5">
                    <Icon name="visibility" size={16} className="text-[#755a21]" />
                    Galeri Terbuka
                  </div>
                  <p className="text-[11px] text-[#7f7668] leading-tight">
                    Tamu dapat melihat galeri foto bersama
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, galleryMode: 'locked' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.galleryMode === 'locked'
                      ? 'border-[#755a21] bg-[#ffdea4]/20'
                      : 'border-[#d1c5b5] bg-[#fff8f5]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[#1e1b18] mb-0.5">
                    <Icon name="lock" size={16} className="text-[#755a21]" />
                    Terkunci
                  </div>
                  <p className="text-[11px] text-[#7f7668] leading-tight">
                    Hanya admin yang dapat melihat foto
                  </p>
                </button>
              </div>
            </div>

            {/* Cover photo (optional) */}
            <div className="pt-3 border-t border-[#f5ece7]">
              <span className="text-xs font-semibold text-[#1e1b18] block mb-1.5">
                Foto Sampul Acara (Opsional)
              </span>
              {coverPreview ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#d1c5b5]">
                  <img
                    src={coverPreview}
                    alt="Pratinjau Sampul"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeCoverPhoto}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-[#d1c5b5] rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-center cursor-pointer hover:border-[#b89758] transition-colors bg-[#fff8f5]">
                  <Icon name="add_photo_alternate" size={28} className="text-[#b89758]" />
                  <span className="text-xs font-semibold text-[#1e1b18]">
                    Pilih Foto Sampul
                  </span>
                  <span className="text-[10px] text-[#7f7668]">
                    JPG, PNG, atau WebP (Maks 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverPhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#b89758] to-[#755a21] text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan Acara...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size={20} />
                  <span>Buat Acara &amp; Buat QR Code</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
