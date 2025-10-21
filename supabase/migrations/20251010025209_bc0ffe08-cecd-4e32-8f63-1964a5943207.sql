-- 1. BORRADO DE LA ESTRUCTURA ANTIGUA CON CASCADE
-- Se usa CASCADE para eliminar automáticamente objetos dependientes (funciones, políticas, etc.)
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.ticket_status CASCADE;
DROP TYPE IF EXISTS public.ticket_priority CASCADE;

-- 2. CREACIÓN DE TIPOS (ENUMS)
-- Define los valores permitidos para roles, estados y prioridades.
CREATE TYPE public.app_role AS ENUM ('admin', 'technician', 'client');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high');

-- 3. CREACIÓN DE TABLAS
-- Tabla para perfiles de usuario, vinculada a la autenticación de Supabase.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para asignar roles a los usuarios.
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla principal para los tickets de soporte.
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  resolution_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para los comentarios en cada ticket.
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- Para notas visibles solo por técnicos/admins
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. FUNCIONES Y DISPARADORES (TRIGGERS)
-- Se eliminan el disparador y la función si existen para evitar errores al re-ejecutar.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Función para crear automáticamente un perfil y un rol de 'cliente' cuando un nuevo usuario se registra.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Crear el perfil del usuario
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario sin nombre'));

  -- Asignar el rol de 'client' por defecto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'client');

  RETURN new;
END;
$$;

-- Disparador que ejecuta la función 'handle_new_user' después de una inserción en 'auth.users'.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
-- Es crucial para la seguridad, asegura que los usuarios solo vean los datos que les corresponden.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE SEGURIDAD (RLS POLICIES)
-- ** Políticas para la tabla 'profiles' **
CREATE POLICY "Los usuarios pueden ver su propio perfil." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Los administradores pueden ver todos los perfiles." ON public.profiles FOR SELECT USING ( (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin' );
CREATE POLICY "Los usuarios pueden actualizar su propio perfil." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ** Políticas para la tabla 'user_roles' **
CREATE POLICY "Los usuarios pueden ver su propio rol." ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los administradores pueden gestionar todos los roles." ON public.user_roles FOR ALL USING ( (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin' );

-- ** Políticas para la tabla 'tickets' **
CREATE POLICY "Los usuarios pueden ver sus tickets creados." ON public.tickets FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Técnicos y admins pueden ver todos los tickets." ON public.tickets FOR SELECT USING ( (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'technician') );
CREATE POLICY "Los usuarios pueden crear tickets." ON public.tickets FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Técnicos y admins pueden actualizar tickets." ON public.tickets FOR UPDATE USING ( (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'technician') );

-- ** Políticas para la tabla 'comments' **
CREATE POLICY "Usuarios involucrados pueden ver comentarios públicos." ON public.comments FOR SELECT USING (is_internal = false AND ticket_id IN (SELECT id FROM tickets WHERE created_by = auth.uid() OR assigned_to = auth.uid()));
CREATE POLICY "Técnicos y admins pueden ver todos los comentarios." ON public.comments FOR SELECT USING ( (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'technician') );
CREATE POLICY "Usuarios involucrados pueden crear comentarios." ON public.comments FOR INSERT WITH CHECK (user_id = auth.uid() AND ticket_id IN (SELECT id FROM tickets WHERE created_by = auth.uid() OR assigned_to = auth.uid()));
CREATE POLICY "Técnicos y admins pueden crear cualquier comentario." ON public.comments FOR INSERT WITH CHECK ( (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'technician') );

-- 7. ÍNDICES PARA MEJORAR EL RENDIMIENTO
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
