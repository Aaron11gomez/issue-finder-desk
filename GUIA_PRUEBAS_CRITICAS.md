# 🧪 Guía de Pruebas Críticas - Creación de Usuarios

## ⚙️ Preparación

1. **Servidor iniciado:** ✅ Ya está corriendo en http://localhost:8081/
2. **Navegador:** Abre http://localhost:8081/ en tu navegador
3. **Cuenta admin:** Necesitas iniciar sesión con una cuenta de administrador

---

## 📝 Pruebas Críticas a Realizar

### ✅ Prueba 1: Crear Usuario Técnico

**Objetivo:** Verificar que el admin mantiene su sesión y el usuario se crea con rol correcto

**Pasos:**
1. Inicia sesión como administrador
2. Ve a la página "Gestión de Personal" (menú lateral o `/users`)
3. Haz clic en el botón "Crear Nuevo Personal"
4. Completa el formulario:
   - **Nombre Completo:** "Juan Técnico Test"
   - **Correo Electrónico:** "tecnico.test@ejemplo.com"
   - **Contraseña Provisional:** "Test123456"
   - **Rol:** Selecciona "Técnico"
5. Haz clic en "Crear Usuario"

**Resultados Esperados:**
- ✅ Aparece mensaje: "Usuario creado - El usuario ha sido creado exitosamente"
- ✅ **NO** pierdes tu sesión de administrador (sigues viendo la página de usuarios)
- ✅ El nuevo usuario aparece en la lista con badge "Técnico" (azul)
- ✅ El usuario NO aparece con badge "Cliente"

**Si algo falla:**
- ❌ Si pierdes la sesión → Anota el error y continúa
- ❌ Si el usuario aparece como "Cliente" → Anota el error y continúa

---

### ✅ Prueba 2: Crear Usuario Administrador

**Objetivo:** Verificar que funciona también para rol de administrador

**Pasos:**
1. (Deberías seguir en la página de usuarios como admin)
2. Haz clic en "Crear Nuevo Personal" nuevamente
3. Completa el formulario:
   - **Nombre Completo:** "María Admin Test"
   - **Correo Electrónico:** "admin.test@ejemplo.com"
   - **Contraseña Provisional:** "Test123456"
   - **Rol:** Selecciona "Administrador"
4. Haz clic en "Crear Usuario"

**Resultados Esperados:**
- ✅ Aparece mensaje: "Usuario creado - El usuario ha sido creado exitosamente"
- ✅ **NO** pierdes tu sesión de administrador
- ✅ El nuevo usuario aparece en la lista con badge "Administrador" (rojo)
- ✅ El usuario NO aparece con badge "Cliente"

---

### ✅ Prueba 3: Editar Usuario Existente

**Objetivo:** Verificar que la edición de usuarios funciona correctamente

**Pasos:**
1. En la lista de usuarios, busca uno de los usuarios que acabas de crear
2. Haz clic en el botón de editar (ícono de lápiz)
3. Cambia el nombre a: "Juan Técnico Editado"
4. Cambia el rol a: "Administrador"
5. Haz clic en "Guardar Cambios"

**Resultados Esperados:**
- ✅ Aparece mensaje: "Usuario actualizado - Los datos del usuario han sido actualizados"
- ✅ El nombre del usuario se actualiza en la lista
- ✅ El badge del rol cambia de "Técnico" a "Administrador"

---

## 📊 Reporte de Resultados

Por favor, completa esta tabla con los resultados:

| Prueba | ✅ Pasó | ❌ Falló | Notas |
|--------|---------|----------|-------|
| 1. Crear Técnico - Mantiene sesión | ☐ | ☐ | |
| 1. Crear Técnico - Rol correcto | ☐ | ☐ | |
| 2. Crear Admin - Mantiene sesión | ☐ | ☐ | |
| 2. Crear Admin - Rol correcto | ☐ | ☐ | |
| 3. Editar Usuario | ☐ | ☐ | |

---

## 🐛 Si Encuentras Errores

### Error: "Failed to invoke function"
**Causa:** Estás usando la versión con Edge Function pero no está desplegada.
**Solución:** La versión actual (`Users.tsx`) NO debería dar este error. Si lo ves, avísame.

### Error: "Solo los administradores pueden ver la lista de personal"
**Causa:** Tu usuario no tiene rol de 'admin' en la base de datos.
**Solución:** Verifica en Supabase que tu usuario tiene `role = 'admin'` en la tabla `user_roles`.

### El usuario se crea pero aparece como "Cliente"
**Causa:** Puede haber un problema con los permisos RLS.
**Solución:** Avísame y revisaremos las políticas de seguridad.

### Pierdes la sesión al crear usuario
**Causa:** La restauración de sesión no está funcionando.
**Solución:** Avísame para revisar el código.

---

## 📸 Capturas Recomendadas

Si encuentras algún problema, toma capturas de pantalla de:
1. La consola del navegador (F12 > Console)
2. El mensaje de error que aparece
3. La lista de usuarios mostrando el rol incorrecto (si aplica)

---

## ✅ Criterios de Éxito

Las pruebas son exitosas si:
- ✅ Puedes crear usuarios técnicos sin perder tu sesión
- ✅ Puedes crear usuarios administradores sin perder tu sesión
- ✅ Los usuarios creados tienen el rol correcto (NO "Cliente")
- ✅ Puedes editar usuarios existentes

Si **todas** estas condiciones se cumplen, los problemas están resueltos. 🎉

---

## 🔄 Después de las Pruebas

Una vez completadas las pruebas, por favor:
1. Comparte los resultados (tabla completada)
2. Si todo funciona: ¡Perfecto! Los problemas están resueltos
3. Si algo falla: Comparte los detalles del error para que pueda corregirlo
