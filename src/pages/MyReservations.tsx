import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Star, MapPin, Store, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reservation {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  offer: {
    id: string;
    title: string;
    price: number;
    store_name: string;
    town: string;
    image_url: string | null;
    created_by: string;
  };
  rating?: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
}

export default function MyReservations() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingReservation, setRatingReservation] = useState<Reservation | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && role !== 'SUSCRIPTOR') {
      navigate('/');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'SUSCRIPTOR') {
      fetchReservations();
    }
  }, [user, role]);

  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        status,
        message,
        created_at,
        offer:offers (
          id,
          title,
          price,
          store_name,
          town,
          image_url,
          created_by
        )
      `)
      .eq('subscriber_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar tus reservas',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch ratings for these reservations
    const reservationIds = data?.map(r => r.id) || [];
    const { data: ratingsData } = await supabase
      .from('ratings')
      .select('id, reservation_id, rating, comment')
      .in('reservation_id', reservationIds);

    const ratingsMap = new Map(ratingsData?.map(r => [r.reservation_id, r]) || []);

    const reservationsWithRatings = (data || []).map(r => ({
      ...r,
      offer: r.offer as Reservation['offer'],
      rating: ratingsMap.get(r.id) || null,
    }));

    setReservations(reservationsWithRatings);
    setLoading(false);
  };

  const openRatingDialog = (reservation: Reservation) => {
    setRatingReservation(reservation);
    setRatingValue(reservation.rating?.rating || 5);
    setRatingComment(reservation.rating?.comment || '');
  };

  const closeRatingDialog = () => {
    setRatingReservation(null);
    setRatingValue(5);
    setRatingComment('');
  };

  const handleSubmitRating = async () => {
    if (!ratingReservation) return;
    
    setSubmitting(true);

    try {
      if (ratingReservation.rating) {
        // Update existing rating
        const { error } = await supabase
          .from('ratings')
          .update({
            rating: ratingValue,
            comment: ratingComment || null,
          })
          .eq('id', ratingReservation.rating.id);

        if (error) throw error;
      } else {
        // Create new rating
        const { error } = await supabase
          .from('ratings')
          .insert({
            reservation_id: ratingReservation.id,
            publisher_id: ratingReservation.offer.created_by,
            subscriber_id: user!.id,
            rating: ratingValue,
            comment: ratingComment || null,
          });

        if (error) throw error;
      }

      toast({
        title: '¡Valoración enviada!',
        description: 'Gracias por tu opinión',
      });
      
      fetchReservations();
      closeRatingDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar la valoración',
        variant: 'destructive',
      });
    }

    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500 text-white border-0"><CheckCircle className="h-3 w-3 mr-1" />Confirmada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
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
      
      <main className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Mis Reservas</h1>
          <p className="text-muted-foreground">
            {reservations.length} reserva(s)
          </p>
        </div>

        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sin reservas</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Aún no has hecho ninguna reserva. ¡Explora las ofertas disponibles!
            </p>
            <Button onClick={() => navigate('/feed')}>
              Ver ofertas
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map(reservation => (
              <Card key={reservation.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Image */}
                    <div className="w-full sm:w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {reservation.offer.image_url ? (
                        <img
                          src={reservation.offer.image_url}
                          alt={reservation.offer.title}
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
                        <h3 className="font-semibold truncate">{reservation.offer.title}</h3>
                        {getStatusBadge(reservation.status)}
                      </div>
                      
                      <p className="text-lg font-bold text-primary mb-2">
                        {reservation.offer.price.toFixed(2)}€
                      </p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Store className="h-4 w-4" />
                          {reservation.offer.store_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {reservation.offer.town}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(parseISO(reservation.created_at), 'd MMM yyyy', { locale: es })}
                        </span>
                      </div>

                      {/* Rating display */}
                      {reservation.rating && (
                        <div className="mt-2 flex items-center gap-1 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < reservation.rating!.rating ? 'fill-current' : 'stroke-current fill-none'}`}
                            />
                          ))}
                          <span className="text-sm text-muted-foreground ml-2">Tu valoración</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 flex-shrink-0">
                      {reservation.status === 'confirmed' && (
                        <Button
                          variant={reservation.rating ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => openRatingDialog(reservation)}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          {reservation.rating ? 'Editar valoración' : 'Valorar'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Rating Dialog */}
      <Dialog open={!!ratingReservation} onOpenChange={closeRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valorar al publicador</DialogTitle>
            <DialogDescription>
              ¿Cómo fue tu experiencia con esta reserva?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <Label>Puntuación</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= ratingValue
                          ? 'text-amber-500 fill-current'
                          : 'text-muted-foreground hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label>Comentario (opcional)</Label>
              <Textarea
                placeholder="Cuéntanos tu experiencia..."
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRatingDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitRating} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar valoración'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
