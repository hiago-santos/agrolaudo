import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { Seal } from '@/components/ui/Seal';
import { SkeletonText } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { PROJECT_STATUS_LABEL } from '@/lib/projectStatus';
import { publicService, type PublicVerification } from '@/services/public';

export function VerifyPublic() {
  const { hash } = useParams<{ hash: string }>();
  const [data, setData] = useState<PublicVerification | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hash) {
      setError(true);
      setLoading(false);
      return;
    }
    publicService
      .verify(hash)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [hash]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-1 text-center">
        <Seal size="md" />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-text">
          AgroLaudo
        </h1>
        <p className="text-sm text-text-secondary">Verificação de autenticidade de documento</p>
      </div>

      <div className="w-full max-w-md">
        {loading && (
          <Card className="p-6">
            <SkeletonText lines={6} />
          </Card>
        )}

        {!loading && (error || !data) && (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <XCircle className="h-9 w-9 text-danger" />
            <div>
              <p className="font-display text-sm font-semibold text-text">
                Documento não encontrado
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Este código não corresponde a nenhum projeto assinado no AgroLaudo.
              </p>
            </div>
          </Card>
        )}

        {!loading && data && (
          <Card className="space-y-5 p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="h-9 w-9 text-success" />
              <div>
                <p className="font-display text-sm font-semibold text-text">Documento autêntico</p>
                <p className="font-mono text-xs text-text-secondary">Projeto {data.number}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <Line label="Produtor" value={data.producer} />
              <Line label="Propriedade" value={data.property} />
              <Line label="Safra" value={data.season} />
              <Line
                label="Agrônomo"
                value={`${data.agronomist.name} · ${data.agronomist.licenseNumber}`}
              />
              <Line label="Status" value={PROJECT_STATUS_LABEL[data.status]} />
              <Line label="Emitido em" value={formatDate(data.issueDate)} />
              {data.approvedCreditLimit && (
                <Line label="Limite aprovado" value={formatCurrency(data.approvedCreditLimit)} />
              )}
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Assinaturas
              </p>
              {data.signatures.map((s) => (
                <div key={s.type} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{s.signatoryName}</span>
                  <span className="text-text">
                    {s.signedAt ? formatDateTime(s.signedAt) : 'pendente'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right font-medium text-text">{value}</span>
    </div>
  );
}
