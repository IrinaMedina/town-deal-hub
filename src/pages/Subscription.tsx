import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/lib/constants';

export default function Subscription() {
  const { user, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [town, setTown] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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

  const fetchSubscription = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('town, categories')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!error && data) {
      setTown(data.town);
      setSelectedCategories(data.categories || []);
    } else if (profile) {
      // Default to user's town from profile
      setTown(profile.town);
    }
    setLoading(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    if (!town.trim()) {
      toast({
        title: 'Error',
        description: 'Debes indicar una población',
        variant: 'destructive',
      });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona al menos una categoría',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user!.id,
        town: town.trim(),
        categories: selectedCategories as ("OUTLET_ROPA" | "OUTLET_TECNO" | "OUTLET_HOGAR" | "OUTLET_ZAPATOS" | "OUTLET_BELLEZA" | "OTROS")[],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la suscripción',
        variant: 'destructive',
      });
    } else {
      toast({
        title: '¡Guardado!',
        description: 'Tu suscripción ha sido actualizada',
      });
      navigate('/feed');
    }

    setSaving(false);
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
      
      <main className="container py-6 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/feed')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Feed
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Gestionar Suscripción</CardTitle>
            <CardDescription>
              Personaliza las ofertas que quieres ver eligiendo tu población y categorías de interés.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="town">Población</Label>
              <Input
                id="town"
                placeholder="Ej: Madrid, Barcelona..."
                value={town}
                onChange={e => setTown(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Solo verás ofertas de esta población
              </p>
            </div>

            <div className="space-y-3">
              <Label>Categorías de interés</Label>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(category => (
                  <div
                    key={category.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCategories.includes(category.value)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => toggleCategory(category.value)}
                  >
                    <Checkbox
                      checked={selectedCategories.includes(category.value)}
                      onCheckedChange={() => toggleCategory(category.value)}
                    />
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${category.color}`} />
                      <span className="font-medium">{category.label}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedCategories.length} categoría(s) seleccionada(s)
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Suscripción
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
