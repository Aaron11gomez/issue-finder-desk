import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

// --- COMPONENTE VISUAL: PANTALLA DE BIENVENIDA ---
const WelcomeScreen = () => (
  <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="flex flex-col items-center gap-6 p-8 rounded-xl bg-card border shadow-2xl max-w-sm w-full mx-4 text-center">
         <div className="relative">
             <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75"></div>
             <div className="bg-primary/10 p-4 rounded-full text-primary relative">
                 <img src="/nexus-logo.png" alt="Logo" className="w-12 h-12 animate-pulse" />
             </div>
         </div>
         <div className="space-y-2">
             <h2 className="text-2xl font-bold tracking-tight text-primary">Bienvenido al Sistema</h2>
             <p className="text-muted-foreground text-sm">Estamos preparando tu entorno de trabajo...</p>
         </div>
         {/* Barra de carga animada */}
         <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden relative">
             <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-primary rounded-full animate-[slide_1s_infinite_linear]"></div>
         </div>
      </div>
      {/* Animación CSS inline para la barra */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
  </div>
);

const Auth = () => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ fullName: '', email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState<any>({});
  const [registerErrors, setRegisterErrors] = useState<any>({});
  
  // Estados para controlar la interfaz
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  // Obtenemos 'loading' del hook para evitar el parpadeo inicial
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  // 1. EFECTO DE REDIRECCIÓN
  useEffect(() => {
    // Si no está cargando, existe un usuario y NO estamos mostrando la bienvenida (para no cortar la animación)
    if (!loading && user && !showWelcome) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate, showWelcome]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach((err) => { if (err.path[0]) errors[err.path[0]] = err.message; });
      setLoginErrors(errors);
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await signIn(loginData.email, loginData.password);
    
    if (error) {
      setIsSubmitting(false);
      if (error.message.includes('Invalid')) {
        setLoginErrors({ general: 'Credenciales incorrectas. Verifica tu correo o contraseña.' });
      } else {
        setLoginErrors({ general: error.message });
      }
    } else {
      // ÉXITO: Activamos la pantalla bonita y esperamos un momento antes de dejar que el router cambie
      setShowWelcome(true);
      setTimeout(() => {
          navigate('/dashboard');
      }, 2000); // 2 segundos para ver la animación de bienvenida
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterErrors({});
    
    const result = registerSchema.safeParse(registerData);
    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach((err) => { if (err.path[0]) errors[err.path[0]] = err.message; });
      setRegisterErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(registerData.email, registerData.password, registerData.fullName);
    
    if (error) {
      setIsSubmitting(false);
      if (error.message.includes('already registered')) {
        setRegisterErrors({ email: 'Este correo electrónico ya está en uso' });
      } else {
        setRegisterErrors({ general: error.message });
      }
    } else {
        setShowWelcome(true);
        setTimeout(() => { navigate('/dashboard'); }, 1500);
    }
  };

  // 2. PREVENCIÓN DE PARPADEO (BUG VISUAL)
  // Si Supabase aún está verificando la sesión (loading=true),
  // mostramos un spinner en blanco en vez del formulario.
  if (loading) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      );
  }

  // 3. MOSTRAR PANTALLA DE BIENVENIDA SI EL LOGIN FUE EXITOSO
  if (showWelcome) {
      return <WelcomeScreen />;
  }

  // 4. RENDERIZADO DEL FORMULARIO (Solo si no carga y no hay usuario)
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      
      {/* Columna Izquierda (Imagen) */}
      <div className="hidden lg:flex lg:flex-col items-center justify-center p-10 text-center relative bg-[url('/soporte-ti.webp')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/60 z-0"></div>
        <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto">
          <div className="absolute top-8 left-0 flex items-center gap-3">
            <img src="/nexus-logo.png" alt="Nexus Desk Logo" className="w-8 h-8" />
            <span className="text-xl font-bold text-primary-foreground">Nexus Desk</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold text-white">Bienvenido a tu Centro de Soporte</h1>
            <p className="text-white/80 mt-4">Gestiona tus tickets, resuelve problemas y mantén a tu equipo en movimiento.</p>
          </div>
          <p className="text-xs text-white/60">© 2025 Nexus Desk. Todos los derechos reservados.</p>
        </div>
      </div>

      {/* Columna Derecha (Formulario) */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background animate-fade-in">
        <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Acceso a la Plataforma</CardTitle>
            <CardDescription className="text-center">Selecciona si quieres iniciar sesión o registrarte.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="pt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  {loginErrors.general && (
                    <Alert variant="destructive" className="animate-fade-in">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{loginErrors.general}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Correo Electrónico</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className={cn(loginErrors.email && "border-destructive focus-visible:ring-destructive")}
                    />
                    {loginErrors.email && <p className="text-sm text-destructive">{loginErrors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className={cn(loginErrors.password && "border-destructive focus-visible:ring-destructive")}
                    />
                    {loginErrors.password && <p className="text-sm text-destructive">{loginErrors.password}</p>}
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando...
                        </>
                    ) : (
                        'Iniciar Sesión'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="pt-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  {registerErrors.general && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{registerErrors.general}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nombre Completo</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={registerData.fullName}
                      onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                      className={cn(registerErrors.fullName && "border-destructive")}
                    />
                    {registerErrors.fullName && <p className="text-sm text-destructive">{registerErrors.fullName}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Correo Electrónico</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className={cn(registerErrors.email && "border-destructive")}
                    />
                    {registerErrors.email && <p className="text-sm text-destructive">{registerErrors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className={cn(registerErrors.password && "border-destructive")}
                    />
                    {registerErrors.password && <p className="text-sm text-destructive">{registerErrors.password}</p>}
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando cuenta...</>
                    ) : 'Crear Cuenta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;