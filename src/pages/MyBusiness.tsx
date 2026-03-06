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
import { Loader2, Upload, X, Building2, Plus, Trash2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BUSINESS_CATEGORIES } from '@/lib/constants';
import { z } from 'zod';
import { Captcha } from '@/components/Captcha';

const businessSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  category: z.string().min(1, 'Selecciona una categoría'),
  town: z.string().min(2, 'La población debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  description: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  schedule: z.string().optional(),
});

interface BusinessData {
  id: string;
  name: string;
  category: string;
  description: string | null;
  town: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  schedule: string | null;
  logo_url: string | null;
  social_media: Record<string, string>;
  rating_avg: number;
  rating_count: number;
}

interface BusinessImage {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
}

export default function MyBusiness() {
  const { user, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [images, setImages] = useState<BusinessImage[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    town: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    schedule: '',
    instagram: '',
    facebook: '',
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (!authLoading && role !== 'EMPRESA') navigate('/');
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchBusiness();
  }, [user]);

  useEffect(() => {
    if (profile && !business) {
      setFormData(prev => ({ ...prev, town: profile.town }));
    }
  }, [profile, business]);

  const fetchBusiness = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('created_by', user!.id)
        .maybeSingle();

      if (data) {
        setBusiness(data as unknown as BusinessData);
        const sm = (data.social_media as Record<string, string>) || {};
        setFormData({
          name: data.name,
          category: data.category,
          description: data.description || '',
          town: data.town,
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          schedule: data.schedule || '',
          instagram: sm.instagram || '',
          facebook: sm.facebook || '',
        });
        if (data.logo_url) setLogoPreview(data.logo_url);

        // Fetch gallery images
        const { data: imgs } = await supabase
          .from('business_images')
          .select('*')
          .eq('business_id', data.id)
          .order('display_order');
        if (imgs) setImages(imgs as unknown as BusinessImage[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Logo muy grande', description: 'Máximo 2MB', variant: 'destructive' });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `${user!.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('business-images').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('business-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!business) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSaving(true);
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) continue;
        const url = await uploadFile(file, 'gallery');
        await supabase.from('business_images').insert({
          business_id: business.id,
          image_url: url,
          display_order: images.length,
        });
      }
      await fetchBusiness();
      toast({ title: 'Imágenes subidas' });
    } catch {
      toast({ title: 'Error al subir imágenes', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteImage = async (imgId: string) => {
    await supabase.from('business_images').delete().eq('id', imgId);
    setImages(prev => prev.filter(i => i.id !== imgId));
  };

  const validateForm = () => {
    try {
      businessSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);

    try {
      let logoUrl = business?.logo_url || null;
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, 'logo');
      }

      const payload = {
        name: formData.name,
        category: formData.category as any,
        description: formData.description || null,
        town: formData.town,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        schedule: formData.schedule || null,
        logo_url: logoUrl,
        social_media: {
          instagram: formData.instagram || undefined,
          facebook: formData.facebook || undefined,
        },
      };

      if (business) {
        const { error } = await supabase
          .from('businesses')
          .update(payload)
          .eq('id', business.id);
        if (error) throw error;
        toast({ title: '¡Empresa actualizada!' });
      } else {
        const { error } = await supabase
          .from('businesses')
          .insert({ ...payload, created_by: user!.id });
        if (error) throw error;
        toast({ title: '¡Empresa creada!' });
      }

      await fetchBusiness();
      setLogoFile(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {business ? 'Mi Empresa' : 'Registrar Mi Empresa'}
            </CardTitle>
            <CardDescription>
              {business ? 'Edita la información de tu establecimiento' : 'Completa los datos de tu negocio para aparecer en el directorio'}
            </CardDescription>
            {business && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {business.rating_avg.toFixed(1)} ({business.rating_count} valoraciones)
              </div>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del negocio *</Label>
                <Input id="name" placeholder="Ej: Gestoría López" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              {/* Category & Town */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría *</Label>
                  <Select value={formData.category} onValueChange={v => handleChange('category', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span> {cat.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="town">Población *</Label>
                  <Input id="town" value={formData.town} onChange={e => handleChange('town', e.target.value)} />
                  {errors.town && <p className="text-sm text-destructive">{errors.town}</p>}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" placeholder="Describe tu negocio..." value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={3} />
              </div>

              {/* Address & Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" placeholder="Calle, número..." value={formData.address} onChange={e => handleChange('address', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule">Horario</Label>
                  <Input id="schedule" placeholder="L-V: 9:00-18:00" value={formData.schedule} onChange={e => handleChange('schedule', e.target.value)} />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" placeholder="612 345 678" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="contacto@tunegocio.com" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
              </div>

              {/* Website & Social */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Web</Label>
                  <Input id="website" placeholder="https://..." value={formData.website} onChange={e => handleChange('website', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" placeholder="@tunegocio" value={formData.instagram} onChange={e => handleChange('instagram', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input id="facebook" placeholder="tunegocio" value={formData.facebook} onChange={e => handleChange('facebook', e.target.value)} />
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo</Label>
                {logoPreview ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => { setLogoFile(null); setLogoPreview(null); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Subir logo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                  </label>
                )}
              </div>

              {!business && (
                <div className="space-y-2">
                  <Label>Verificación de seguridad</Label>
                  <Captcha onVerified={setCaptchaVerified} />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saving || (!business && !captchaVerified)}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{business ? 'Guardando...' : 'Creando...'}</>
                ) : (
                  business ? 'Guardar Cambios' : 'Crear Empresa'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Gallery Section - only shown after business is created */}
        {business && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Galería de fotos</CardTitle>
              <CardDescription>Sube fotos de tu establecimiento (máx. 5MB cada una)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {images.map(img => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={img.image_url} alt={img.caption || ''} className="w-full h-full object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => deleteImage(img.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Añadir</span>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handleGalleryUpload} />
                </label>
              </div>
              {saving && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Subiendo...</div>}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
