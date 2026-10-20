import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Icon } from '../components/Icon';
import type { Event, Photo } from '../types/database';

export default function SharedGallery() {
  const { slug } = useParams<{ slug: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userSessionId, setUserSessionId] = useState<string | null>(null);

  const fetchGalleryData = useCallback(async () => {
    if (!slug) return;

    try {
      if (!isSupabaseConfigured() || slug === 'demo' || slug.startsWith('demo-')) {
        // Mock demo event & photos
        const mockEvent: Event = {
          id: 'demo-event-id',
          admin_id: 'demo-admin-id',
          title: 'Radit & Aluna',
          slug: slug || 'radit-aluna',
          event_date: '2025-10-18',
          location: 'Gedung Arsip Nasional, Jakarta',
          cover_url: null,
          photo_limit: 36,
          gallery_mode: 'public',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockPhotos: Photo[] = [
          {
            id: 'p-1',
            event_id: mockEvent.id,
            session_id: 'demo-session',
            storage_path: 'mock/1.jpg',
            public_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
            file_size: 1024000,
            mime_type: 'image/jpeg',
            width: 800,
            height: 1000,
            upload_status: 'success',
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'p-2',
            event_id: mockEvent.id,
            session_id: 'demo-session',
            storage_path: 'mock/2.jpg',
            public_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
            file_size: 1024000,
            mime_type: 'image/jpeg',
            width: 800,
            height: 1000,
            upload_status: 'success',
            created_at: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: 'p-3',
            event_id: mockEvent.id,
            session_id: 'demo-other',
            storage_path: 'mock/3.jpg',
            public_url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80',
            file_size: 1024000,
            mime_type: 'image/jpeg',
            width: 800,
            height: 1000,
            upload_status: 'success',
            created_at: new Date(Date.now() - 10800000).toISOString(),
          },
        ];

        setEvent(mockEvent);
        setPhotos(mockPhotos);
        setUserSessionId('demo-session');
        setLoading(false);
        return;
      }

      // 1. Fetch Event by slug
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (eventErr || !eventData) {
        setError('Acara pernikahan tidak ditemukan.');
        setLoading(false);
        return;
      }

      const currentEvent = eventData as unknown as Event;
      setEvent(currentEvent);

      // Check current user auth to see if they are the admin
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const isAdmin = authSession?.user.id === currentEvent.admin_id;

      // Privacy Check: if locked and not admin
      if (currentEvent.gallery_mode === 'locked' && !isAdmin) {
        setIsLocked(true);
        setLoading(false);
        return;
      }

      // Check local guest session ID
      const deviceId = localStorage.getItem(`wedsnap_device_id_${slug}`);
      if (deviceId) {
        const { data: guestSession } = await supabase
          .from('camera_sessions')
          .select('id')
          .eq('event_id', currentEvent.id)
          .eq('device_id', deviceId)
          .maybeSingle();

        if (guestSession) {
          const sessionObj = guestSession as unknown as { id: string };
          setUserSessionId(sessionObj.id);
        }
      }

      // 2. Fetch Photos for this event
      const { data: photosData, error: photosErr } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', currentEvent.id)
        .eq('upload_status', 'success')
        .order('created_at', { ascending: false });

      if (photosErr) {
        console.error('Error fetching photos:', photosErr);
        setError('Gagal memuat foto galeri.');
      } else if (photosData) {
        setPhotos(photosData as unknown as Photo[]);
      }
    } catch (err) {
      console.error('Gallery error:', err);
      setError('Terjadi kesalahan saat memuat galeri.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchGalleryData();
  }, [fetchGalleryData]);

  // Realtime subscription for incoming photos
  useEffect(() => {
    if (!event || !isSupabaseConfigured() || event.id.startsWith('demo-')) return;

    const channel = supabase
      .channel(`realtime:gallery-${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          const newPhoto = payload.new as Photo;
          if (newPhoto.upload_status === 'success') {
            setPhotos((prev) => [newPhoto, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchGalleryData();
  };

  // Download single photo
  const handleDownloadPhoto = async (photo: Photo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!photo.public_url) return;

    try {
      const response = await fetch(photo.public_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WedSnap-${event?.slug || 'wedding'}-${photo.id.slice(0, 6)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(photo.public_url, '_blank');
    }
  };

  // Filtered photos
  const displayedPhotos = photos.filter((p) => {
    if (activeTab === 'mine') {
      return userSessionId ? p.session_id === userSessionId : false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff8f5] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#ffdea4]/50 flex items-center justify-center mx-auto mb-3 animate-pulse text-[#755a21]">
            <Icon name="photo_library" size={32} />
          </div>
          <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#1e1b18]">
            Memuat Galeri...
          </h2>
          <p className="text-xs text-[#7f7668] mt-1">Mengumpulkan foto dari para tamu</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#fff8f5] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-[#d1c5b5]/40 text-center max-w-sm shadow-md">
          <div className="w-14 h-14 rounded-full bg-[#ffdea4]/40 text-[#755a21] flex items-center justify-center mx-auto mb-3">
            <Icon name="lock" size={28} />
          </div>
          <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#1e1b18] mb-2">
            Galeri Sedang Dikurasi
          </h2>
          <p className="text-xs text-[#4d4639] mb-6 leading-relaxed">
            Foto-foto dari acara <strong>{event?.title}</strong> sedang dipersiapkan oleh mempelai pengantin. Silakan cek kembali nanti!
          </p>
          <Link
            to={`/camera/${slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#755a21] text-white text-xs font-semibold shadow hover:bg-[#725b38]"
          >
            <Icon name="photo_camera" size={18} />
            <span>Kembali ke Kamera Tamu</span>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#fff8f5] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl border border-red-200 text-center max-w-sm">
          <Icon name="error" size={36} className="text-red-500 mx-auto mb-2" />
          <h2 className="font-['Playfair_Display',serif] text-lg font-bold text-[#1e1b18] mb-1">
            Galeri Tidak Tersedia
          </h2>
          <p className="text-xs text-[#4d4639] mb-4">{error || 'Acara tidak ditemukan'}</p>
          <Link
            to="/"
            className="inline-block px-4 py-2 rounded-xl bg-[#755a21] text-white text-xs font-semibold"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f5] pb-24 text-[#1e1b18]">
      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-[#d1c5b5]/30 sticky top-0 z-30 pt-safe">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#cca72f] to-[#755a21] flex items-center justify-center text-white shadow-sm">
              <Icon name="photo_library" size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#725b38] tracking-widest block leading-none">
                WedSnap Gallery
              </span>
              <h1 className="font-['Playfair_Display',serif] text-lg font-bold text-[#1e1b18] truncate max-w-[200px]">
                {event.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              className={`w-9 h-9 rounded-xl bg-[#fff8f5] border border-[#d1c5b5] flex items-center justify-center text-[#755a21] hover:bg-[#f5ece7] active:scale-95 transition-transform ${
                refreshing ? 'animate-spin' : ''
              }`}
              title="Perbarui Galeri"
            >
              <Icon name="refresh" size={18} />
            </button>
            <Link
              to={`/camera/${event.slug}`}
              className="px-3 py-1.5 rounded-xl bg-[#755a21] text-white text-xs font-semibold flex items-center gap-1.5 shadow active:scale-95"
            >
              <Icon name="photo_camera" size={16} />
              <span>Foto</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Gallery Title & Summary Pill */}
        <div className="bg-white rounded-3xl p-5 border border-[#d1c5b5]/40 shadow-sm text-center">
          <span className="text-[11px] font-semibold text-[#755a21] tracking-wider uppercase">
            Koleksi Momen Tamu
          </span>
          <h2 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#1e1b18] mt-0.5">
            {event.title}
          </h2>
          <p className="text-xs text-[#725b38] mt-1">
            {new Date(event.event_date).toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {event.location ? ` • ${event.location}` : ''}
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5ece7] text-[#755a21] text-xs font-semibold mt-3">
            <Icon name="photo_camera" size={16} />
            <span>{photos.length} Foto Terkumpul</span>
          </div>
        </div>

        {/* Tab Filters: Semua Foto vs Foto Saya */}
        <div className="flex bg-[#f5ece7] rounded-xl p-1 border border-[#d1c5b5]/40">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-[#755a21] shadow-sm'
                : 'text-[#7f7668] hover:text-[#1e1b18]'
            }`}
          >
            Semua Foto ({photos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'mine'
                ? 'bg-white text-[#755a21] shadow-sm'
                : 'text-[#7f7668] hover:text-[#1e1b18]'
            }`}
          >
            Foto Saya ({photos.filter((p) => p.session_id === userSessionId).length})
          </button>
        </div>

        {/* Empty State */}
        {displayedPhotos.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-[#b89758]/50 p-10 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#fff8f5] text-[#b89758] flex items-center justify-center mx-auto">
              <Icon name="photo_library" size={36} />
            </div>
            <h3 className="font-['Playfair_Display',serif] text-lg font-bold text-[#1e1b18]">
              {activeTab === 'mine' ? 'Belum Ada Foto Anda' : 'Belum Ada Foto'}
            </h3>
            <p className="text-xs text-[#4d4639] max-w-xs mx-auto leading-relaxed">
              {activeTab === 'mine'
                ? 'Anda belum mengabadikan foto dalam sesi ini. Buka kamera untuk mulai mengambil jepretan kenangan!'
                : 'Jadilah yang pertama mengabadikan momen berharga di pernikahan ini!'}
            </p>
            <Link
              to={`/camera/${event.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#755a21] text-white text-xs font-semibold shadow hover:bg-[#725b38]"
            >
              <Icon name="photo_camera" size={18} />
              <span>Buka Kamera Sekarang</span>
            </Link>
          </div>
        ) : (
          /* Responsive Photo Grid (Polaroid Style) */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayedPhotos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="bg-white rounded-2xl p-2 pb-2.5 border border-[#d1c5b5]/40 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col"
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black/5">
                  <img
                    src={photo.public_url || ''}
                    alt={`Momen ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  {/* Zoom button badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(photo);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="zoom_in" size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 px-1 text-[11px] text-[#7f7668]">
                  <span className="font-mono text-[10px]">
                    #{displayedPhotos.length - index}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDownloadPhoto(photo, e)}
                    className="w-6 h-6 rounded-full hover:bg-[#f5ece7] text-[#755a21] flex items-center justify-center transition-colors"
                    title="Unduh Foto"
                  >
                    <Icon name="download" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 pt-safe pb-safe animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-mono text-stone-300">
              {new Date(selectedPhoto.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleDownloadPhoto(selectedPhoto, e)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center active:scale-95"
                title="Unduh Foto"
              >
                <Icon name="download" size={20} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center active:scale-95"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
          </div>

          {/* Lightbox Image View */}
          <div
            className="flex-1 flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.public_url || ''}
              alt="Preview Foto Penuh"
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>

          {/* Lightbox Footer */}
          <div className="text-center text-xs text-stone-400 py-2">
            <span>WedSnap by Fajar Creative • Ketuk di luar untuk menutup</span>
          </div>
        </div>
      )}

      {/* Floating Action Button: Go To Camera */}
      <div className="fixed bottom-6 right-6 z-30">
        <Link
          to={`/camera/${event.slug}`}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[#cca72f] to-[#755a21] text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform border-2 border-white"
          title="Buka Kamera Tamu"
        >
          <Icon name="photo_camera" size={28} />
        </Link>
      </div>
    </div>
  );
}
