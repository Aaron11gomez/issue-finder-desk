import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket } from 'lucide-react';
import { z } from 'zod';
import { useEffect } from 'react';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

const Auth = () => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ fullName: '', email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState<any>({});
  const [registerErrors, setRegisterErrors] = useState<any>({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0]] = err.message;
        }
      });
      setLoginErrors(errors);
      return;
    }

    setLoginLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setLoginLoading(false);

    if (error) {
      if (error.message.includes('Invalid')) {
        setLoginErrors({ general: 'Las credenciales son inválidas' });
      } else {
        setLoginErrors({ general: error.message });
      }
    } else {
      navigate('/dashboard');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterErrors({});
    
    const result = registerSchema.safeParse(registerData);
    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0]] = err.message;
        }
      });
      setRegisterErrors(errors);
      return;
    }

    setRegisterLoading(true);
    const { error } = await signUp(registerData.email, registerData.password, registerData.fullName);
    setRegisterLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setRegisterErrors({ email: 'Este correo electrónico ya está en uso' });
      } else {
        setRegisterErrors({ general: error.message });
      }
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-2">
            <Ticket className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Nexus Desk</CardTitle>
          <CardDescription className="text-center">
            Sistema de Gestión de Tickets de Soporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo Electrónico</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-destructive">{loginErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  />
                  {loginErrors.password && (
                    <p className="text-sm text-destructive">{loginErrors.password}</p>
                  )}
                </div>

                {loginErrors.general && (
                  <p className="text-sm text-destructive">{loginErrors.general}</p>
                )}
                
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nombre Completo</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Juan Pérez"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                  />
                  {registerErrors.fullName && (
                    <p className="text-sm text-destructive">{registerErrors.fullName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-email">Correo Electrónico</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  />
                  {registerErrors.email && (
                    <p className="text-sm text-destructive">{registerErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  />
                  {registerErrors.password && (
                    <p className="text-sm text-destructive">{registerErrors.password}</p>
                  )}
                </div>

                {registerErrors.general && (
                  <p className="text-sm text-destructive">{registerErrors.general}</p>
                )}
                
                <Button type="submit" className="w-full" disabled={registerLoading}>
                  {registerLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;