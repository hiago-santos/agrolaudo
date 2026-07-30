import { Eraser } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import SignaturePadLib from 'signature_pad';

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
}

interface SignaturePadProps {
  label: string;
  disabled?: boolean;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { label, disabled },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function ajustarResolucao() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.getContext('2d')?.scale(dpr, dpr);
      padRef.current?.clear();
    }

    const pad = new SignaturePadLib(canvas, { penColor: '#101828', backgroundColor: '#ffffff' });
    pad.addEventListener('endStroke', () => setVazio(pad.isEmpty()));
    padRef.current = pad;
    ajustarResolucao();

    window.addEventListener('resize', ajustarResolucao);
    return () => {
      window.removeEventListener('resize', ajustarResolucao);
      pad.off();
    };
  }, []);

  useEffect(() => {
    if (disabled) padRef.current?.off();
    else padRef.current?.on();
  }, [disabled]);

  useImperativeHandle(ref, () => ({
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    toDataURL: () => padRef.current?.toDataURL('image/png') ?? '',
    clear: () => {
      padRef.current?.clear();
      setVazio(true);
    },
  }));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <button
          type="button"
          onClick={() => {
            padRef.current?.clear();
            setVazio(true);
          }}
          disabled={disabled || vazio}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-danger disabled:opacity-40"
        >
          <Eraser className="h-3 w-3" />
          Limpar
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border-strong bg-white">
        <canvas ref={canvasRef} className="h-36 w-full touch-none" />
      </div>
      {disabled && <p className="mt-1 text-xs text-text-tertiary">Assinatura já coletada.</p>}
    </div>
  );
});
