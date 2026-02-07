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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Pencil, Trash2, MapPin, Store, Clock, AlertCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, getCategoryLabel, getCategoryColor } from '@/lib/constants';
import { format, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Offer {
  id: string;
  title: string;
  description: string | null;
  category: string;
  town: string;
  price: number;
  store_name: string;
  contact: string;
  image_url: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function MyOffers() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && role !== 'PUBLICADOR') {
      navigate('/feed');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'PUBLICADOR') {
      fetchOffers();
    }
  }, [user, role]);

  const fetchOffers = async () => {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('created_by', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar tus ofertas',
        variant: 'destructive',
      });
    } else {
      setOffers(data || []);
    }
    setLoading(false);
  };

  const handleEdit = async () => {
    if (!editingOffer) return;
    
    setSaving(true);

    const { error } = await supabase
      .from('offers')
      .update({
        title: editingOffer.title,
        description: editingOffer.description,
        category: editingOffer.category as "OUTLET_ROPA" | "OUTLET_TECNO" | "OUTLET_HOGAR" | "OUTLET_ZAPATOS" | "OUTLET_BELLEZA" | "OTROS",
        town: editingOffer.town,
        price: editingOffer.price,
        store_name: editingOffer.store_name,
        contact: editingOffer.contact,
        expires_at: editingOffer.expires_at,
      })
      .eq('id', editingOffer.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la oferta',
        variant: 'destructive',
      });
    } else {
      toast({
        title: '¡Actualizada!',
        description: 'La oferta ha sido modificada',
      });
      fetchOffers();
      setEditingOffer(null);
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingOffer) return;

    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', deletingOffer.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la oferta',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Eliminada',
        description: 'La oferta ha sido eliminada',
      });
      setOffers(offers.filter(o => o.id !== deletingOffer.id));
    }

    setDeletingOffer(null);
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
      
      <main className="container py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mis Ofertas</h1>
            <p className="text-muted-foreground">
              {offers.length} oferta(s) publicada(s)
            </p>
          </div>
          
          <Button onClick={() => navigate('/publish')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Oferta
          </Button>
        </div>

        {/* Content */}
        {offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sin ofertas</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Aún no has publicado ninguna oferta. ¡Empieza ahora!
            </p>
            <Button onClick={() => navigate('/publish')}>
              <Plus className="h-4 w-4 mr-2" />
              Publicar mi primera oferta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map(offer => {
              const isExpired = offer.expires_at && isPast(parseISO(offer.expires_at));
              
              return (
                <Card key={offer.id} className={isExpired ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Image */}
                      <div className="w-full sm:w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {offer.image_url ? (
                          <img
                            src={offer.image_url}
                            alt={offer.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Store className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{offer.title}</h3>
                          <Badge className={`${getCategoryColor(offer.category)} text-white border-0`}>
                            {getCategoryLabel(offer.category)}
                          </Badge>
                          {isExpired && (
                            <Badge variant="destructive">Expirada</Badge>
                          )}
                        </div>
                        
                        <p className="text-lg font-bold text-primary mb-2">
                          {offer.price.toFixed(2)}€
                        </p>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Store className="h-4 w-4" />
                            {offer.store_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {offer.town}
                          </span>
                          {offer.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Exp: {format(parseISO(offer.expires_at), 'd MMM yyyy', { locale: es })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingOffer(offer)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingOffer(offer)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingOffer} onOpenChange={() => setEditingOffer(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Oferta</DialogTitle>
            <DialogDescription>
              Modifica los datos de tu oferta
            </DialogDescription>
          </DialogHeader>
          
          {editingOffer && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={editingOffer.title}
                  onChange={e => setEditingOffer({ ...editingOffer, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={editingOffer.description || ''}
                  onChange={e => setEditingOffer({ ...editingOffer, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={editingOffer.category}
                    onValueChange={value => setEditingOffer({ ...editingOffer, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Precio (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingOffer.price}
                    onChange={e => setEditingOffer({ ...editingOffer, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Población</Label>
                  <Input
                    value={editingOffer.town}
                    onChange={e => setEditingOffer({ ...editingOffer, town: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tienda</Label>
                  <Input
                    value={editingOffer.store_name}
                    onChange={e => setEditingOffer({ ...editingOffer, store_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contacto</Label>
                  <Input
                    value={editingOffer.contact}
                    onChange={e => setEditingOffer({ ...editingOffer, contact: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expiración</Label>
                  <Input
                    type="date"
                    value={editingOffer.expires_at || ''}
                    onChange={e => setEditingOffer({ ...editingOffer, expires_at: e.target.value || null })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOffer(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingOffer} onOpenChange={() => setDeletingOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La oferta "{deletingOffer?.title}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
