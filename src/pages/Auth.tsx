/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/Auth.tsx */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Importamos componentes de Dialog para el "cuadro flotante"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Zap, Shield, Users, ArrowRight, CheckCircle2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

// --- PANTALLA DE CARGA / BIENVENIDA (Mantenemos esta joya) ---
const WelcomeScreen = () => (
  <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="flex flex-col items-center gap-6 p-8 rounded-xl bg-card border shadow-2xl max-w-sm w-full mx-4 text-center relative overflow-hidden">
         <div className="relative z-10">
             <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75"></div>
             <div className="bg-primary/10 p-4 rounded-full text-primary relative">
                 <img src="/nexus-logo.png" alt="Logo" className="w-12 h-12 animate-pulse" />
             </div>
         </div>
         <div className="space-y-2 z-10">
             <h2 className="text-2xl font-bold tracking-tight text-primary">Bienvenido al Sistema</h2>
             <p className="text-muted-foreground text-sm">Preparando tu entorno de trabajo...</p>
         </div>
         <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden relative z-10">
             <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-primary rounded-full animate-[slide_1s_infinite_linear]"></div>
         </div>
         {/* Decoración de fondo */}
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      </div>
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
  </div>
);

// --- COMPONENTE DE TARJETA DE CARACTERÍSTICA (Para la Landing) ---
const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="p-6 rounded-2xl bg-card/50 border backdrop-blur-sm hover:bg-card/80 hover:shadow-lg transition-all duration-300 text-left group">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
    </div>
);

const Auth = () => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ fullName: '', email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState<any>({});
  const [registerErrors, setRegisterErrors] = useState<any>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  // Estado para controlar si el modal de login está abierto
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
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
      setShowWelcome(true);
      setAuthDialogOpen(false); // Cerramos el modal para mostrar la bienvenida limpia
      setTimeout(() => { navigate('/dashboard'); }, 2000);
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
        setAuthDialogOpen(false);
        setTimeout(() => { navigate('/dashboard'); }, 1500);
    }
  };

  // Loader inicial
  if (loading) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      );
  }

  if (showWelcome) return <WelcomeScreen />;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col relative overflow-hidden font-sans">
      
      {/* --- FONDO --- */}
      <div className="absolute inset-0 z-0">
          {/* Gradiente superpuesto para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/50 to-background z-10" />
          {/* Imagen de fondo con movimiento sutil */}
          <img 
            src="/soporte-ti.webp" 
            alt="Background" 
            className="w-full h-full object-cover opacity-20 animate-[pulse_10s_infinite]"
          />
      </div>

      {/* --- NAVBAR --- */}
      <nav className="relative z-20 container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg backdrop-blur-sm border border-primary/20">
                <img src="/nexus-logo.png" alt="Logo" className="w-8 h-8" />
              </div>
              <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                  Nexus Desk
              </span>
          </div>
          <Button variant="outline" onClick={() => setAuthDialogOpen(true)} className="hidden sm:flex border-primary/20 hover:bg-primary/5">
              Acceso Personal
          </Button>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="relative z-20 container mx-auto flex-1 flex flex-col items-center justify-center text-center px-4 pb-12 pt-8">
          
          {/* Badge de novedad */}
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-background/80 backdrop-blur-md mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
             <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
             Sistema Operativo v2.0
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-5xl mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 leading-tight">
             Soporte Técnico <br/>
             <span className="text-primary">Inteligente y Sin Fricción</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 leading-relaxed">
             Centraliza tickets, asigna tareas automáticamente y mejora los tiempos de respuesta. La plataforma definitiva para equipos de alto rendimiento.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <Button size="lg" onClick={() => setAuthDialogOpen(true)} className="w-full gap-2 text-lg h-14 shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                 Ingresar al Sistema <ArrowRight className="w-5 h-5" />
              </Button>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full max-w-6xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              <FeatureCard 
                  icon={Zap} 
                  title="Gestión Ágil" 
                  desc="Tableros Kanban y listas inteligentes para resolver incidencias en tiempo récord."
              />
              <FeatureCard 
                  icon={Shield} 
                  title="Seguridad Total" 
                  desc="Roles granulares y protección de datos para mantener la integridad de tu información."
              />
              <FeatureCard 
                  icon={Users} 
                  title="Colaboración" 
                  desc="Chat en tiempo real, notas de voz y asignación automática de técnicos."
              />
          </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="relative z-20 border-t bg-background/80 backdrop-blur-md py-8 mt-auto">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
              <p>© 2025 Nexus Desk. Todos los derechos reservados.</p>
          </div>
      </footer>

      {/* --- MODAL FLOTANTE DE LOGIN/REGISTRO --- */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 gap-0 overflow-hidden border-none shadow-2xl bg-transparent">
              
              <div className="bg-card border rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-6 bg-muted/30 border-b text-center">
                      <DialogHeader>
                          <DialogTitle className="text-2xl font-bold text-center">Bienvenido</DialogTitle>
                          <DialogDescription className="text-center">Ingresa tus credenciales para continuar</DialogDescription>
                      </DialogHeader>
                  </div>
                  
                  <div className="p-6 pt-4 bg-card">
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                            <TabsTrigger value="register">Registrarse</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="login" className="mt-0 space-y-4">
                            <form onSubmit={handleLogin} className="space-y-4">
                                {loginErrors.general && (
                                    <Alert variant="destructive" className="py-2"><AlertCircle className="h-4 w-4"/><AlertDescription>{loginErrors.general}</AlertDescription></Alert>
                                )}
                                <div className="space-y-2">
                                    <Label>Correo Electrónico</Label>
                                    <Input type="email" placeholder="tu@email.com" value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} className={cn(loginErrors.email && "border-destructive")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contraseña</Label>
                                    <Input type="password" placeholder="••••••••" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} className={cn(loginErrors.password && "border-destructive")} />
                                </div>
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando...</> : 'Entrar'}
                                </Button>
                            </form>
                        </TabsContent>
                        
                        <TabsContent value="register" className="mt-0 space-y-4">
                            <form onSubmit={handleRegister} className="space-y-4">
                                {registerErrors.general && (
                                    <Alert variant="destructive" className="py-2"><AlertCircle className="h-4 w-4"/><AlertDescription>{registerErrors.general}</AlertDescription></Alert>
                                )}
                                <div className="space-y-2">
                                    <Label>Nombre Completo</Label>
                                    <Input placeholder="Juan Pérez" value={registerData.fullName} onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })} className={cn(registerErrors.fullName && "border-destructive")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Correo</Label>
                                    <Input type="email" placeholder="tu@email.com" value={registerData.email} onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} className={cn(registerErrors.email && "border-destructive")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contraseña</Label>
                                    <Input type="password" placeholder="Min 6 caracteres" value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} className={cn(registerErrors.password && "border-destructive")} />
                                </div>
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</> : 'Crear Cuenta'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                  </div>
              </div>
          </DialogContent>
      </Dialog>

    </div>
  );
};

export default Auth;