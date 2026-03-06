import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, Tag, PlusCircle, List, Settings, Inbox, ShoppingBag, Building2, Search, Shield } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, role, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
    setOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const NavLinks = () => (
    <>
      {/* Directory link for all users */}
      <Link
        to="/directory"
        onClick={() => setOpen(false)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isActive('/directory') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        }`}
      >
        <Search className="h-4 w-4" />
        Directorio
      </Link>
      {role === 'SUSCRIPTOR' && (
        <>
          <Link
            to="/feed"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/feed') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Tag className="h-4 w-4" />
            Ofertas
          </Link>
          <Link
            to="/my-reservations"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/my-reservations') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Mis Reservas
          </Link>
          <Link
            to="/messages"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/messages') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Inbox className="h-4 w-4" />
            Mensajes
          </Link>
        </>
      )}
      {role === 'PUBLICADOR' && (
        <>
          <Link
            to="/publish"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/publish') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Publicar
          </Link>
          <Link
            to="/my-offers"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/my-offers') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <List className="h-4 w-4" />
            Mis Ofertas
          </Link>
          <Link
            to="/reservations"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/reservations') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Inbox className="h-4 w-4" />
            Reservas
          </Link>
        </>
      )}
      {role === 'EMPRESA' && (
        <>
          <Link
            to="/my-business"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/my-business') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Mi Empresa
          </Link>
          <Link
            to="/publish"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/publish') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Publicar Ofertas
          </Link>
          <Link
            to="/my-offers"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/my-offers') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <List className="h-4 w-4" />
            Mis Ofertas
          </Link>
          <Link
            to="/messages"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isActive('/messages') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Inbox className="h-4 w-4" />
            Mensajes
          </Link>
        </>
      )}
      {role === 'ADMIN' && (
        <Link
          to="/admin"
          onClick={() => setOpen(false)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            isActive('/admin') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          <Shield className="h-4 w-4" />
          Admin
        </Link>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="gradient-primary rounded-lg p-2">
            <Tag className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Publicitta
          </span>
        </Link>

        {/* Desktop Navigation */}
        {user && !loading && (
          <div className="hidden md:flex items-center gap-2">
            <NavLinks />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="ml-4 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        )}

        {/* Auth buttons for non-logged users */}
        {!user && !loading && (
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?mode=register">Registrarse</Link>
            </Button>
          </div>
        )}

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col gap-4 mt-8">
              {user ? (
                <>
                  <NavLinks />
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="justify-start text-muted-foreground"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      Iniciar Sesión
                    </Link>
                  </Button>
                  <Button asChild className="justify-start">
                    <Link to="/auth?mode=register" onClick={() => setOpen(false)}>
                      Registrarse
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
