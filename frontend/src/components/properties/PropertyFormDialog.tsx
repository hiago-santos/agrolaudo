import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { LocationMapField } from '@/components/map/LocationMapField';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FieldError, Input, Label } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { polygonAreaHectares, polygonCentroid, type LatLng } from '@/lib/geo';
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
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');

  const drawnAreaHectares = useMemo(
    () => (boundary ? polygonAreaHectares(boundary) : null),
    [boundary],
  );
  const drawnCentroid = useMemo(
    () => (boundary ? polygonCentroid(boundary) : null),
    [boundary],
  );

  function syncPoint(next: LatLng | null) {
    setPoint(next);
    setLatInput(next ? next.lat.toFixed(6) : '');
    setLngInput(next ? next.lng.toFixed(6) : '');
  }

  function handleCoordinateInput(nextLat: string, nextLng: string) {
    setLatInput(nextLat);
    setLngInput(nextLng);
    if (!nextLat.trim() || !nextLng.trim()) {
      setPoint(null);
      return;
    }
    const lat = Number(nextLat);
    const lng = Number(nextLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setPoint(null);
      return;
    }
    setPoint({ lat, lng });
  }

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
      syncPoint(
        property?.latitude && property?.longitude
          ? { lat: Number(property.latitude), lng: Number(property.longitude) }
          : null,
      );
    }
  }, [open, property, reset]);

  // Área total acompanha o perímetro desenhado no mapa.
  useEffect(() => {
    if (drawnAreaHectares === null) return;
    setValue('totalAreaHectares', Number(drawnAreaHectares.toFixed(2)), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [drawnAreaHectares, setValue]);

  // Referência de localização acompanha o centro geométrico do desenho.
  useEffect(() => {
    if (!drawnCentroid) return;
    syncPoint(drawnCentroid);
  }, [drawnCentroid]);

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

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-medium text-text-secondary">Referência de localização</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="property-lat">Latitude</Label>
                <Input
                  id="property-lat"
                  type="number"
                  step="0.000001"
                  value={latInput}
                  onChange={(event) => handleCoordinateInput(event.target.value, lngInput)}
                  placeholder="-20.540000"
                />
              </div>
              <div>
                <Label htmlFor="property-lng">Longitude</Label>
                <Input
                  id="property-lng"
                  type="number"
                  step="0.000001"
                  value={lngInput}
                  onChange={(event) => handleCoordinateInput(latInput, event.target.value)}
                  placeholder="-47.385000"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <Label>Demarcação da área</Label>
          <LocationMapField
            boundary={boundary}
            onBoundaryChange={setBoundary}
            point={point}
            onPointChange={syncPoint}
            showPointFields={false}
            pointLabel="Localização da propriedade"
            center={point}
            height="clamp(280px, 48vh, 540px)"
          />
        </div>
      </form>
    </Dialog>
  );
}
