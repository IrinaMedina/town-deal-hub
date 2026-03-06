import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, MapPin, Phone, Star, Clock, Building2, ArrowRight } from 'lucide-react';
import { BUSINESS_CATEGORIES, getBusinessCategoryLabel, getBusinessCategoryIcon } from '@/lib/constants';
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
}

export default function Index() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTown, setSelectedTown] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .order('rating_avg', { ascending: false });
    if (data) {
      setBusinesses(data as unknown as Business[]);
      const uniqueTowns = [...new Set(data.map(b => b.town))].sort();
      setTowns(uniqueTowns);
    }
    setLoading(false);
  };

  const filtered = businesses.filter(b => {
    const matchTown = selectedTown === 'all' || b.town === selectedTown;
    const matchCategory = !selectedCategory || b.category === selectedCategory;
    const matchSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.description || '').toLowerCase().includes(search.toLowerCase());
    return matchTown && matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <div className="gradient-primary">
        <div className="container py-12 md:py-20">
          <div className="flex flex-col items-center text-center text-white">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6">
              <Building2 className="h-12 w-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Publicitta
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-2xl mb-8">
              Encuentra empresas y profesionales en tu población
            </p>

            {/* Town Selector */}
            <div className="w-full max-w-md">
              <Select value={selectedTown} onValueChange={setSelectedTown}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white h-12 text-lg [&>span]:text-white placeholder:text-white/70">
                  <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Selecciona tu población" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las poblaciones</SelectItem>
                  {towns.map(town => (
                    <SelectItem key={town} value={town}>{town}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <main className="container py-6 max-w-5xl">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge
            variant={selectedCategory === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            Todas
          </Badge>
          {BUSINESS_CATEGORIES.map(cat => (
            <Badge
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
            >
              {cat.icon} {cat.label}
            </Badge>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No se encontraron empresas</p>
            <p className="text-sm mt-1">Prueba con otra población o categoría</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
              {selectedTown !== 'all' ? ` en ${selectedTown}` : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(biz => (
                <Card
                  key={biz.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedBusiness(biz)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {biz.logo_url ? (
                          <img src={biz.logo_url} alt={biz.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{getBusinessCategoryIcon(biz.category)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{biz.name}</h3>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {getBusinessCategoryIcon(biz.category)} {getBusinessCategoryLabel(biz.category)}
                        </Badge>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{biz.town}</span>
                          {biz.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{biz.phone}</span>}
                        </div>
                        {biz.rating_count > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{biz.rating_avg}</span>
                            <span className="text-xs text-muted-foreground">({biz.rating_count})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* CTA for businesses */}
        {!user && (
          <div className="mt-12 bg-muted rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              ¿Tienes una empresa o negocio?
            </h2>
            <p className="text-muted-foreground mb-6">
              Regístrate y publicita tu empresa para que los usuarios de tu población te encuentren fácilmente
            </p>
            <Button asChild size="lg">
              <Link to="/auth?mode=register">
                Registrar mi empresa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Publicitta. Empresas y profesionales en tu población.</p>
        </div>
      </footer>

      {selectedBusiness && (
        <BusinessProfileDialog
          business={selectedBusiness}
          open={!!selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          onReviewAdded={fetchBusinesses}
        />
      )}
    </div>
  );
}
