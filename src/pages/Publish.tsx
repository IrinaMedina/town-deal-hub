import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, X, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/lib/constants';
import { z } from 'zod';

const offerSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  category: z.string().min(1, 'Selecciona una categoría'),
  town: z.string().min(2, 'La población debe tener al menos 2 caracteres'),
  price: z.number().min(0.01, 'El precio debe ser mayor a 0'),
  store_name: z.string().min(2, 'El nombre de la tienda debe tener al menos 2 caracteres'),
  contact: z.string().min(5, 'El contacto debe tener al menos 5 caracteres'),
});

export default function Publish() {
  const { user, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    town: '',
    price: '',
    store_name: '',
    contact: '',
    expires_at: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && role !== 'PUBLICADOR') {
      navigate('/feed');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({ ...prev, town: profile.town }));
    }
  }, [profile]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Imagen muy grande',
          description: 'El tamaño máximo es 5MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('offer-images')
      .upload(fileName, imageFile);

    if (error) {
      throw new Error('Error al subir la imagen');
    }

    const { data } = supabase.storage
      .from('offer-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const validateForm = () => {
    try {
      offerSchema.parse({
        ...formData,
        price: parseFloat(formData.price) || 0,
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      let imageUrl: string | null = null;
      
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const { error } = await supabase
        .from('offers')
        .insert({
          title: formData.title,
          description: formData.description || null,
          category: formData.category as "OUTLET_ROPA" | "OUTLET_TECNO" | "OUTLET_HOGAR" | "OUTLET_ZAPATOS" | "OUTLET_BELLEZA" | "OTROS",
          town: formData.town,
          price: parseFloat(formData.price),
          store_name: formData.store_name,
          contact: formData.contact,
          expires_at: formData.expires_at || null,
          image_url: imageUrl,
          created_by: user!.id,
        });

      if (error) throw error;

      toast({
        title: '¡Oferta publicada!',
        description: 'Tu oferta ya está visible para los suscriptores',
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        town: profile?.town || '',
        price: '',
        store_name: '',
        contact: '',
        expires_at: '',
      });
      setImageFile(null);
      setImagePreview(null);

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo publicar la oferta',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Publicar Nueva Oferta
            </CardTitle>
            <CardDescription>
              Completa el formulario para publicar tu oferta outlet
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ej: Zapatillas Nike Air Max 50% descuento"
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe tu oferta..."
                  value={formData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Category & Town */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={value => handleChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-destructive">{errors.category}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="town">Población *</Label>
                  <Input
                    id="town"
                    placeholder="Ciudad o pueblo"
                    value={formData.town}
                    onChange={e => handleChange('town', e.target.value)}
                  />
                  {errors.town && (
                    <p className="text-sm text-destructive">{errors.town}</p>
                  )}
                </div>
              </div>

              {/* Price & Store */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="19.99"
                    value={formData.price}
                    onChange={e => handleChange('price', e.target.value)}
                  />
                  {errors.price && (
                    <p className="text-sm text-destructive">{errors.price}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_name">Nombre de tienda *</Label>
                  <Input
                    id="store_name"
                    placeholder="Tu tienda"
                    value={formData.store_name}
                    onChange={e => handleChange('store_name', e.target.value)}
                  />
                  {errors.store_name && (
                    <p className="text-sm text-destructive">{errors.store_name}</p>
                  )}
                </div>
              </div>

              {/* Contact & Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">Contacto *</Label>
                  <Input
                    id="contact"
                    placeholder="Teléfono o email"
                    value={formData.contact}
                    onChange={e => handleChange('contact', e.target.value)}
                  />
                  {errors.contact && (
                    <p className="text-sm text-destructive">{errors.contact}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_at">Fecha de expiración</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={e => handleChange('expires_at', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Imagen (opcional)</Label>
                {imagePreview ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Haz clic para subir imagen
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Máx. 5MB
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  'Publicar Oferta'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
