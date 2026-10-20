import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { Icon } from './Icon';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface ToastItem {
  id: number;
  message: string;
  icon?: string;
  visible: boolean;
}

interface ToastContextValue {
  showToast: (message: string, icon?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 0;

/* ------------------------------------------------------------------ */
/* Toast single item                                                   */
/* ------------------------------------------------------------------ */
function ToastItem({
  toast,
  onDone,
}: {
  toast: ToastItem;
  onDone: (id: number) => void;
}) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // animate in
    requestAnimationFrame(() => setShow(true));

    // auto-dismiss after 2.5s
    timerRef.current = setTimeout(() => {
      setShow(false);
      setTimeout(() => onDone(toast.id), 300); // wait for exit animation
    }, 2500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="flex items-center gap-2.5 px-5 py-3 rounded-full shadow-lg transition-all duration-300 ease-out"
      style={{
        backgroundColor: 'var(--color-inverse-surface)',
        color: 'var(--color-inverse-on-surface)',
        transform: show ? 'translateY(0)' : 'translateY(24px)',
        opacity: show ? 1 : 0,
        pointerEvents: 'auto',
      }}
    >
      {toast.icon && (
        <Icon name={toast.icon} filled size={20} className="shrink-0 opacity-90" />
      )}
      <span className="text-body-sm font-medium whitespace-nowrap">{toast.message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast Container                                                     */
/* ------------------------------------------------------------------ */
export function ToastContainer({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, icon?: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, icon, visible: true }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast portal */}
      <div
        className="fixed bottom-8 left-0 right-0 z-[9998] flex flex-col items-center gap-2 pointer-events-none pb-safe"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDone={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */
export { ToastContainer as ToastProvider };
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastContainer');
  }
  return context;
}
