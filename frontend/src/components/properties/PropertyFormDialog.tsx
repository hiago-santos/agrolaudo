import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FieldError, Input, Label } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { propertiesService } from '@/services/properties';
import { toast } from '@/stores/toast';
import type { Property } from '@/types/domain';

const schema = z.object({
  name: z.string().min(1, 'Informe o nome da propriedade.'),
  registrationNumber: z.string().min(1, 'Informe a matrícula.'),
  city: z.string().min(1, 'Informe o município.'),
  state: z.string().length(2, 'UF deve ter 2 letras.'),
  totalAreaHectares: z.coerce.number().nonnegative('Área não pode ser negativa.'),
  stateRegistration: z.string().optional(),
  ruralEnvironmentalRegistry: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface PropertyFormDialogProps {
  open: boolean;
  onClose: () => void;
  producerId: string;
  property?: Property | null;
  onSaved: (property: Property) => void;
}

export function PropertyFormDialog({
  open,
  onClose,
  producerId,
  property,
  onSaved,
}: PropertyFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset(
        property
          ? {
              name: property.name,
              registrationNumber: property.registrationNumber,
              city: property.city,
              state: property.state,
              totalAreaHectares: Number(property.totalAreaHectares),
              stateRegistration: property.stateRegistration ?? '',
              ruralEnvironmentalRegistry: property.ruralEnvironmentalRegistry ?? '',
            }
          : {
              name: '',
              registrationNumber: '',
              city: '',
              state: '',
              totalAreaHectares: 0,
              stateRegistration: '',
              ruralEnvironmentalRegistry: '',
            },
      );
    }
  }, [open, property, reset]);

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        ...data,
        stateRegistration: data.stateRegistration || undefined,
        ruralEnvironmentalRegistry: data.ruralEnvironmentalRegistry || undefined,
      };
      const saved = property
        ? await propertiesService.update(property.id, payload)
        : await propertiesService.create({ ...payload, producerId });
      toast.success(property ? 'Propriedade atualizada.' : 'Propriedade cadastrada.');
      onSaved(saved);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar a propriedade.');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={property ? 'Editar propriedade' : 'Nova propriedade'}>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome da fazenda</Label>
          <Input id="name" {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="registrationNumber">Matrícula</Label>
            <Input id="registrationNumber" {...register('registrationNumber')} />
            <FieldError>{errors.registrationNumber?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="totalAreaHectares">Área total (ha)</Label>
            <Input id="totalAreaHectares" type="number" step="0.01" min="0" {...register('totalAreaHectares')} />
            <FieldError>{errors.totalAreaHectares?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_80px] gap-3">
          <div>
            <Label htmlFor="city">Município</Label>
            <Input id="city" {...register('city')} />
            <FieldError>{errors.city?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="state">UF</Label>
            <Input id="state" maxLength={2} className="uppercase" {...register('state')} />
            <FieldError>{errors.state?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="stateRegistration">Inscrição Estadual</Label>
            <Input id="stateRegistration" {...register('stateRegistration')} />
          </div>
          <div>
            <Label htmlFor="ruralEnvironmentalRegistry">CAR</Label>
            <Input id="ruralEnvironmentalRegistry" {...register('ruralEnvironmentalRegistry')} />
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
