import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { OfferCard, type Offer } from '@/components/OfferCard';
import { ReservationDialog } from '@/components/ReservationDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Settings, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Subscription {
  town: string;
  categories: string[];
}

export default function Feed() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyActive, setOnlyActive] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);

  const handleReserve = (offer: Offer) => {
    setSelectedOffer(offer);
    setReservationDialogOpen(true);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && role !== 'SUSCRIPTOR') {
      navigate('/publish');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'SUSCRIPTOR') {
      fetchSubscription();
    }
  }, [user, role]);

  useEffect(() => {
    if (subscription) {
      fetchOffers();
    }
  }, [subscription, onlyActive]);

  const fetchSubscription = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('town, categories')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar tu suscripción',
        variant: 'destructive',
      });
    } else if (data) {
      setSubscription(data);
    } else {
      // No subscription yet, show setup prompt
      setSubscription({ town: '', categories: [] });
    }
    setLoading(false);
  };

  const fetchOffers = async () => {
    if (!subscription?.town || subscription.categories.length === 0) {
      setOffers([]);
      return;
    }

    const categoriesTyped = subscription.categories as Array<"OUTLET_ROPA" | "OUTLET_TECNO" | "OUTLET_HOGAR" | "OUTLET_ZAPATOS" | "OUTLET_BELLEZA" | "OTROS">;
    
    let query = supabase
      .from('offers')
      .select('*')
      .eq('town', subscription.town)
      .in('category', categoriesTyped)
      .order('created_at', { ascending: false });

    if (onlyActive) {
      const today = new Date().toISOString().split('T')[0];
      query = query.or(`expires_at.is.null,expires_at.gte.${today}`);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ofertas',
        variant: 'destructive',
      });
    } else {
      setOffers(data || []);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const needsSubscriptionSetup = !subscription?.town || subscription.categories.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Ofertas para ti</h1>
            {subscription?.town && (
              <p className="text-muted-foreground">
                En {subscription.town} • {subscription.categories.length} categoría(s)
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {!needsSubscriptionSetup && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={onlyActive}
                  onCheckedChange={(checked) => setOnlyActive(checked as boolean)}
                />
                <Label htmlFor="active" className="text-sm cursor-pointer">
                  Solo vigentes
                </Label>
              </div>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate('/subscription')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Gestionar suscripción
            </Button>
          </div>
        </div>

        {/* Content */}
        {needsSubscriptionSetup ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Configura tu suscripción</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Para ver ofertas personalizadas, primero debes seleccionar tu población y las categorías que te interesan.
            </p>
            <Button onClick={() => navigate('/subscription')}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar ahora
            </Button>
          </div>
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No hay ofertas</h2>
            <p className="text-muted-foreground max-w-md">
              No hay ofertas que coincidan con tu suscripción en este momento. ¡Vuelve pronto!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offers.map(offer => (
              <OfferCard 
                key={offer.id} 
                offer={offer} 
                showReserveButton
                onReserve={handleReserve}
              />
            ))}
          </div>
        )}
      </main>

      <ReservationDialog
        offer={selectedOffer}
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
      />
    </div>
  );
}
