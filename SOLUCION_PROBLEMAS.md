# Solución a los Problemas de Creación de Usuarios

## Problemas Identificados

### 1. Al crear un nuevo usuario, el sistema cambia al perfil del usuario recién creado
**Causa:** Cuando usas `supabase.auth.signUp()`, Supabase automáticamente inicia sesión con el nuevo usuario creado, lo que causa que el administrador pierda su sesión.

### 2. Los usuarios creados no tienen la etiqueta correcta de rol
**Causa:** El trigger `handle_new_user()` siempre asigna el rol 'client' por defecto, y aunque se intenta actualizar después, hay problemas de sincronización.

---

## Soluciones Implementadas

### ✅ Solución Actual (Activa)
**Archivo:** `src/pages/Users.tsx`

Esta solución funciona **sin necesidad de Edge Functions** y está lista para usar inmediatamente:

**Cómo funciona:**
1. Guarda los tokens de sesión del administrador antes de crear el usuario
2. Crea el nuevo usuario con `signUp()` (esto cambia temporalmente la sesión)
3. Inmediatamente restaura la sesión del administrador usando `setSession()`
4. Actualiza el rol del nuevo usuario al rol correcto (admin o technician)

**Ventajas:**
- ✅ Funciona inmediatamente sin configuración adicional
- ✅ No requiere desplegar Edge Functions
- ✅ El administrador mantiene su sesión
- ✅ Los usuarios se crean con el rol correcto

**Limitación:**
- Hay un breve momento (menos de 1 segundo) donde la sesión cambia, pero se restaura automáticamente

---

### 🚀 Solución Óptima (Opcional)
**Archivo:** `src/pages/Users-EdgeFunction.tsx`

Esta es la solución más robusta pero requiere desplegar una Edge Function en Supabase.

**Cómo funciona:**
1. Llama a una Edge Function que usa la Admin API de Supabase
2. La Admin API crea usuarios sin iniciar sesión automáticamente
3. El administrador nunca pierde su sesión

**Para activar esta solución:**
1. Sigue las instrucciones en `INSTRUCCIONES_DESPLIEGUE.md`
2. Despliega la Edge Function: `supabase functions deploy create-staff-user`
3. Renombra los archivos:
   - `src/pages/Users.tsx` → `src/pages/Users-Alternative.tsx`
   - `src/pages/Users-EdgeFunction.tsx` → `src/pages/Users.tsx`

---

## Archivos Creados/Modificados

### Archivos Principales
- ✅ `src/pages/Users.tsx` - Solución alternativa activa (restauración de sesión)
- ✅ `src/pages/Users-EdgeFunction.tsx` - Solución óptima con Edge Function
- ✅ `supabase/functions/create-staff-user/index.ts` - Edge Function para crear usuarios

### Archivos de Documentación
- ✅ `INSTRUCCIONES_DESPLIEGUE.md` - Guía para desplegar la Edge Function
- ✅ `SOLUCION_PROBLEMAS.md` - Este archivo

---

## Cómo Probar la Solución

1. **Inicia sesión como administrador**
   ```
   npm run dev
   ```

2. **Ve a la página de Gestión de Personal**
   - Navega a `/users` en tu aplicación

3. **Crea un nuevo usuario**
   - Haz clic en "Crear Nuevo Personal"
   - Completa el formulario:
     - Nombre completo
     - Correo electrónico
     - Contraseña provisional
     - Rol (Técnico o Administrador)
   - Haz clic en "Crear Usuario"

4. **Verifica que:**
   - ✅ No pierdes tu sesión de administrador
   - ✅ El nuevo usuario aparece en la lista
   - ✅ El nuevo usuario tiene el rol correcto (no "cliente")
   - ✅ Puedes editar el usuario después de crearlo

---

## Solución de Problemas Comunes

### Error: "Solo los administradores pueden ver la lista de personal"
**Solución:** Asegúrate de estar iniciando sesión con una cuenta que tenga rol de 'admin' en la tabla `user_roles`.

### El usuario se crea pero aparece como "cliente"
**Solución:** Esto puede ocurrir si hay un problema con los permisos RLS. Verifica que:
1. Tu usuario admin tiene permisos para actualizar la tabla `user_roles`
2. La política RLS "Los administradores pueden gestionar todos los roles" está activa

### Error: "Failed to invoke function"
**Solución:** Esto significa que estás usando la versión con Edge Function pero no la has desplegado. Opciones:
1. Usa la solución alternativa (ya está activa en `src/pages/Users.tsx`)
2. O despliega la Edge Function siguiendo `INSTRUCCIONES_DESPLIEGUE.md`

---

## Próximos Pasos Recomendados

1. **Probar la solución actual** - La solución alternativa ya está activa y lista para usar

2. **Opcional: Desplegar Edge Function** - Para una solución más robusta:
   - Instala Supabase CLI
   - Despliega la función `create-staff-user`
   - Cambia a usar `Users-EdgeFunction.tsx`

3. **Verificar políticas RLS** - Asegúrate de que las políticas de seguridad estén correctamente configuradas en tu base de datos

4. **Probar con diferentes roles** - Crea usuarios con rol de técnico y administrador para verificar que funciona correctamente

---

## Contacto y Soporte

Si encuentras algún problema:
1. Revisa los logs de la consola del navegador
2. Verifica los logs de Supabase en el dashboard
3. Consulta la documentación de Supabase sobre Auth y RLS
