import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, MapPin, Phone, Star, Globe, Clock } from 'lucide-react';
import { BUSINESS_CATEGORIES, getBusinessCategoryLabel, getBusinessCategoryColor, getBusinessCategoryIcon } from '@/lib/constants';
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

export default function Directory() {

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
    if (data) setBusinesses(data as unknown as Business[]);
    setLoading(false);
  };

  const filtered = businesses.filter(b => {
    const matchSearch = !search || 
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.town.toLowerCase().includes(search.toLowerCase()) ||
      (b.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = !selectedCategory || b.category === selectedCategory;
    return matchSearch && matchCategory;
  });


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Directorio de Empresas</h1>
          <p className="text-muted-foreground">Encuentra profesionales y servicios en tu localidad</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, población o descripción..."
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
            <p className="text-lg">No se encontraron empresas</p>
            <p className="text-sm mt-1">Prueba con otros filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(biz => (
              <Card
                key={biz.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedBusiness(biz)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Logo */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
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
                        {biz.schedule && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{biz.schedule}</span>}
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
        )}
      </main>

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
