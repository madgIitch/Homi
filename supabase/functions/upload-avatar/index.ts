// supabase/functions/upload-avatar/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

import { withAuth, getUserId } from '../_shared/auth.ts'
import type { JWTPayload } from '../_shared/types.ts'

/**
 * Función principal para subir avatar
 * Usamos withAuth para autenticación, después manejamos multipart/form-data,
 * subimos la imagen con service_role y actualizamos el perfil.
 */
serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    // CORS preflight ya manejado automáticamente, pero lo reforzamos:
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    try {
      // 1. Obtener ID del usuario autenticado
      const userId = getUserId(payload)
      console.log('[upload-avatar] User ID:', userId)

      // 2. Validar multipart/form-data
      const contentType = req.headers.get('content-type') || ''
      if (!contentType.toLowerCase().includes('multipart/form-data')) {
        return new Response(
          JSON.stringify({ error: 'Invalid content type. Expected multipart/form-data' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }

      // 3. Leer el FormData
      const formData = await req.formData()
      const file = formData.get('avatar')

      if (!file || !(file instanceof File)) {
        return new Response(
          JSON.stringify({
            error: 'No file provided or invalid field name (expected "avatar")',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }

      console.log('[upload-avatar] File name:', file.name)
      console.log('[upload-avatar] File type:', file.type)
      console.log('[upload-avatar] File size:', file.size)

      const fileExt = file.name.split('.').pop() || 'jpg'
      const mimeType = file.type || 'image/jpeg'
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`

      console.log('[upload-avatar] Storage path:', filePath)

      // Convertir a bytes
      const arrayBuffer = await file.arrayBuffer()
      const fileBytes = new Uint8Array(arrayBuffer)

      // 4. Subir a Supabase Storage (service_role → ignora RLS)
      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, fileBytes, {
          contentType: mimeType,
          upsert: true,
        })

      if (uploadError) {
        console.error('[upload-avatar] Supabase upload error:', uploadError)
        return new Response(
          JSON.stringify({ error: 'Error uploading file' }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }

      // 5. Obtener URL pública
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath)

      console.log('[upload-avatar] Public URL:', publicUrl)

      // 6. Actualizar tabla profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (profileError) {
        console.error('[upload-avatar] Error updating profile avatar_url:', profileError)
        // No interrumpimos la respuesta pero lo registramos
      }

      // 7. Respuesta final al cliente
      return new Response(
        JSON.stringify({
          success: true,
          avatarUrl: publicUrl,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    } catch (error) {
      console.error('[upload-avatar] Unexpected error:', error)
      return new Response(
        JSON.stringify({ error: 'Unexpected server error' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }
  })
)
