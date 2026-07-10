import { useState, useRef } from 'react';
import api from '../../api/axios';
import { Upload, X, Loader2, Image } from 'lucide-react';
import toast from 'react-hot-toast';

export function ImageUploader({ endpoint, existingImages = [], onUploaded }) {
  const [previews, setPreviews]   = useState(existingImages);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    const MAX = 5 - previews.length;
    if (MAX <= 0) return toast.error('Máximo 5 imágenes por solicitud');

    const selected = Array.from(files).slice(0, MAX);
    const tooBig   = selected.filter(f => f.size > 5 * 1024 * 1024);
    if (tooBig.length) return toast.error('Cada imagen debe pesar menos de 5 MB');

    const localPreviews = selected.map(f => ({ url: URL.createObjectURL(f), local: true }));
    setPreviews(p => [...p, ...localPreviews]);

    setUploading(true);
    try {
      const fd = new FormData();
      selected.forEach(f => fd.append('imagenes', f));

      const res = await api.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = res.data.data;

      // Replace local previews with server URLs
      setPreviews(p => {
        const nonLocal = p.filter(x => !x.local);
        return [...nonLocal, ...uploaded];
      });

      onUploaded?.(uploaded);
      toast.success(`${uploaded.length} imagen${uploaded.length !== 1 ? 'es' : ''} subida${uploaded.length !== 1 ? 's' : ''}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al subir imágenes');
      setPreviews(p => p.filter(x => !x.local));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          uploading
            ? 'border-orange-300 bg-orange-50 cursor-wait'
            : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-gray-400" />
          )}
          <p className="text-sm font-medium text-gray-600">
            {uploading ? 'Subiendo...' : 'Arrastra fotos aquí o haz clic para seleccionar'}
          </p>
          <p className="text-xs text-gray-400">JPEG, PNG, WebP · Máx. 5 MB por imagen · Hasta {5 - previews.filter(x => !x.local).length} más</p>
        </div>
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {previews.map((img, i) => (
            <div key={img.url || i} className="relative group">
              <img
                src={img.url}
                alt={`Imagen ${i + 1}`}
                className={`w-24 h-24 object-cover rounded-xl border-2 ${img.local ? 'opacity-60 border-orange-300' : 'border-gray-200'}`}
              />
              {img.local && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                </div>
              )}
              {!img.local && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                  <Image className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
