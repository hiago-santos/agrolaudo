import { Seal } from '@/components/ui/Seal';

export function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="animate-fade-in animate-pulse">
        <Seal size="lg" />
      </div>
    </div>
  );
}
