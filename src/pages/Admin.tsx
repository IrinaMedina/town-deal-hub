import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, XCircle, Clock, Building2, Eye, Trash2, MapPin, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBusinessCategoryLabel, getBusinessCategoryIcon } from '@/lib/constants';
import { BusinessProfileDialog } from '@/components/BusinessProfileDialog';

interface Business {
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
  rating_avg: number;
  rating_count: number;
  status: string;
  created_at: string;
  trial_ends_at: string | null;
  created_by: string;
}

export default function Admin() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (!authLoading && role !== 'ADMIN') navigate('/');
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'ADMIN') fetchBusinesses();
  }, [user, role]);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setBusinesses(data as unknown as Business[]);
    setLoading(false);
  };

  const updateStatus = async (bizId: string, status: string) => {
    const { error } = await supabase
      .from('businesses')
      .update({ status })
      .eq('id', bizId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: status === 'approved' ? '✅ Empresa aprobada' : '❌ Empresa rechazada' });
      fetchBusinesses();
    }
  };

  const deleteBusiness = async (bizId: string) => {
    if (!confirm('¿Eliminar esta empresa permanentemente?')) return;
    const { error } = await supabase.from('businesses').delete().eq('id', bizId);
    if (!error) {
      toast({ title: 'Empresa eliminada' });
      fetchBusinesses();
    }
  };

  const filtered = businesses.filter(b => {
    if (activeTab === 'pending') return b.status === 'pending';
    if (activeTab === 'approved') return b.status === 'approved';
    if (activeTab === 'rejected') return b.status === 'rejected';
    return true;
  });

  const counts = {
    pending: businesses.filter(b => b.status === 'pending').length,
    approved: businesses.filter(b => b.status === 'approved').length,
    rejected: businesses.filter(b => b.status === 'rejected').length,
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Aprobada</Badge>;
      case 'rejected': return <Badge variant="destructive">Rechazada</Badge>;
      default: return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Panel de Administración
            </CardTitle>
            <CardDescription>Gestiona las empresas y controla qué se publica en el directorio</CardDescription>
          </CardHeader>

          <CardContent>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Pendientes</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{counts.approved}</p>
                <p className="text-xs text-green-700 dark:text-green-400">Aprobadas</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{counts.rejected}</p>
                <p className="text-xs text-red-700 dark:text-red-400">Rechazadas</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="pending" className="flex-1">Pendientes ({counts.pending})</TabsTrigger>
                <TabsTrigger value="approved" className="flex-1">Aprobadas ({counts.approved})</TabsTrigger>
                <TabsTrigger value="rejected" className="flex-1">Rechazadas ({counts.rejected})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>No hay empresas en esta categoría</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(biz => (
                      <div key={biz.id} className="border rounded-lg p-4">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {biz.logo_url ? (
                              <img src={biz.logo_url} alt={biz.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">{getBusinessCategoryIcon(biz.category)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{biz.name}</h3>
                              {statusBadge(biz.status)}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {getBusinessCategoryIcon(biz.category)} {getBusinessCategoryLabel(biz.category)}
                            </Badge>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{biz.town}</span>
                              {biz.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{biz.phone}</span>}
                              <span>Registrada: {new Date(biz.created_at).toLocaleDateString('es-ES')}</span>
                              {biz.trial_ends_at && (
                                <span>Trial: {new Date(biz.trial_ends_at).toLocaleDateString('es-ES')}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3 justify-end flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => setSelectedBiz(biz)}>
                            <Eye className="h-3.5 w-3.5 mr-1" />Ver
                          </Button>
                          {biz.status !== 'approved' && (
                            <Button size="sm" onClick={() => updateStatus(biz.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-white">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprobar
                            </Button>
                          )}
                          {biz.status !== 'rejected' && (
                            <Button size="sm" variant="secondary" onClick={() => updateStatus(biz.id, 'rejected')}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Rechazar
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteBusiness(biz.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {selectedBiz && (
        <BusinessProfileDialog
          business={selectedBiz}
          open={!!selectedBiz}
          onClose={() => setSelectedBiz(null)}
          onReviewAdded={fetchBusinesses}
        />
      )}
    </div>
  );
}
