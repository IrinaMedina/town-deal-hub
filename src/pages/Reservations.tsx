import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle, XCircle, Clock, Mail, Phone, MessageSquare, AlertCircle, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReservationWithOffer {
  id: string;
  status: string;
  subscriber_name: string;
  subscriber_email: string;
  subscriber_phone: string | null;
  message: string | null;
  created_at: string;
  offer: {
    id: string;
    title: string;
    price: number;
  };
}

export default function Reservations() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [reservations, setReservations] = useState<ReservationWithOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingReservation, setConfirmingReservation] = useState<ReservationWithOffer | null>(null);
  const [cancellingReservation, setCancellingReservation] = useState<ReservationWithOffer | null>(null);
  const [updating, setUpdating] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && role !== 'PUBLICADOR') {
      navigate('/');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'PUBLICADOR') {
      fetchReservations();
      fetchRatings();
    }
  }, [user, role]);

  const fetchReservations = async () => {
    // Get offers by this publisher first
    const { data: offers } = await supabase
      .from('offers')
      .select('id')
      .eq('created_by', user!.id);

    if (!offers || offers.length === 0) {
      setReservations([]);
      setLoading(false);
      return;
    }

    const offerIds = offers.map(o => o.id);

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        status,
        subscriber_name,
        subscriber_email,
        subscriber_phone,
        message,
        created_at,
        offer:offers (
          id,
          title,
          price
        )
      `)
      .in('offer_id', offerIds)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las reservas',
        variant: 'destructive',
      });
    } else {
      setReservations((data || []).map(r => ({
        ...r,
        offer: r.offer as ReservationWithOffer['offer'],
      })));
    }
    setLoading(false);
  };

  const fetchRatings = async () => {
    const { data } = await supabase
      .from('ratings')
      .select('rating')
      .eq('publisher_id', user!.id);

    if (data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setAvgRating(avg);
      setTotalRatings(data.length);
    }
  };

  const handleConfirm = async () => {
    if (!confirmingReservation) return;
    
    setUpdating(true);
    
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'confirmed' })
      .eq('id', confirmingReservation.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo confirmar la reserva',
        variant: 'destructive',
      });
    } else {
      toast({
        title: '¡Confirmada!',
        description: 'La reserva ha sido confirmada. El cliente podrá valorarte.',
      });
      fetchReservations();
    }
    
    setConfirmingReservation(null);
    setUpdating(false);
  };

  const handleCancel = async () => {
    if (!cancellingReservation) return;
    
    setUpdating(true);
    
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', cancellingReservation.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la reserva',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Cancelada',
        description: 'La reserva ha sido cancelada',
      });
      fetchReservations();
    }
    
    setCancellingReservation(null);
    setUpdating(false);
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

  const filterByStatus = (status: string | null) => {
    if (!status) return reservations;
    return reservations.filter(r => r.status === status);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = filterByStatus('pending').length;
  const confirmedCount = filterByStatus('confirmed').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-6">
        {/* Header with ratings */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Reservas Recibidas</h1>
            <p className="text-muted-foreground">
              {reservations.length} reserva(s) en total
            </p>
          </div>
          
          {avgRating !== null && (
            <Card className="sm:w-auto">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-6 w-6 fill-current" />
                  <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Tu valoración</p>
                  <p>{totalRatings} opiniones</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sin reservas</h2>
            <p className="text-muted-foreground max-w-md">
              Aún no has recibido ninguna reserva. Cuando los suscriptores reserven tus ofertas, aparecerán aquí.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pendientes {pendingCount > 0 && `(${pendingCount})`}
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmadas {confirmedCount > 0 && `(${confirmedCount})`}
              </TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>

            {['pending', 'confirmed', 'all'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {filterByStatus(tab === 'all' ? null : tab).map(reservation => (
                  <Card key={reservation.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-lg">{reservation.offer.title}</CardTitle>
                        {getStatusBadge(reservation.status)}
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {reservation.offer.price.toFixed(2)}€
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{reservation.subscriber_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${reservation.subscriber_email}`} className="hover:underline">
                            {reservation.subscriber_email}
                          </a>
                        </div>
                        {reservation.subscriber_phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${reservation.subscriber_phone}`} className="hover:underline">
                              {reservation.subscriber_phone}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(parseISO(reservation.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                        </div>
                      </div>

                      {reservation.message && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <p className="text-sm">{reservation.message}</p>
                          </div>
                        </div>
                      )}

                      {reservation.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            onClick={() => setConfirmingReservation(reservation)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirmar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCancellingReservation(reservation)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {filterByStatus(tab === 'all' ? null : tab).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay reservas {tab === 'pending' ? 'pendientes' : tab === 'confirmed' ? 'confirmadas' : ''}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmingReservation} onOpenChange={() => setConfirmingReservation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmarás la reserva de "{confirmingReservation?.offer.title}" para {confirmingReservation?.subscriber_name}. 
              El cliente podrá valorarte después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancellingReservation} onOpenChange={() => setCancellingReservation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancelarás la reserva de "{cancellingReservation?.offer.title}" para {cancellingReservation?.subscriber_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Volver</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel} 
              disabled={updating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
