import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FieldError, Input, Label } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { propriedadesService } from '@/services/propriedades';
import { toast } from '@/stores/toast';
import type { Propriedade } from '@/types/domain';

const schema = z.object({
  nome: z.string().min(1, 'Informe o nome da propriedade.'),
  matricula: z.string().min(1, 'Informe a matrícula.'),
  municipio: z.string().min(1, 'Informe o município.'),
  uf: z.string().length(2, 'UF deve ter 2 letras.'),
  areaTotalHa: z.coerce.number().nonnegative('Área não pode ser negativa.'),
  inscricaoEstadual: z.string().optional(),
  car: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface PropriedadeFormDialogProps {
  open: boolean;
  onClose: () => void;
  produtorId: string;
  propriedade?: Propriedade | null;
  onSaved: (propriedade: Propriedade) => void;
}

export function PropriedadeFormDialog({
  open,
  onClose,
  produtorId,
  propriedade,
  onSaved,
}: PropriedadeFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset(
        propriedade
          ? {
              nome: propriedade.nome,
              matricula: propriedade.matricula,
              municipio: propriedade.municipio,
              uf: propriedade.uf,
              areaTotalHa: Number(propriedade.areaTotalHa),
              inscricaoEstadual: propriedade.inscricaoEstadual ?? '',
              car: propriedade.car ?? '',
            }
          : { nome: '', matricula: '', municipio: '', uf: '', areaTotalHa: 0, inscricaoEstadual: '', car: '' },
      );
    }
  }, [open, propriedade, reset]);

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        ...data,
        inscricaoEstadual: data.inscricaoEstadual || undefined,
        car: data.car || undefined,
      };
      const salvo = propriedade
        ? await propriedadesService.atualizar(propriedade.id, payload)
        : await propriedadesService.criar({ ...payload, produtorId });
      toast.success(propriedade ? 'Propriedade atualizada.' : 'Propriedade cadastrada.');
      onSaved(salvo);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar a propriedade.');
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={propriedade ? 'Editar propriedade' : 'Nova propriedade'}
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
        <div>
          <Label htmlFor="nome">Nome da fazenda</Label>
          <Input id="nome" {...register('nome')} />
          <FieldError>{errors.nome?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="matricula">Matrícula</Label>
            <Input id="matricula" {...register('matricula')} />
            <FieldError>{errors.matricula?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="areaTotalHa">Área total (ha)</Label>
            <Input id="areaTotalHa" type="number" step="0.01" min="0" {...register('areaTotalHa')} />
            <FieldError>{errors.areaTotalHa?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_80px] gap-3">
          <div>
            <Label htmlFor="municipio">Município</Label>
            <Input id="municipio" {...register('municipio')} />
            <FieldError>{errors.municipio?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <Input id="uf" maxLength={2} className="uppercase" {...register('uf')} />
            <FieldError>{errors.uf?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
            <Input id="inscricaoEstadual" {...register('inscricaoEstadual')} />
          </div>
          <div>
            <Label htmlFor="car">CAR</Label>
            <Input id="car" {...register('car')} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Salvar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
