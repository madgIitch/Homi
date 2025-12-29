// supabase/functions/auth-register-phase3/index.ts  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { Phase3Request, AuthResponse } from '../_shared/types.ts'  

interface RoomInviteRow {
  id: string
  room_id: string
  owner_id: string
  expires_at?: string | null
  used_at?: string | null
  used_by?: string | null
}

async function rollbackUser(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string
) {
  await supabaseClient.from('profiles').delete().eq('id', userId)
  await supabaseClient.from('users').delete().eq('id', userId)
  await supabaseClient.auth.admin.deleteUser(userId)
}

async function createMatchesForFlat(
  supabaseClient: ReturnType<typeof createClient>,
  newUserId: string,
  roomId: string
) {
  const { data: roomData, error: roomError } = await supabaseClient
    .from('rooms')
    .select('flat_id, owner_id')
    .eq('id', roomId)
    .single()

  if (roomError || !roomData?.flat_id) {
    console.error('[auth-register-phase3] Unable to resolve flat for matches', roomError)
    return
  }

  const { data: assignmentRows, error: assignmentError } = await supabaseClient
    .from('room_assignments')
    .select('assignee_id, room:rooms!inner(flat_id)')
    .eq('status', 'accepted')
    .eq('room.flat_id', roomData.flat_id)

  if (assignmentError) {
    console.error('[auth-register-phase3] Unable to load flat members', assignmentError)
    return
  }

  const memberIds = new Set<string>()
  ;(assignmentRows ?? []).forEach((row) => {
    if (row.assignee_id) {
      memberIds.add(row.assignee_id)
    }
  })
  if (roomData.owner_id) {
    memberIds.add(roomData.owner_id)
  }
  memberIds.delete(newUserId)

  const members = Array.from(memberIds)
  if (members.length === 0) return

  const memberList = members.join(',')
  const { data: existingMatches, error: existingError } = await supabaseClient
    .from('matches')
    .select('user_a_id, user_b_id')
    .or(
      `and(user_a_id.eq.${newUserId},user_b_id.in.(${memberList})),and(user_b_id.eq.${newUserId},user_a_id.in.(${memberList}))`
    )

  if (existingError) {
    console.error('[auth-register-phase3] Unable to check existing matches', existingError)
    return
  }

  const existingSet = new Set<string>()
  ;(existingMatches ?? []).forEach((match) => {
    const otherId = match.user_a_id === newUserId ? match.user_b_id : match.user_a_id
    if (otherId) {
      existingSet.add(otherId)
    }
  })

  const newMatches = members
    .filter((memberId) => !existingSet.has(memberId))
    .map((memberId) => ({
      user_a_id: newUserId,
      user_b_id: memberId,
      status: 'accepted',
    }))

  if (newMatches.length === 0) return

  const { error: insertError } = await supabaseClient
    .from('matches')
    .insert(newMatches)

  if (insertError) {
    console.error('[auth-register-phase3] Unable to create matches', insertError)
  }
}
  
async function handler(req: Request): Promise<Response> {  
  const corsResponse = handleCORS(req)  
  if (corsResponse) return corsResponse  
  
  try {  
    if (req.method !== 'POST') {  
      return new Response(  
        JSON.stringify({ error: 'Method not allowed' }),  
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    const body: Phase3Request = await req.json()  
      
    if (!body.temp_token || !body.birth_date) {  
      return new Response(  
        JSON.stringify({ error: 'Missing required fields' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    // Validar formato de fecha  
    const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/  
    if (!birthDateRegex.test(body.birth_date)) {  
      return new Response(  
        JSON.stringify({ error: 'Invalid birth_date format. Use YYYY-MM-DD' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    const supabaseClient = createClient(  
      Deno.env.get('SUPABASE_URL') ?? '',  
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',  
      { auth: { autoRefreshToken: false, persistSession: false } }  
    )  
  
    // Obtener registro temporal completo  
    const { data: tempData, error: tempError } = await supabaseClient  
      .from('temp_registrations')  
      .select('*')  
      .eq('temp_token', body.temp_token)  
      .single()  
  
    if (tempError || !tempData) {  
      return new Response(  
        JSON.stringify({ error: 'Invalid or expired temporary token' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    if (new Date(tempData.expires_at) < new Date()) {  
      return new Response(  
        JSON.stringify({ error: 'Temporary registration expired' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  

    if (!tempData.gender) {  
      return new Response(  
        JSON.stringify({ error: 'Missing required gender' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  

    const inviteCode = body.invite_code?.trim()
    let inviteRow: RoomInviteRow | null = null

    if (inviteCode) {
      const { data: inviteData, error: inviteError } = await supabaseClient
        .from('room_invitations')
        .select('id, room_id, owner_id, expires_at, used_at, used_by')
        .eq('code', inviteCode)
        .single()

      if (inviteError || !inviteData) {
        return new Response(
          JSON.stringify({ error: 'Invalid invitation code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (inviteData.used_at || inviteData.used_by) {
        return new Response(
          JSON.stringify({ error: 'Invitation code already used' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Invitation code expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: extrasData, error: extrasError } = await supabaseClient
        .from('room_extras')
        .select('category')
        .eq('room_id', inviteData.room_id)
        .limit(1)

      if (extrasError) {
        return new Response(
          JSON.stringify({ error: 'Failed to validate invitation room' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const extrasRow = Array.isArray(extrasData) ? extrasData[0] : null
      if (extrasRow?.category === 'area_comun') {
        return new Response(
          JSON.stringify({ error: 'Invitations are only valid for rooms' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: assignmentData, error: assignmentError } = await supabaseClient
        .from('room_assignments')
        .select('id')
        .eq('room_id', inviteData.room_id)
        .eq('status', 'accepted')
        .limit(1)

      if (assignmentError) {
        return new Response(
          JSON.stringify({ error: 'Failed to validate room availability' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if ((assignmentData ?? []).length > 0) {
        return new Response(
          JSON.stringify({ error: 'Room already assigned' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      inviteRow = inviteData as RoomInviteRow
    }
  
    if (tempData.is_google_user) {  
      // Para usuarios de Google, solo actualizar perfil  
      // TODO: Implementar actualización de perfil de Google  
      return new Response(  
        JSON.stringify({ error: 'Google user profile update not implemented yet' }),  
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    } else {  
      // Registro normal - crear usuario en Supabase Auth  
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({  
        email: tempData.email,  
        password: tempData.password,  
        email_confirm: true,  
        user_metadata: {  
          first_name: tempData.first_name,  
          last_name: tempData.last_name,  
          gender: tempData.gender  
        }  
      })  
  
      if (authError || !authData.user) {  
        console.error('Auth creation error:', authError)  
        return new Response(  
          JSON.stringify({ error: 'Failed to create user', details: authError?.message }),  
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
        )  
      }  
  
      // Crear registro en tabla users  
      const { error: userError } = await supabaseClient  
        .from('users')  
        .upsert(  
            {  
            id: authData.user.id,  
            email: tempData.email,  
            first_name: tempData.first_name,  
            last_name: tempData.last_name,  
            birth_date: body.birth_date,  
            gender: tempData.gender
            },  
            {  
            onConflict: 'id'  // Maneja duplicados  
            }  
        )
  
      if (userError) {  
        console.error('User table error:', userError)  
        // Rollback: eliminar usuario de Auth  
        await supabaseClient.auth.admin.deleteUser(authData.user.id)  
        return new Response(  
          JSON.stringify({ error: 'Failed to create user record' }),  
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
        )  
      }  
  
      // Crear perfil básico  
      await supabaseClient  
        .from('profiles')  
        .insert({ id: authData.user.id, gender: tempData.gender })  

      if (inviteRow) {
        const { data: inviteUpdate, error: inviteUpdateError } = await supabaseClient
          .from('room_invitations')
          .update({
            used_by: authData.user.id,
            used_at: new Date().toISOString(),
          })
          .eq('id', inviteRow.id)
          .is('used_at', null)
          .is('used_by', null)
          .select('id')
          .maybeSingle()

        if (inviteUpdateError || !inviteUpdate) {
          await rollbackUser(supabaseClient, authData.user.id)
          return new Response(
            JSON.stringify({ error: 'Invitation code already used or invalid' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: assignmentError } = await supabaseClient
          .from('room_assignments')
          .insert({
            room_id: inviteRow.room_id,
            assignee_id: authData.user.id,
            status: 'accepted',
          })

        if (assignmentError) {
          await supabaseClient
            .from('room_invitations')
            .update({ used_by: null, used_at: null })
            .eq('id', inviteRow.id)
          await rollbackUser(supabaseClient, authData.user.id)
          return new Response(
            JSON.stringify({ error: 'Failed to assign room from invitation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        await supabaseClient
          .from('rooms')
          .update({ is_available: false })
          .eq('id', inviteRow.room_id)

        await createMatchesForFlat(supabaseClient, authData.user.id, inviteRow.room_id)
      }
  
      // Generar sesión  
      const anonClient = createClient(  
        Deno.env.get('SUPABASE_URL') ?? '',  
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',  
        { auth: { autoRefreshToken: false, persistSession: false } }  
      )  
  
      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({  
        email: tempData.email,  
        password: tempData.password  
      })  
  
      if (signInError || !signInData.session || !signInData.user) {  
        return new Response(  
          JSON.stringify({ error: 'User created but failed to generate session' }),  
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
        )  
      }  
  
      const response: AuthResponse = {  
        access_token: signInData.session.access_token,  
        token_type: 'bearer',  
        expires_in: 3600,  
        refresh_token: signInData.session.refresh_token ?? '',  
        user: {  
          id: signInData.user.id,  
          email: signInData.user.email!,  
          first_name: tempData.first_name,  
          last_name: tempData.last_name,  
          birth_date: body.birth_date,  
          gender: tempData.gender,  
          created_at: signInData.user.created_at  
        }  
      }  
  
      // Limpiar registro temporal  
      await supabaseClient  
        .from('temp_registrations')  
        .delete()  
        .eq('temp_token', body.temp_token)  
  
      return new Response(  
        JSON.stringify(response),  
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
  } catch (error) {  
    console.error('Phase3 registration error:', error)  
    return new Response(  
      JSON.stringify({ error: 'Internal server error' }),  
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
    )  
  }  
}  
  
Deno.serve(handler)

