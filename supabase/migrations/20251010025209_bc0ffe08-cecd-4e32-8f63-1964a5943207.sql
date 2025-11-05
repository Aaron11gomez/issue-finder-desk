-- =================================================================
-- ========= SCRIPT DE MIGRACIÓN FINAL Y CORREGIDO =================
-- =================================================================

-- 1. BORRADO DE LA ESTRUCTURA ANTIGUA CON CASCADE
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.ticket_status CASCADE;
DROP TYPE IF EXISTS public.ticket_priority CASCADE;

-- 2. CREACIÓN DE TIPOS (ENUMS)
CREATE TYPE public.app_role AS ENUM ('admin', 'technician', 'client');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high');

-- 3. CREACIÓN DE TABLAS
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. FUNCIONES Y DISPARADORES (TRIGGERS)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario sin nombre'));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'client');

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =================================================================
-- ========= SECCIÓN DE CORRECCIONES (RLS, RPC, PERMISOS) ==========
-- =================================================================

-- 4.A. FUNCIÓN DE AYUDA PARA OBTENER EL ROL (SIN RECURSIÓN)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$;

-- 5. HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE SEGURIDAD (RLS POLICIES) CORREGIDAS
-- (Se elimina la revisión de 'is_active' de las políticas)

-- ** Políticas para 'profiles' **
CREATE POLICY "Los usuarios pueden ver su propio perfil." ON public.profiles
  FOR SELECT USING ( auth.uid() = id );
  
CREATE POLICY "Los administradores pueden ver todos los perfiles." ON public.profiles
  FOR SELECT USING ( public.get_my_role() = 'admin' );
  
CREATE POLICY "Los usuarios pueden actualizar su propio perfil." ON public.profiles
  FOR UPDATE USING ( auth.uid() = id );

CREATE POLICY "Los usuarios pueden crear su propio perfil." ON public.profiles
  FOR INSERT WITH CHECK ( auth.uid() = id );

-- ** Políticas para 'user_roles' **
CREATE POLICY "Los usuarios pueden ver su propio rol." ON public.user_roles
  FOR SELECT USING ( auth.uid() = user_id );

CREATE POLICY "Los administradores pueden gestionar todos los roles." ON public.user_roles
  FOR ALL USING ( public.get_my_role() = 'admin' );

CREATE POLICY "Los usuarios pueden crear su propio rol." ON public.user_roles
  FOR INSERT WITH CHECK ( auth.uid() = user_id );

-- ** Políticas para 'tickets' **
CREATE POLICY "Los usuarios pueden ver sus tickets creados." ON public.tickets
  FOR SELECT USING ( auth.uid() = created_by );
  
CREATE POLICY "Técnicos y admins pueden ver todos los tickets." ON public.tickets
  FOR SELECT USING ( public.get_my_role() IN ('admin', 'technician') );
  
CREATE POLICY "Los usuarios pueden crear tickets." ON public.tickets
  FOR INSERT WITH CHECK ( auth.uid() = created_by );
  
CREATE POLICY "Técnicos y admins pueden actualizar tickets." ON public.tickets
  FOR UPDATE USING ( public.get_my_role() IN ('admin', 'technician') );

-- ** Políticas para 'comments' **
CREATE POLICY "Usuarios involucrados pueden ver comentarios públicos." ON public.comments
  FOR SELECT USING ( is_internal = false AND ticket_id IN (SELECT id FROM tickets WHERE created_by = auth.uid() OR assigned_to = auth.uid()) );

CREATE POLICY "Técnicos y admins pueden ver todos los comentarios." ON public.comments
  FOR SELECT USING ( public.get_my_role() IN ('admin', 'technician') );

CREATE POLICY "Usuarios involucrados pueden crear comentarios." ON public.comments
  FOR INSERT WITH CHECK ( user_id = auth.uid() AND ticket_id IN (SELECT id FROM tickets WHERE created_by = auth.uid() OR assigned_to = auth.uid()) );
  
CREATE POLICY "Técnicos y admins pueden crear cualquier comentario." ON public.comments
  FOR INSERT WITH CHECK ( public.get_my_role() IN ('admin', 'technician') );

-- 7. ÍNDICES PARA MEJORAR EL RENDIMIENTO
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- =================================================================
-- ========= FUNCIONES RPC PARA LA PÁGINA Users.tsx ================
-- =================================================================

-- Creamos un tipo para el retorno de la función
CREATE TYPE public.staff_user_details AS (
  id UUID,
  full_name TEXT,
  email TEXT,
  is_active BOOLEAN,
  role public.app_role
);

-- Función 1: Obtener la lista de personal (admins y técnicos)
CREATE OR REPLACE FUNCTION get_staff_users()
RETURNS SETOF public.staff_user_details
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden ver la lista de personal';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    u.email::text, -- <-- ¡AQUÍ ESTÁ LA CORRECCIÓN DE TIPO!
    p.is_active,
    ur.role
  FROM auth.users AS u
  JOIN public.profiles AS p ON u.id = p.id
  JOIN public.user_roles AS ur ON u.id = ur.user_id
  WHERE ur.role IN ('admin', 'technician');
END;
$$;

-- Función 2: Crear un nuevo usuario de personal (admin o técnico)
CREATE OR REPLACE FUNCTION create_staff_user(
  new_email TEXT,
  new_password TEXT,
  new_full_name TEXT,
  new_role public.app_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  error_message TEXT;
BEGIN
  -- Solo un admin puede llamar a esta función
  IF public.get_my_role() <> 'admin' THEN
    RETURN json_build_object('error', 'Solo los administradores pueden crear usuarios.');
  END IF;

  -- Validar que el rol sea solo admin or technician
  IF new_role NOT IN ('admin', 'technician') THEN
    RETURN json_build_object('error', 'El rol debe ser admin o technician.');
  END IF;

  -- Crear el usuario en auth.users
  new_user_id := auth.admin_create_user(new_email, new_password, jsonb_build_object('full_name', new_full_name));

  -- El trigger 'on_auth_user_created' ya creó el perfil
  -- y el rol de 'client'.
  -- Ahora, actualizamos el rol al que corresponde ('admin' o 'technician')
  UPDATE public.user_roles
  SET role = new_role
  WHERE user_id = new_user_id;

  RETURN json_build_object('success', true, 'user_id', new_user_id);

EXCEPTION
  -- Capturar cualquier error (ej: usuario duplicado) y devolverlo como JSON
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    RETURN json_build_object('error', error_message);
END;
$$;