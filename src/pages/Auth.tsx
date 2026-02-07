import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tag, Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  town: z.string().min(2, 'La población debe tener al menos 2 caracteres'),
  role: z.enum(['PUBLICADOR', 'SUSCRIPTOR']),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('mode') === 'register');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    town: '',
    role: '' as 'PUBLICADOR' | 'SUSCRIPTOR' | '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signUp, signIn, user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && role) {
      const redirectPath = role === 'PUBLICADOR' ? '/publish' : '/feed';
      navigate(redirectPath);
    }
  }, [user, role, navigate]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    try {
      if (isRegister) {
        registerSchema.parse(formData);
      } else {
        loginSchema.parse(formData);
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isRegister) {
        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.name,
          formData.town,
          formData.role as 'PUBLICADOR' | 'SUSCRIPTOR'
        );

        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Usuario ya existe',
              description: 'Este email ya está registrado. Intenta iniciar sesión.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Error al registrar',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: '¡Registro exitoso!',
            description: 'Revisa tu email para confirmar tu cuenta.',
          });
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Credenciales incorrectas',
              description: 'Email o contraseña incorrectos.',
              variant: 'destructive',
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: 'Email no confirmado',
              description: 'Por favor, confirma tu email antes de iniciar sesión.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Error al iniciar sesión',
              description: error.message,
              variant: 'destructive',
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Algo salió mal. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="gradient-primary rounded-xl p-3">
              <Tag className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? 'Únete a Publicitta y descubre ofertas increíbles'
              : 'Accede a tu cuenta para continuar'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="town">Población</Label>
                  <Input
                    id="town"
                    placeholder="Tu ciudad o pueblo"
                    value={formData.town}
                    onChange={e => handleChange('town', e.target.value)}
                  />
                  {errors.town && (
                    <p className="text-sm text-destructive">{errors.town}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo de cuenta</Label>
                  <Select
                    value={formData.role}
                    onValueChange={value => handleChange('role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUSCRIPTOR">
                        🛒 Suscriptor - Busco ofertas
                      </SelectItem>
                      <SelectItem value="PUBLICADOR">
                        🏪 Publicador - Publico ofertas
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => handleChange('password', e.target.value)}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRegister ? 'Registrando...' : 'Iniciando...'}
                </>
              ) : (
                isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            </span>{' '}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-primary hover:underline font-medium"
            >
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
