import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con privilegios de servicio
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obtener el token del usuario que hace la petición
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verificar que el usuario que hace la petición es admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('No autorizado')
    }

    // Verificar el rol del usuario
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Solo los administradores pueden crear usuarios')
    }

    // Obtener los datos del nuevo usuario del body
    const { email, password, fullName, role } = await req.json()

    if (!email || !password || !fullName || !role) {
      throw new Error('Faltan datos requeridos')
    }

    if (!['admin', 'technician'].includes(role)) {
      throw new Error('El rol debe ser admin o technician')
    }

    // Crear el nuevo usuario usando la Admin API (NO inicia sesión automáticamente)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar el email
      user_metadata: {
        full_name: fullName
      }
    })

    if (createError) {
      throw createError
    }

    if (!newUser.user) {
      throw new Error('No se pudo crear el usuario')
    }

    // El trigger handle_new_user ya creó el perfil y el rol como 'client'
    // Ahora actualizamos el rol al correcto
    const { error: updateRoleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role })
      .eq('user_id', newUser.user.id)

    if (updateRoleError) {
      // Si falla la actualización del rol, eliminar el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error(`No se pudo asignar el rol: ${updateRoleError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: fullName,
          role
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
