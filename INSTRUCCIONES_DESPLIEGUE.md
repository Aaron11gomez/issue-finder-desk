# Instrucciones para Desplegar la Edge Function

## Opción 1: Desplegar la Edge Function (Recomendado)

### Paso 1: Instalar Supabase CLI

En Windows PowerShell (como administrador):
```powershell
scoop install supabase
```

O usando npm:
```bash
npm install -g supabase
```

### Paso 2: Iniciar sesión en Supabase
```bash
supabase login
```

### Paso 3: Vincular tu proyecto
```bash
supabase link --project-ref TU_PROJECT_REF
```

Para obtener tu PROJECT_REF:
1. Ve a tu proyecto en https://supabase.com/dashboard
2. En Settings > General, copia el "Reference ID"

### Paso 4: Desplegar la función
```bash
supabase functions deploy create-staff-user
```

### Paso 5: Configurar las variables de entorno
En el dashboard de Supabase:
1. Ve a Edge Functions > create-staff-user
2. En "Secrets", asegúrate de que estén configuradas:
   - `SUPABASE_URL` (se configura automáticamente)
   - `SUPABASE_SERVICE_ROLE_KEY` (se configura automáticamente)

---

## Opción 2: Solución sin Edge Functions (Alternativa Temporal)

Si no puedes desplegar la Edge Function ahora, puedes usar una solución temporal que funciona directamente desde el cliente, pero con algunas limitaciones de seguridad.

Esta solución está implementada en el archivo `src/pages/Users-Alternative.tsx` que he creado.

### Para usar la alternativa:
1. Renombra `src/pages/Users.tsx` a `src/pages/Users-EdgeFunction.tsx`
2. Renombra `src/pages/Users-Alternative.tsx` a `src/pages/Users.tsx`

**IMPORTANTE:** Esta solución alternativa tiene una limitación: el administrador será desconectado temporalmente al crear un usuario, pero se reconectará automáticamente después de 2 segundos.

---

## Verificación

Después de desplegar, verifica que la función funciona:

1. Inicia sesión como administrador
2. Ve a la página de Gestión de Personal
3. Intenta crear un nuevo usuario técnico o administrador
4. Verifica que:
   - No pierdes tu sesión de administrador
   - El nuevo usuario tiene el rol correcto
   - Puedes ver el nuevo usuario en la lista

---

## Solución de Problemas

### Error: "Failed to invoke function"
- Verifica que la función esté desplegada correctamente
- Revisa los logs en el dashboard de Supabase

### Error: "No autorizado"
- Verifica que estés iniciando sesión como administrador
- Revisa las políticas RLS en la base de datos

### El usuario se crea pero con rol incorrecto
- Verifica que el trigger `handle_new_user` esté funcionando
- Revisa los permisos de la tabla `user_roles`
