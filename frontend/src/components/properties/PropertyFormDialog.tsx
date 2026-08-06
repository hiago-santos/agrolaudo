import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { LocationMapField } from '@/components/map/LocationMapField';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FieldError, Input, Label } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { polygonAreaHectares, type LatLng } from '@/lib/geo';
import { propertiesService } from '@/services/properties';
import { toast } from '@/stores/toast';
import type { GeoPolygon, Property } from '@/types/domain';

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

const FORM_ID = 'property-form';

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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [boundary, setBoundary] = useState<GeoPolygon | null>(null);
  const [point, setPoint] = useState<LatLng | null>(null);

  const drawnAreaHectares = useMemo(
    () => (boundary ? polygonAreaHectares(boundary) : null),
    [boundary],
  );

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
      setBoundary(property?.boundary ?? null);
      setPoint(
        property?.latitude && property?.longitude
          ? { lat: Number(property.latitude), lng: Number(property.longitude) }
          : null,
      );
    }
  }, [open, property, reset]);

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        ...data,
        stateRegistration: data.stateRegistration || undefined,
        ruralEnvironmentalRegistry: data.ruralEnvironmentalRegistry || undefined,
        // `null` explícito apaga a demarcação anterior no servidor; `undefined` a manteria.
        boundary,
        latitude: point?.lat,
        longitude: point?.lng,
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
    <Dialog
      open={open}
      onClose={onClose}
      title={property ? 'Editar propriedade' : 'Nova propriedade'}
      size="2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={isSubmitting}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da fazenda</Label>
            <Input id="name" {...register('name')} />
            <FieldError>{errors.name?.message}</FieldError>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <Label htmlFor="registrationNumber">Matrícula</Label>
              <Input id="registrationNumber" {...register('registrationNumber')} />
              <FieldError>{errors.registrationNumber?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="totalAreaHectares">Área total (ha)</Label>
              <Input
                id="totalAreaHectares"
                type="number"
                step="0.01"
                min="0"
                {...register('totalAreaHectares')}
              />
              <FieldError>{errors.totalAreaHectares?.message}</FieldError>
              {drawnAreaHectares !== null && (
                <p className="mt-1 text-[11px] text-text-tertiary">
                  Mapa: {formatNumber(drawnAreaHectares)} ha ·{' '}
                  <button
                    type="button"
                    onClick={() =>
                      setValue('totalAreaHectares', Number(drawnAreaHectares.toFixed(2)), {
                        shouldValidate: true,
                      })
                    }
                    className="rounded-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                  >
                    usar
                  </button>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_80px]">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <Label htmlFor="stateRegistration">Inscrição Estadual</Label>
              <Input id="stateRegistration" {...register('stateRegistration')} />
            </div>
            <div>
              <Label htmlFor="ruralEnvironmentalRegistry">CAR</Label>
              <Input id="ruralEnvironmentalRegistry" {...register('ruralEnvironmentalRegistry')} />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <Label>Demarcação da área</Label>
          <LocationMapField
            boundary={boundary}
            onBoundaryChange={setBoundary}
            point={point}
            onPointChange={setPoint}
            pointLabel="Localização da propriedade"
            center={point}
            height="clamp(280px, 48vh, 540px)"
          />
        </div>
      </form>
    </Dialog>
  );
}
