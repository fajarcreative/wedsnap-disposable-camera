import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Icon } from '../components/Icon';
import type { Event } from '../types/database';

type TabKey = 'ringkasan' | 'acara';

interface DashboardStats {
  totalPhotos: number;
  activeGuests: number;
  totalQuota: number;
}

// Demo data for when Supabase is not configured
const DEMO_EVENTS: Event[] = [
  {
    id: 'demo-1',
    admin_id: 'demo-admin',
    title: 'Pernikahan Andi & Sari',
    slug: 'andi-sari',
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: 'Hotel Grand Ballroom, Jakarta',
    cover_url: null,
    photo_limit: 36,
    gallery_mode: 'public',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    admin_id: 'demo-admin',
    title: 'Pernikahan Budi & Lina',
    slug: 'budi-lina',
    event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    location: 'Gedung Serbaguna, Bandung',
    cover_url: null,
    photo_limit: 36,
    gallery_mode: 'locked',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_STATS: DashboardStats = {
  totalPhotos: 142,
  activeGuests: 28,
  totalQuota: 36,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('ringkasan');
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPhotos: 0,
    activeGuests: 0,
    totalQuota: 36,
  });
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Use demo data
      setUserName('Penyelenggara');
      setEvents(DEMO_EVENTS);
      setStats(DEMO_STATS);
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          navigate('/admin/login', { replace: true });
          return;
        }

        const user = session.user;
        setUserName(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Admin'
        );

        // Fetch events for this admin
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('admin_id', user.id)
          .order('created_at', { ascending: false });

        if (eventsError) {
          console.error('Error fetching events:', eventsError);
        } else if (eventsData) {
          const typedEvents = eventsData as unknown as Event[];
          setEvents(typedEvents);

          if (typedEvents.length > 0) {
            let totalPhotos = 0;
            let activeGuests = 0;

            for (const event of typedEvents) {
              const { count: photoCount } = await supabase
                .from('photos')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event.id);

              totalPhotos += photoCount || 0;

              const { count: sessionCount } = await supabase
                .from('camera_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', event.id);

              activeGuests += sessionCount || 0;
            }

            setStats({
              totalPhotos,
              activeGuests,
              totalQuota: typedEvents[0]?.photo_limit || 36,
            });
          }
        }
      } catch (err) {
        console.error('Dashboard init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    navigate('/admin/login', { replace: true });
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Aktif
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-outline" />
        Nonaktif
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff8f5] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#B89758]/20 mb-4 animate-pulse">
            <Icon name="photo_camera" filled size={28} className="text-[#755a21]" />
          </div>
          <p className="text-sm text-gray-500 font-['Plus_Jakarta_Sans',sans-serif]">
            Memuat dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f5] pb-24 text-[#1e1b18]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#d1c5b5]/30 sticky top-0 z-30 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#cca72f] to-[#755a21] flex items-center justify-center shadow-sm">
              <Icon name="photo_camera" size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-['Playfair_Display',serif] text-xl font-bold text-[#755a21] leading-tight">
                WedSnap
              </h1>
              <p className="text-[11px] text-[#7f7668] tracking-wider uppercase">
                Admin Panel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl bg-[#fff8f5] border border-[#d1c5b5] flex items-center justify-center text-[#755a21] font-semibold text-sm hover:bg-[#fedeb2]/40 transition-colors"
              title={`${userName} — Klik untuk keluar`}
            >
              {userName.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5">
        {/* Greeting Section */}
        <div className="mb-6">
          <span className="text-xs uppercase tracking-widest text-[#725b38] font-semibold">
            Selamat Datang
          </span>
          <h2 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#1e1b18] mt-0.5">
            Halo, {userName.split(' ')[0]}! ✨
          </h2>
          <p className="text-sm text-[#4d4639] mt-1 leading-relaxed">
            Kelola acara pernikahan dan pantau momen foto disposable camera dari para tamu.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#f5ece7] rounded-xl p-1 mb-6 border border-[#d1c5b5]/40">
          <button
            type="button"
            onClick={() => setActiveTab('ringkasan')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'ringkasan'
                ? 'bg-white text-[#755a21] shadow-sm'
                : 'text-[#4d4639] hover:text-[#1e1b18]'
            }`}
          >
            Ringkasan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('acara')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'acara'
                ? 'bg-white text-[#755a21] shadow-sm'
                : 'text-[#4d4639] hover:text-[#1e1b18]'
            }`}
          >
            Acara Saya ({events.length})
          </button>
        </div>

        {/* RINGKASAN TAB */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-5">
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Foto Masuk */}
              <div className="bg-white rounded-2xl border border-[#d1c5b5]/40 p-4 text-center shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#ffdea4]/50 flex items-center justify-center mx-auto mb-2 text-[#755a21]">
                  <Icon name="photo_library" size={20} />
                </div>
                <p className="font-['Playfair_Display',serif] text-2xl font-bold text-[#1e1b18]">
                  {stats.totalPhotos}
                </p>
                <p className="text-xs text-[#7f7668] mt-0.5 font-medium">
                  Foto Masuk
                </p>
              </div>

              {/* Tamu Aktif */}
              <div className="bg-white rounded-2xl border border-[#d1c5b5]/40 p-4 text-center shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2 text-emerald-700">
                  <Icon name="group" size={20} />
                </div>
                <p className="font-['Playfair_Display',serif] text-2xl font-bold text-[#1e1b18]">
                  {stats.activeGuests}
                </p>
                <p className="text-xs text-[#7f7668] mt-0.5 font-medium">
                  Kamera Aktif
                </p>
              </div>

              {/* Kuota/Tamu */}
              <div className="bg-white rounded-2xl border border-[#d1c5b5]/40 p-4 text-center shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-2 text-amber-800">
                  <Icon name="film" size={20} />
                </div>
                <p className="font-['Playfair_Display',serif] text-2xl font-bold text-[#1e1b18]">
                  {stats.totalQuota}
                </p>
                <p className="text-xs text-[#7f7668] mt-0.5 font-medium">
                  Batas Rol
                </p>
              </div>
            </div>

            {/* Quick Action Banner */}
            <Link
              to="/admin/events/new"
              className="flex items-center justify-between bg-gradient-to-r from-[#b89758] to-[#755a21] text-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icon name="add" size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-['Playfair_Display',serif] text-base font-semibold leading-tight">
                    Buat Acara Baru
                  </h3>
                  <p className="text-xs text-white/85 mt-0.5">
                    Hasilkan QR Code unik untuk meja pernikahan
                  </p>
                </div>
              </div>
              <Icon name="arrow_forward" size={20} className="text-white/80" />
            </Link>

            {/* Recent Events Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-['Playfair_Display',serif] text-lg font-bold text-[#1e1b18]">
                  Daftar Acara
                </h3>
                {events.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('acara')}
                    className="text-xs text-[#755a21] font-semibold hover:underline"
                  >
                    Lihat Semua ({events.length})
                  </button>
                )}
              </div>

              {events.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-[#b89758]/50 p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#fff8f5] flex items-center justify-center mx-auto mb-3 text-[#b89758]">
                    <Icon name="event" size={28} />
                  </div>
                  <h4 className="font-['Playfair_Display',serif] text-base font-bold text-[#1e1b18] mb-1">
                    Belum Ada Acara
                  </h4>
                  <p className="text-xs text-[#4d4639] mb-4">
                    Buat acara pernikahan pertama Anda dan mulai kumpulkan foto dari para tamu.
                  </p>
                  <Link
                    to="/admin/events/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#755a21] text-white text-xs font-semibold shadow hover:bg-[#725b38] transition-colors"
                  >
                    <Icon name="add" size={18} />
                    Buat Acara Baru
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 3).map((event) => (
                    <Link
                      key={event.id}
                      to={`/admin/events/${event.id}`}
                      className="block bg-white rounded-2xl border border-[#d1c5b5]/40 p-4 shadow-sm hover:shadow-md hover:border-[#b89758] transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-['Playfair_Display',serif] text-base font-bold text-[#1e1b18]">
                          {event.title}
                        </h4>
                        {getStatusBadge(event.is_active)}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-[#4d4639]">
                          <Icon name="calendar_today" size={14} className="text-[#725b38]" />
                          <span>{formatDate(event.event_date)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-xs text-[#4d4639]">
                            <Icon name="location_on" size={14} className="text-[#725b38]" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#f5ece7] text-xs text-[#725b38]">
                          <span className="flex items-center gap-1 font-medium">
                            <Icon name="photo_camera" size={14} />
                            Batas {event.photo_limit} foto/tamu
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Icon name={event.gallery_mode === 'public' ? 'visibility' : 'lock'} size={14} />
                            {event.gallery_mode === 'public' ? 'Galeri Terbuka' : 'Galeri Terkunci'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACARA TAB */}
        {activeTab === 'acara' && (
          <div className="space-y-4">
            <Link
              to="/admin/events/new"
              className="flex items-center gap-3 bg-gradient-to-r from-[#b89758] to-[#755a21] text-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon name="add" size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Buat Acara Baru</p>
                <p className="text-xs text-white/80 truncate">
                  Tambah pasangan atau jadwal pernikahan baru
                </p>
              </div>
              <Icon name="chevron_right" size={20} className="text-white/70" />
            </Link>

            {events.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#b89758]/50 p-8 text-center mt-4">
                <p className="text-sm text-[#4d4639]">
                  Belum ada acara yang dibuat.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    to={`/admin/events/${event.id}`}
                    className="block bg-white rounded-2xl border border-[#d1c5b5]/40 p-4 shadow-sm hover:shadow-md hover:border-[#b89758] transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-['Playfair_Display',serif] text-base font-bold text-[#1e1b18]">
                        {event.title}
                      </h4>
                      {getStatusBadge(event.is_active)}
                    </div>

                    <div className="space-y-1.5 text-xs text-[#4d4639]">
                      <div className="flex items-center gap-2">
                        <Icon name="calendar_today" size={14} className="text-[#725b38]" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <Icon name="location_on" size={14} className="text-[#725b38]" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f5ece7] text-xs text-[#725b38]">
                      <span className="flex items-center gap-1 font-medium">
                        <Icon name="photo_camera" size={14} />
                        {event.photo_limit} foto
                      </span>
                      <span className="flex items-center gap-1 font-medium text-[#755a21]">
                        Buka Detail &amp; QR
                        <Icon name="arrow_forward" size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Quick Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#d1c5b5]/30 z-30 pb-safe">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          <button
            type="button"
            onClick={() => setActiveTab('ringkasan')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-semibold ${
              activeTab === 'ringkasan' ? 'text-[#755a21]' : 'text-[#7f7668]'
            }`}
          >
            <Icon name="dashboard" size={22} filled={activeTab === 'ringkasan'} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('acara')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-semibold ${
              activeTab === 'acara' ? 'text-[#755a21]' : 'text-[#7f7668]'
            }`}
          >
            <Icon name="event" size={22} filled={activeTab === 'acara'} />
            <span>Acara</span>
          </button>
          <Link
            to="/admin/events/new"
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs font-semibold text-[#7f7668] hover:text-[#755a21]"
          >
            <Icon name="add_circle" size={22} />
            <span>Buat Acara</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
