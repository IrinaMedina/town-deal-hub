import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tag, ShoppingBag, Store, ArrowRight, Loader2 } from 'lucide-react';

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      const redirectPath = role === 'PUBLICADOR' ? '/publish' : '/feed';
      navigate(redirectPath);
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="gradient-primary">
        <div className="container py-16 md:py-24">
          <div className="flex flex-col items-center text-center text-white">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6">
              <Tag className="h-12 w-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Publicitta
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-2xl mb-8">
              Descubre las mejores ofertas outlet de tu población
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" variant="secondary" className="text-lg">
                <Link to="/auth?mode=register">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Buscar Ofertas
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white">
                <Link to="/auth?mode=register">
                  <Store className="mr-2 h-5 w-5" />
                  Publicar Ofertas
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">¿Cómo funciona?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Publicitta conecta tiendas con ofertas outlet con personas que buscan las mejores gangas en su zona
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Subscriber Card */}
          <div className="bg-card rounded-2xl p-8 shadow-card border">
            <div className="bg-secondary/20 rounded-full w-14 h-14 flex items-center justify-center mb-6">
              <ShoppingBag className="h-7 w-7 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Para Compradores</h3>
            <ul className="space-y-3 text-muted-foreground mb-6">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                Regístrate y elige tu población
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                Selecciona las categorías que te interesan
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                Recibe ofertas personalizadas en tu feed
              </li>
            </ul>
            <Button asChild variant="secondary">
              <Link to="/auth?mode=register">
                Empezar a buscar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Publisher Card */}
          <div className="bg-card rounded-2xl p-8 shadow-card border">
            <div className="bg-primary/20 rounded-full w-14 h-14 flex items-center justify-center mb-6">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Para Tiendas</h3>
            <ul className="space-y-3 text-muted-foreground mb-6">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                Crea tu cuenta de publicador
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                Publica tus ofertas con fotos y detalles
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                Llega a clientes de tu zona interesados
              </li>
            </ul>
            <Button asChild>
              <Link to="/auth?mode=register">
                Empezar a publicar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container pb-16">
        <div className="bg-muted rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            ¿Ya tienes cuenta?
          </h2>
          <p className="text-muted-foreground mb-6">
            Inicia sesión para acceder a tu feed de ofertas o publicar nuevas
          </p>
          <Button asChild size="lg">
            <Link to="/auth">Iniciar Sesión</Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Publicitta. Ofertas outlet en tu población.</p>
        </div>
      </footer>
    </div>
  );
}
