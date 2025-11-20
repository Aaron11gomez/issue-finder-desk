// HU-16: Edge Function para enviar correos
// Requiere configurar la variable de entorno RESEND_API_KEY en Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, message } = await req.json()

    if (!RESEND_API_KEY) {
        throw new Error('Falta RESEND_API_KEY')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Nexus Desk <onboarding@resend.dev>', // Cambiar a tu dominio verificado en Prod
        to: [to],
        subject: subject,
        html: `<div style="font-family: sans-serif;">
                <h1>Nexus Desk Notificación</h1>
                <p>${message}</p>
                <br/>
                <p><small>Este es un mensaje automático.</small></p>
               </div>`,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})