import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Offer {
  id: string;
  title: string;
  price: number;
  store_name: string;
  town: string;
}

interface ReservationDialogProps {
  offer: Offer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReservationDialog({ offer, open, onOpenChange }: ReservationDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!offer || !user) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-reservation-notification', {
        body: {
          offerId: offer.id,
          subscriberName: name,
          subscriberEmail: user.email,
          subscriberPhone: phone || undefined,
          message: message || undefined,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: '¡Reserva enviada!',
        description: 'El publicador recibirá una notificación con tus datos de contacto.',
      });
      
      onOpenChange(false);
      setPhone('');
      setMessage('');
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar la reserva. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!offer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Reservar producto
          </DialogTitle>
          <DialogDescription>
            Envía tus datos al publicador para reservar este producto
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Offer summary */}
          <div className="rounded-lg bg-muted p-4">
            <p className="font-semibold line-clamp-1">{offer.title}</p>
            <div className="flex items-center justify-between mt-1 text-sm text-muted-foreground">
              <span>{offer.store_name} • {offer.town}</span>
              <span className="font-bold text-primary">{offer.price.toFixed(2)}€</span>
            </div>
          </div>
          
          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se usará tu email de la cuenta
              </p>
            </div>
            
            <div>
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 612 345 678"
              />
            </div>
            
            <div>
              <Label htmlFor="message">Mensaje (opcional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe un mensaje para el publicador..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                'Enviar reserva'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
