import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ImageOff, Upload } from 'lucide-react';
import type { Floor } from '@/types';
import { buildingsApi } from '@/api/endpoints';
import client from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import FileInput from '@/components/ui/FileInput';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

interface FloorWithCount extends Floor {
  _count?: { rooms: number };
}

export default function FloorBlueprintUpload() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { push } = useToast();
  const [activeFloor, setActiveFloor] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const building = useQuery({ queryKey: ['building', buildingId], queryFn: () => buildingsApi.getById(buildingId!), enabled: !!buildingId });
  const floors = useQuery<FloorWithCount[]>({
    queryKey: ['floors', buildingId],
    queryFn: () => buildingsApi.listFloors(buildingId!),
    enabled: !!buildingId,
  });

  const uploadMut = useMutation({
    mutationFn: ({ floorId, f }: { floorId: string; f: File }) => {
      const form = new FormData();
      form.append('file', f);
      form.append('floorId', floorId);
      return client.post(`/buildings/${buildingId}/blueprint`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      push('Blueprint uploaded', 'success');
      qc.invalidateQueries({ queryKey: ['floors', buildingId] });
      setFile(null); setActiveFloor(null);
    },
    onError: () => push('Upload failed', 'error'),
  });

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => navigate('/admin/buildings')} className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-700">
        <ArrowLeft size={16} /> Back to buildings
      </button>

      <div>
        <h1 className="text-xl font-semibold text-gray-800">Floor Blueprints</h1>
        <p className="text-sm text-gray-500">{building.data?.name ?? 'Loading…'} · {building.data?.code}</p>
      </div>

      {floors.isLoading ? (
        <Skeleton shape="card" count={3} />
      ) : (floors.data ?? []).length === 0 ? (
        <EmptyState title="No floors" description="Add floors to this building first." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(floors.data ?? []).map((f) => (
            <Card key={f.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                <span className="font-medium text-gray-800">Floor {f.floorNumber}</span>
                <span className="text-xs text-gray-500">{f._count?.rooms ?? 0} rooms</span>
              </div>
              <div className="flex flex-col items-center gap-3 p-4">
                {f.blueprintUrl ? (
                  <img src={f.blueprintUrl} alt={`Floor ${f.floorNumber} blueprint`} className="h-40 w-full rounded-md border border-gray-200 object-contain" />
                ) : (
                  <div className="flex h-40 w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-200 text-gray-400">
                    <ImageOff size={32} />
                    <span className="mt-2 text-sm">No blueprint</span>
                  </div>
                )}
                {activeFloor === f.id ? (
                  <div className="w-full space-y-2">
                    <FileInput accept="image/*" helperText="PNG or JPG of the floor plan" onChange={setFile} />
                    <div className="flex gap-2">
                      <Button size="sm" loading={uploadMut.isPending} leftIcon={<Upload size={14} />} disabled={!file}
                        onClick={() => file && uploadMut.mutate({ floorId: f.id, f: file })}>
                        Upload
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setActiveFloor(null); setFile(null); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" leftIcon={<Upload size={14} />} onClick={() => setActiveFloor(f.id)}>
                    {f.blueprintUrl ? 'Replace Blueprint' : 'Upload Blueprint'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
