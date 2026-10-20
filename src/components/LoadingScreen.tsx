import { Icon } from './Icon';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ivory">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        {/* Camera icon */}
        <div
          className="flex items-center justify-center w-20 h-20 rounded-full bg-cream"
          style={{ boxShadow: '0 4px 20px rgba(184, 151, 88, 0.15)' }}
        >
          <Icon name="photo_camera" filled size={40} className="text-primary" />
        </div>

        {/* Brand text */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-on-surface">
            WedSnap
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            Capturing moments together
          </p>
        </div>
      </div>
    </div>
  );
}
