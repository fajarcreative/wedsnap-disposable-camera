import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Icon } from '../components/Icon';
import type { Event, CameraSession } from '../types/database';

interface UploadQueueItem {
  id: string;
  blob: Blob;
  previewUrl: string;
  status: 'uploading' | 'success' | 'failed';
  errorMessage?: string;
  timestamp: number;
}

export default function GuestCamera() {
  const { slug } = useParams<{ slug: string }>();

  // Event & Session State
  const [event, setEvent] = useState<Event | null>(null);
  const [session, setSession] = useState<CameraSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  // Camera State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Roll & Photo Counter
  const [photosTaken, setPhotosTaken] = useState(0);
  const [maxPhotos, setMaxPhotos] = useState(36);

  // Upload Queue & Photos Taken in Current Session
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [lastPhotoThumb, setLastPhotoThumb] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound generator using Web Audio API for tactile shutter click & film winding
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Shutter Click: Noise burst + quick transient pitch drop
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 3;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();

      // Film Winder click after 150ms
      setTimeout(() => {
        const winderOsc = ctx.createOscillator();
        const winderGain = ctx.createGain();
        winderOsc.type = 'triangle';
        winderOsc.frequency.setValueAtTime(400, ctx.currentTime);
        winderOsc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
        winderGain.gain.setValueAtTime(0.3, ctx.currentTime);
        winderGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        winderOsc.connect(winderGain);
        winderGain.connect(ctx.destination);
        winderOsc.start();
        winderOsc.stop(ctx.currentTime + 0.12);
      }, 150);
    } catch {
      // Audio autoplay restrictions or unsupported
    }
  }, []);

  // 1. Initialize Event & Device Session
  useEffect(() => {
    let isMounted = true;

    const initEventAndSession = async () => {
      setLoading(true);
      setEventError(null);

      try {
        if (!slug) {
          setEventError('Tautan acara tidak valid.');
          setLoading(false);
          return;
        }

        // Get persistent device ID
        const storageKey = `wedsnap_device_id_${slug}`;
        let deviceId = localStorage.getItem(storageKey);
        if (!deviceId) {
          deviceId = uuidv4();
          localStorage.setItem(storageKey, deviceId);
        }

        if (!isSupabaseConfigured() || slug === 'demo' || slug.startsWith('demo-')) {
          // Demo fallback mode
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

          const mockSession: CameraSession = {
            id: 'demo-session-' + deviceId.slice(0, 8),
            event_id: mockEvent.id,
            device_id: deviceId,
            guest_name: null,
            photos_taken: 0,
            max_photos: 36,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          };

          if (isMounted) {
            setEvent(mockEvent);
            setSession(mockSession);
            setMaxPhotos(mockEvent.photo_limit);
            setPhotosTaken(0);
            setLoading(false);
          }
          return;
        }

        // Fetch active event by slug
        const { data: eventData, error: eventErr } = await supabase
          .from('events')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (eventErr || !eventData) {
          if (isMounted) {
            setEventError('Acara pernikahan tidak ditemukan atau sudah tidak aktif.');
            setLoading(false);
          }
          return;
        }

        const currentEvent = eventData as unknown as Event;

        // Fetch or create camera session for this device
        let currentSession: CameraSession | null = null;
        const { data: existingSession, error: sessionFetchErr } = await supabase
          .from('camera_sessions')
          .select('*')
          .eq('event_id', currentEvent.id)
          .eq('device_id', deviceId)
          .maybeSingle();

        if (sessionFetchErr && sessionFetchErr.code !== 'PGRST116') {
          console.error('Session fetch error:', sessionFetchErr);
        }

        if (existingSession) {
          currentSession = existingSession as unknown as CameraSession;
        } else {
          // Create new camera session
          const { data: newSession, error: createSessionErr } = await supabase
            .from('camera_sessions')
            .insert({
              event_id: currentEvent.id,
              device_id: deviceId,
              max_photos: currentEvent.photo_limit || 36,
            } as never)
            .select()
            .single();

          if (createSessionErr) {
            console.error('Create session error:', createSessionErr);
          } else {
            currentSession = newSession as unknown as CameraSession;
          }
        }

        if (isMounted) {
          setEvent(currentEvent);
          setSession(currentSession);
          setMaxPhotos(currentSession?.max_photos || currentEvent.photo_limit || 36);
          setPhotosTaken(currentSession?.photos_taken || 0);
          setLoading(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (isMounted) {
          setEventError('Terjadi kesalahan saat memuat sesi kamera.');
          setLoading(false);
        }
      }
    };

    initEventAndSession();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // 2. Start Web Camera Stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Kamera tidak didukung oleh browser ini.');
      setHasPermission(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setHasPermission(true);
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      console.warn('Camera access error:', errorObj.name, errorObj.message);

      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        setCameraError('Izin akses kamera ditolak. Silakan berikan izin di pengaturan browser.');
      } else if (errorObj.name === 'NotFoundError' || errorObj.name === 'DevicesNotFoundError') {
        setCameraError('Kamera tidak ditemukan pada perangkat Anda.');
      } else {
        setCameraError('Gagal mengakses kamera: ' + (errorObj.message || 'Periksa izin kamera Anda.'));
      }
      setHasPermission(false);
    }
  }, []);

  // Switch facing mode
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Trigger camera start once event is ready
  useEffect(() => {
    if (event && !eventError) {
      startCamera(facingMode);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [event, eventError, facingMode, startCamera]);

  // 3. Upload Photo Worker
  const uploadPhotoItem = useCallback(
    async (item: UploadQueueItem) => {
      if (!event || !session) return;

      // If in demo mode
      if (!isSupabaseConfigured() || event.id.startsWith('demo-')) {
        setTimeout(() => {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'success' } : q))
          );
        }, 1200);
        return;
      }

      try {
        const fileExt = 'jpg';
        const fileName = `${event.id}/${session.id}/${Date.now()}-${uuidv4().slice(0, 8)}.${fileExt}`;

        // 1. Upload to Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('wedsnap-photos')
          .upload(fileName, item.blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (storageError) {
          throw new Error(`Gagal mengunggah berkas: ${storageError.message}`);
        }

        // 2. Get Public URL
        const { data: urlData } = supabase.storage
          .from('wedsnap-photos')
          .getPublicUrl(fileName);

        // 3. Insert into photos table (backend trigger validates 36 max count and increments photos_taken!)
        const { error: dbError } = await supabase.from('photos').insert({
          event_id: event.id,
          session_id: session.id,
          storage_path: fileName,
          public_url: urlData.publicUrl,
          file_size: item.blob.size,
          mime_type: 'image/jpeg',
          upload_status: 'success',
        } as never);

        if (dbError) {
          throw new Error(`Gagal menyimpan data foto: ${dbError.message}`);
        }

        // Mark queue item success
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'success' } : q))
        );
      } catch (err: unknown) {
        const errMessage = (err as Error).message || 'Koneksi terputus saat mengunggah.';
        console.error('Photo upload failed:', errMessage);
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'failed', errorMessage: errMessage } : q
          )
        );
      }
    },
    [event, session]
  );

  // 4. Capture Photo from Video Preview
  const capturePhoto = async () => {
    if (isCapturing) return;
    if (photosTaken >= maxPhotos) {
      alert(`Anda telah mencapai batas maksimal ${maxPhotos} foto untuk sesi ini!`);
      return;
    }

    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      alert('Preview kamera belum siap.');
      return;
    }

    setIsCapturing(true);

    // Audio & flash feedback
    playShutterSound();
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    try {
      // Create high-res canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsCapturing(false);
        return;
      }

      // If front camera, flip horizontally for natural selfie
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to JPEG blob with good compression
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
      );

      if (!blob) {
        setIsCapturing(false);
        return;
      }

      const previewUrl = URL.createObjectURL(blob);
      setLastPhotoThumb(previewUrl);

      // Increment photos counter locally
      const newCount = photosTaken + 1;
      setPhotosTaken(newCount);

      // Create queue item
      const queueItem: UploadQueueItem = {
        id: uuidv4(),
        blob,
        previewUrl,
        status: 'uploading',
        timestamp: Date.now(),
      };

      setUploadQueue((prev) => [queueItem, ...prev]);

      // Kick off upload
      uploadPhotoItem(queueItem);
    } catch (err) {
      console.error('Error during photo capture:', err);
      alert('Gagal mengambil foto. Silakan coba lagi.');
    } finally {
      setTimeout(() => setIsCapturing(false), 400);
    }
  };

  // Retry failed upload
  const handleRetryUpload = (item: UploadQueueItem) => {
    setUploadQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', errorMessage: undefined } : q))
    );
    uploadPhotoItem(item);
  };

  // Remaining photos
  const remainingPhotos = Math.max(0, maxPhotos - photosTaken);
  const isRollFinished = remainingPhotos === 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#fff8f5] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#ffdea4]/50 flex items-center justify-center mx-auto mb-3 animate-pulse text-[#755a21]">
            <Icon name="photo_camera" filled size={36} />
          </div>
          <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#1e1b18]">
            WedSnap
          </h2>
          <p className="text-xs text-[#7f7668] mt-1">Membuka kamera pernikahan...</p>
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="fixed inset-0 bg-[#fff8f5] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl border border-red-200 text-center max-w-sm shadow-md">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <Icon name="error" size={28} />
          </div>
          <h2 className="font-['Playfair_Display',serif] text-lg font-bold text-[#1e1b18] mb-1">
            Acara Tidak Ditemukan
          </h2>
          <p className="text-xs text-[#4d4639] mb-5 leading-relaxed">
            {eventError || 'Kode acara tidak valid atau sudah kedaluwarsa. Silakan tanyakan kepada pengantin atau panitia.'}
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#755a21] text-white text-xs font-semibold"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#1e1b18] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Presence & Event Pill */}
      <header className="relative z-20 pt-safe px-3 pt-3">
        <div className="bg-[#fff8f5]/90 backdrop-blur-md rounded-2xl p-2.5 shadow-md flex items-center justify-between border border-[#d1c5b5]/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#cca72f]/20 flex items-center justify-center text-[#755a21] shrink-0">
              <Icon name="favorite" size={18} filled />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-['Playfair_Display',serif] font-bold text-sm text-[#1e1b18] truncate leading-tight">
                {event.title}
              </span>
              <span className="text-[10px] text-[#725b38] truncate">
                {new Date(event.event_date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {event.location ? ` • ${event.location}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/gallery/${event.slug}`}
              className="px-2.5 py-1 rounded-full bg-[#fff8f5] border border-[#d1c5b5] text-[11px] font-semibold text-[#755a21] flex items-center gap-1 shadow-sm active:scale-95"
            >
              <Icon name="photo_library" size={14} />
              <span>Galeri</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Camera Viewfinder Area */}
      <main className="relative flex-1 flex items-center justify-center p-3 overflow-hidden">
        <div className="relative w-full aspect-[3/4] max-h-[72vh] rounded-2xl overflow-hidden bg-black shadow-2xl border-4 border-[#34302c]">
          {/* Live Video Preview */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-transform ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />

          {/* Flash Effect Overlay */}
          <div
            className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-30 ${
              isFlashActive ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Vintage Disposable Film Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5 z-10 text-white/90">
            {/* Top Reticle */}
            <div className="flex justify-between items-center text-[10px] font-mono tracking-widest">
              <span className="bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-amber-200">
                WS-400 FILM
              </span>
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>LIVE</span>
              </div>
            </div>

            {/* Rule of Thirds Thin Overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
              <div className="border-r border-white/60" />
              <div className="border-r border-white/60" />
              <div />
              <div className="border-r border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-b border-white/60" />
              <div className="border-r border-white/60" />
              <div className="border-r border-white/60" />
              <div />
            </div>

            {/* Four Corner Framing Brackets */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[#ffdea4]" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[#ffdea4]" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[#ffdea4]" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[#ffdea4]" />

            {/* Bottom Status line */}
            <div className="flex justify-between items-end text-[10px] font-mono">
              <span className="bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded">
                F2.8 • 1/60s
              </span>
              <span className="bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-amber-200">
                EXP: {photosTaken}/{maxPhotos}
              </span>
            </div>
          </div>

          {/* Camera Permission Banner (if not granted or denied) */}
          {hasPermission === false && (
            <div className="absolute inset-0 bg-[#1e1b18]/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center mb-3">
                <Icon name="videocam_off" size={32} />
              </div>
              <h3 className="font-['Playfair_Display',serif] text-lg font-bold mb-1">
                Izin Kamera Diperlukan
              </h3>
              <p className="text-xs text-stone-300 mb-4 max-w-xs leading-relaxed">
                {cameraError || 'WedSnap membutuhkan izin akses kamera HP Anda untuk mengambil foto pernikahan.'}
              </p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-5 py-2.5 rounded-full bg-[#cca72f] hover:bg-[#b89758] text-[#1e1b18] text-xs font-bold shadow-lg transition-transform active:scale-95"
              >
                Izinkan Kamera
              </button>
            </div>
          )}

          {/* Roll Finished Overlay */}
          {isRollFinished && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-35 flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Icon name="check_circle" size={36} filled />
              </div>
              <h3 className="font-['Playfair_Display',serif] text-xl font-bold mb-1 text-[#ffdea4]">
                Rol Kamera Telah Habis!
              </h3>
              <p className="text-xs text-stone-300 mb-5 max-w-xs leading-relaxed">
                Anda telah menggunakan seluruh {maxPhotos} jepretan foto disposable untuk acara ini. Terima kasih telah mengabadikan momen berharga!
              </p>
              <Link
                to={`/gallery/${event.slug}`}
                className="px-6 py-3 rounded-full bg-[#cca72f] text-[#1e1b18] text-xs font-bold shadow-lg active:scale-95 flex items-center gap-2"
              >
                <Icon name="photo_library" size={18} />
                <span>Lihat Foto di Galeri Acara</span>
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Upload Status Banner */}
      {uploadQueue.length > 0 && (
        <div className="px-4 py-1 z-20">
          {uploadQueue[0].status === 'uploading' && (
            <div className="bg-[#cca72f]/90 backdrop-blur-md text-[#1e1b18] px-3 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 shadow">
              <span className="w-3.5 h-3.5 border-2 border-[#1e1b18] border-t-transparent rounded-full animate-spin" />
              <span>Mengunggah foto ke rol cloud...</span>
            </div>
          )}
          {uploadQueue[0].status === 'success' && (
            <div className="bg-emerald-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow">
              <Icon name="check" size={16} />
              <span>Foto berhasil diunggah ke galeri!</span>
            </div>
          )}
          {uploadQueue[0].status === 'failed' && (
            <div className="bg-red-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center justify-between shadow">
              <div className="flex items-center gap-1.5 truncate">
                <Icon name="cloud_off" size={16} />
                <span className="truncate">Gagal mengunggah foto.</span>
              </div>
              <button
                type="button"
                onClick={() => handleRetryUpload(uploadQueue[0])}
                className="bg-white text-red-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ml-2 active:scale-95"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Camera Controls & Shutter Deck */}
      <footer className="relative z-20 pb-safe pt-2 pb-4 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="max-w-md mx-auto px-6 flex flex-col gap-3">
          {/* Film Exposure Progress HUD */}
          <div className="flex items-center justify-between text-xs text-stone-300 font-mono px-2">
            <span className="flex items-center gap-1 text-[#ffdea4]">
              <Icon name="film" size={16} />
              Sisa Rol:
            </span>
            <span className="text-base font-bold text-white tracking-widest">
              {remainingPhotos} <span className="text-xs text-stone-400 font-normal">/ {maxPhotos}</span>
            </span>
          </div>

          <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#cca72f] to-[#b89758] transition-all duration-300"
              style={{ width: `${(photosTaken / maxPhotos) * 100}%` }}
            />
          </div>

          {/* Action Row: Thumbnail - Shutter Button - Flip Camera */}
          <div className="flex items-center justify-between pt-1">
            {/* Last Photo Thumbnail / History Trigger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="w-13 h-13 rounded-2xl bg-[#34302c] border-2 border-[#d1c5b5]/40 overflow-hidden flex items-center justify-center relative active:scale-90 transition-transform shadow-md"
              title="Lihat Rol Foto Anda"
            >
              {lastPhotoThumb ? (
                <img
                  src={lastPhotoThumb}
                  alt="Foto Terakhir"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon name="photo_library" size={24} className="text-[#d1c5b5]" />
              )}
              {uploadQueue.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#cca72f] text-[#1e1b18] text-[10px] font-bold flex items-center justify-center">
                  {uploadQueue.length}
                </span>
              )}
            </button>

            {/* Disposable Camera Tactile Shutter Button */}
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-[#cca72f]/20 p-1 flex items-center justify-center">
                <button
                  type="button"
                  disabled={isCapturing || isRollFinished || hasPermission === false}
                  onClick={capturePhoto}
                  className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-150 flex items-center justify-center ${
                    isRollFinished || hasPermission === false
                      ? 'bg-stone-600 opacity-50 cursor-not-allowed'
                      : 'bg-gradient-to-br from-[#ffdea4] via-[#cca72f] to-[#755a21] active:scale-90 active:brightness-90 shadow-[0_0_20px_rgba(204,167,47,0.4)]'
                  }`}
                  aria-label="Ambil Foto"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white/50" />
                </button>
              </div>
            </div>

            {/* Flip Camera Button */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="w-13 h-13 rounded-2xl bg-[#34302c] border-2 border-[#d1c5b5]/40 text-[#ffdea4] flex items-center justify-center active:scale-90 transition-transform shadow-md"
              title="Ganti Kamera Depan/Belakang"
            >
              <Icon name="flip_camera_ios" size={24} />
            </button>
          </div>
        </div>
      </footer>

      {/* Drawer Sheet for Photos Taken in This Session */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#fff8f5] rounded-t-3xl max-h-[75vh] flex flex-col p-5 pb-safe animate-slide-up text-[#1e1b18]">
            <div className="flex items-center justify-between pb-3 border-b border-[#d1c5b5]/40">
              <div>
                <h3 className="font-['Playfair_Display',serif] text-lg font-bold">
                  Rol Foto Anda ({uploadQueue.length})
                </h3>
                <p className="text-[11px] text-[#7f7668]">
                  Foto yang telah Anda abadikan untuk {event.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f5ece7] flex items-center justify-center text-[#1e1b18]"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {uploadQueue.length === 0 ? (
              <div className="py-12 text-center text-[#7f7668]">
                <Icon name="photo_camera" size={36} className="mx-auto mb-2 text-[#b89758]" />
                <p className="text-xs">Belum ada foto yang diambil di sesi ini.</p>
              </div>
            ) : (
              <div className="overflow-y-auto py-4 grid grid-cols-3 gap-2.5">
                {uploadQueue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-[#d1c5b5] bg-black/10 group"
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                      #{uploadQueue.length - idx}
                    </span>
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {item.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => handleRetryUpload(item)}
                        className="absolute inset-0 bg-red-600/70 text-white flex flex-col items-center justify-center gap-1 text-[10px] font-bold"
                      >
                        <Icon name="refresh" size={18} />
                        <span>Coba Lagi</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#d1c5b5]/40 flex gap-2">
              <Link
                to={`/gallery/${event.slug}`}
                className="flex-1 py-3 rounded-xl bg-[#755a21] text-white text-xs font-semibold text-center shadow flex items-center justify-center gap-1.5"
              >
                <Icon name="photo_library" size={16} />
                <span>Buka Galeri Acara Bersama</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

