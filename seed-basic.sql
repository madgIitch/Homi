-- ============================================
-- SEED BÁSICO DE DATOS DE PRUEBA
-- Versión: 1.0
-- Fecha: 2026-01-08
-- Cobertura: ~70% funcionalidades principales
-- ============================================

-- IMPORTANTE: Ejecutar primero la query de limpieza antes de este seed
-- Ver: testingAnotaciones.md

-- ============================================
-- PASO 1: Crear usuarios en auth.users
-- ============================================
-- NOTA: Estos usuarios deben crearse manualmente en Supabase Auth
-- o mediante la API de registro de la app
-- Contraseña para todos: Test123456!

-- Emails a crear:
-- owner1@test.com
-- owner2@test.com
-- seeker1@test.com
-- seeker2@test.com
-- seeker3@test.com
-- seeker4@test.com
-- mixed1@test.com
-- mixed2@test.com

-- ============================================
-- PASO 2: Insertar datos en public.users
-- ============================================
-- Reemplazar los UUIDs con los IDs reales de auth.users

DO $$
DECLARE
    owner1_id UUID;
    owner2_id UUID;
    seeker1_id UUID;
    seeker2_id UUID;
    seeker3_id UUID;
    seeker4_id UUID;
    mixed1_id UUID;
    mixed2_id UUID;
BEGIN
    -- Obtener IDs de auth.users
    SELECT id INTO owner1_id FROM auth.users WHERE email = 'owner1@test.com';
    SELECT id INTO owner2_id FROM auth.users WHERE email = 'owner2@test.com';
    SELECT id INTO seeker1_id FROM auth.users WHERE email = 'seeker1@test.com';
    SELECT id INTO seeker2_id FROM auth.users WHERE email = 'seeker2@test.com';
    SELECT id INTO seeker3_id FROM auth.users WHERE email = 'seeker3@test.com';
    SELECT id INTO seeker4_id FROM auth.users WHERE email = 'seeker4@test.com';
    SELECT id INTO mixed1_id FROM auth.users WHERE email = 'mixed1@test.com';
    SELECT id INTO mixed2_id FROM auth.users WHERE email = 'mixed2@test.com';

    -- Insertar en public.users
    INSERT INTO public.users (id, email, first_name, last_name, birth_date, gender, created_at) VALUES
    (owner1_id, 'owner1@test.com', 'Carlos', 'Propietario', '1990-05-15', 'male', NOW() - INTERVAL '6 months'),
    (owner2_id, 'owner2@test.com', 'María', 'Casera', '1988-08-22', 'female', NOW() - INTERVAL '8 months'),
    (seeker1_id, 'seeker1@test.com', 'Juan', 'Estudiante', '1998-03-10', 'male', NOW() - INTERVAL '2 months'),
    (seeker2_id, 'seeker2@test.com', 'Ana', 'Trabajadora', '1995-11-30', 'female', NOW() - INTERVAL '3 months'),
    (seeker3_id, 'seeker3@test.com', 'Alex', 'Artista', '1996-07-18', 'non_binary', NOW() - INTERVAL '1 month'),
    (seeker4_id, 'seeker4@test.com', 'Laura', 'Freelance', '1994-01-25', 'female', NOW() - INTERVAL '4 months'),
    (mixed1_id, 'mixed1@test.com', 'Pedro', 'Mixto', '1992-09-05', 'male', NOW() - INTERVAL '5 months'),
    (mixed2_id, 'mixed2@test.com', 'Sofia', 'Mixta', '1993-12-12', 'female', NOW() - INTERVAL '7 months');

    -- Insertar profiles
    INSERT INTO public.profiles (
        id, bio, gender, occupation, smoker, has_pets,
        university, interests, lifestyle_preferences,
        housing_situation, preferred_zones, budget_min, budget_max,
        is_searchable, is_seeking, desired_roommates_min, desired_roommates_max
    ) VALUES
    -- Owner 1
    (owner1_id,
     'Propietario de piso en Malasaña. Busco compañeros de piso tranquilos y responsables. Me gusta la música y el cine.',
     'male', 'Ingeniero', false, false,
     'Universidad Politécnica de Madrid',
     '["Cine", "Música", "Tecnología"]'::jsonb,
     '{"cleanliness": "Limpio y ordenado", "noise": "Tranquilo", "schedule": "Horario normal"}'::jsonb,
     'offering', '["malasaña-neighbourhood-3992"]'::jsonb, NULL, NULL,
     true, false, 2, 3),

    -- Owner 2
    (owner2_id,
     'Tengo piso solo para chicas en Chamberí. Ambiente tranquilo y respetuoso. Me encanta cocinar y el yoga.',
     'female', 'Diseñadora', false, false,
     'Universidad Complutense de Madrid',
     '["Yoga", "Cocina", "Lectura"]'::jsonb,
     '{"cleanliness": "Muy limpio", "noise": "Silencioso", "schedule": "Madrugadora"}'::jsonb,
     'offering', '["chamberí-suburb-9752"]'::jsonb, NULL, NULL,
     true, false, 2, 2),

    -- Seeker 1
    (seeker1_id,
     'Estudiante de informática buscando habitación cerca de la universidad. Soy tranquilo y organizado.',
     'male', 'Estudiante', false, false,
     'Universidad Politécnica de Madrid',
     '["Videojuegos", "Programación", "Deportes"]'::jsonb,
     '{"cleanliness": "Ordenado", "noise": "Moderado", "schedule": "Flexible"}'::jsonb,
     'seeking', '["malasaña-neighbourhood-3992", "chueca-neighbourhood-3991"]'::jsonb, 300, 450,
     true, true, 2, 3),

    -- Seeker 2
    (seeker2_id,
     'Trabajo en el centro y busco piso cerca. Me gusta salir los fines de semana y cocinar.',
     'female', 'Marketing Manager', false, false,
     NULL,
     '["Fitness", "Viajes", "Gastronomía"]'::jsonb,
     '{"cleanliness": "Limpio", "noise": "Normal", "schedule": "Horario de oficina"}'::jsonb,
     'seeking', '["chamberí-suburb-9752", "salamanca-suburb-1416"]'::jsonb, 400, 600,
     true, true, 1, 2),

    -- Seeker 3
    (seeker3_id,
     'Artista visual en busca de piso con buena luz. Me gusta el ambiente bohemio y creativo.',
     'non_binary', 'Artista', false, false,
     'Escuela de Bellas Artes',
     '["Arte", "Fotografía", "Música alternativa"]'::jsonb,
     '{"cleanliness": "Flexible", "noise": "No me molesta", "schedule": "Nocturno"}'::jsonb,
     'seeking', '["lavapiés-neighbourhood-6342", "malasaña-neighbourhood-3992"]'::jsonb, 500, 700,
     true, true, 2, 4),

    -- Seeker 4
    (seeker4_id,
     'Freelance con horarios flexibles. Tengo un gato adorable. Busco ambiente relajado y pet-friendly.',
     'female', 'Content Creator', false, true,
     NULL,
     '["Mascotas", "Series", "Redes sociales"]'::jsonb,
     '{"cleanliness": "Normal", "noise": "Tranquilo", "schedule": "Muy flexible"}'::jsonb,
     'seeking', '["chueca-neighbourhood-3991", "chamberí-suburb-9752"]'::jsonb, NULL, NULL,
     true, true, 1, 3),

    -- Mixed 1
    (mixed1_id,
     'Tengo habitación libre pero también busco cambiar. Me gusta el deporte y la naturaleza.',
     'male', 'Profesor', false, false,
     'Universidad Autónoma de Madrid',
     '["Senderismo", "Ciclismo", "Lectura"]'::jsonb,
     '{"cleanliness": "Ordenado", "noise": "Tranquilo", "schedule": "Regular"}'::jsonb,
     'offering', '["malasaña-neighbourhood-3992"]'::jsonb, 350, 500,
     true, true, 2, 3),

    -- Mixed 2 (Perfil inactivo)
    (mixed2_id,
     'Ofrezco habitación pero también estoy mirando otras opciones. Me gusta viajar y la fotografía.',
     'female', 'Fotógrafa', false, false,
     NULL,
     '["Fotografía", "Viajes", "Café"]'::jsonb,
     '{"cleanliness": "Limpio", "noise": "Normal", "schedule": "Irregular"}'::jsonb,
     'offering', '["chamberí-suburb-9752"]'::jsonb, 400, 550,
     false, true, 1, 2); -- PERFIL INACTIVO

    -- ============================================
    -- PASO 3: Crear pisos y habitaciones
    -- ============================================

    -- Piso 1 - Owner 1 en Malasaña
    INSERT INTO public.flats (id, owner_id, address, city, district, rules, services, gender_policy, capacity_total, created_at)
    VALUES (
        gen_random_uuid(),
        owner1_id,
        'C/ San Vicente Ferrer 45, 3º A',
        'Madrid',
        'Centro',
        E'No fumar en el piso\nMascotas permitidas con aviso previo\nSilencio de 23:00 a 08:00\nLimpieza semanal rotativa',
        '["WiFi 300Mb", "Limpieza semanal", "Calefacción central", "Lavadora", "Lavavajillas"]'::jsonb,
        'mixed',
        4,
        NOW() - INTERVAL '6 months'
    );

    -- Habitaciones Piso 1
    INSERT INTO public.rooms (id, flat_id, owner_id, title, description, price_per_month, size_m2, is_available, available_from, created_at)
    VALUES
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = owner1_id), owner1_id,
     'Habitación Individual 1', 'Habitación luminosa con balcón, totalmente amueblada', 400, 12, true, NOW(), NOW() - INTERVAL '6 months'),
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = owner1_id), owner1_id,
     'Habitación Doble 1', 'Habitación doble amplia, actualmente ocupada por el propietario', 350, 16, false, NOW(), NOW() - INTERVAL '6 months'),
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = owner1_id), owner1_id,
     'Habitación Individual 2', 'Habitación exterior con escritorio, ideal para estudiantes', 450, 14, true, NOW() + INTERVAL '1 month', NOW() - INTERVAL '6 months'),
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = owner1_id), owner1_id,
     'Habitación Doble 2', 'Habitación interior tranquila, con armario empotrado', 380, 15, true, NOW(), NOW() - INTERVAL '6 months');

    -- Room extras para Piso 1
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'individual', 1 FROM public.rooms WHERE title = 'Habitación Individual 1';
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'doble', 2 FROM public.rooms WHERE title = 'Habitación Doble 1';
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'individual', 1 FROM public.rooms WHERE title = 'Habitación Individual 2';
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'doble', 2 FROM public.rooms WHERE title = 'Habitación Doble 2';

    -- Piso 2 - Owner 2 en Chamberí
    INSERT INTO public.flats (id, owner_id, address, city, district, rules, services, gender_policy, capacity_total, created_at)
    VALUES (
        gen_random_uuid(),
        owner2_id,
        'C/ Alonso Cano 12, 2º B',
        'Madrid',
        'Chamberí',
        E'Prohibido fumar\nNo se permiten mascotas\nLimpieza rotativa semanal\nRespeto y convivencia',
        '["WiFi fibra óptica", "Aire acondicionado", "Terraza", "Cocina equipada"]'::jsonb,
        'flinta',
        3,
        NOW() - INTERVAL '8 months'
    );

    -- Habitaciones Piso 2
    INSERT INTO public.rooms (id, flat_id, owner_id, title, description, price_per_month, size_m2, is_available, available_from, created_at)
    VALUES
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = owner2_id), owner2_id,
     'Habitación Individual Premium', 'Habitación con terraza privada, muy luminosa', 500, 15, true, NOW(), NOW() - INTERVAL '8 months'),
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = owner2_id), owner2_id,
     'Habitación Individual Central', 'Habitación interior tranquila, ocupada por la propietaria', 480, 13, false, NOW(), NOW() - INTERVAL '8 months'),
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = owner2_id), owner2_id,
     'Habitación Individual Estándar', 'Habitación funcional con escritorio y armario', 520, 12, true, NOW() + INTERVAL '2 weeks', NOW() - INTERVAL '8 months');

    -- Room extras para Piso 2
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'individual', 1 FROM public.rooms WHERE title = 'Habitación Individual Premium';
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'individual', 1 FROM public.rooms WHERE title = 'Habitación Individual Central';
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'individual', 1 FROM public.rooms WHERE title = 'Habitación Individual Estándar';

    -- Piso 3 - Mixed 1 (Pedro) en Malasaña
    INSERT INTO public.flats (id, owner_id, address, city, district, rules, services, gender_policy, capacity_total, created_at)
    VALUES (
        gen_random_uuid(),
        mixed1_id,
        'C/ Manuela Malasaña 20, 1º C',
        'Madrid',
        'Centro',
        E'No fumar en el piso\nVisitas con aviso previo\nLimpieza semanal rotativa',
        '["WiFi 600Mb", "Lavadora", "Calefacción", "Cocina equipada"]'::jsonb,
        'mixed',
        3,
        NOW() - INTERVAL '5 months'
    );

    -- Habitaciones Piso 3
    INSERT INTO public.rooms (id, flat_id, owner_id, title, description, price_per_month, size_m2, is_available, available_from, created_at)
    VALUES
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = mixed1_id), mixed1_id,
     'Habitación Individual Malasaña', 'Habitación exterior con armario empotrado', 480, 13, true, NOW(), NOW() - INTERVAL '5 months'),
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = mixed1_id), mixed1_id,
     'Habitación Individual Patio', 'Habitación tranquila con escritorio', 430, 11, true, NOW(), NOW() - INTERVAL '5 months'),
    (gen_random_uuid(), (SELECT id FROM public.flats WHERE owner_id = mixed1_id), mixed1_id,
     'Habitación Propietario', 'Habitación ocupada por el propietario', 0, 14, false, NOW(), NOW() - INTERVAL '5 months');

    -- Room extras para Piso 3
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'individual', 1 FROM public.rooms WHERE title = 'Habitación Individual Malasaña';
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'individual', 1 FROM public.rooms WHERE title = 'Habitación Individual Patio';
    INSERT INTO public.room_extras (room_id, category, room_type, capacity)
    SELECT id, 'habitacion', 'individual', 1 FROM public.rooms WHERE title = 'Habitación Propietario';

    -- ============================================
    -- PASO 4: Crear Matches
    -- ============================================

    -- Match 1: Owner1 ↔ Seeker1 (room_offer)
    INSERT INTO public.matches (id, user_a_id, user_b_id, status, matched_at)
    VALUES (gen_random_uuid(), owner1_id, seeker1_id, 'room_offer', NOW() - INTERVAL '3 days');

    -- Match 2: Seeker2 ↔ Owner1 (rejected)
    INSERT INTO public.matches (id, user_a_id, user_b_id, status, matched_at)
    VALUES (gen_random_uuid(), seeker2_id, owner1_id, 'rejected', NOW() - INTERVAL '5 days');

    -- Match 3: Seeker3 ↔ Seeker4 (accepted con chat)
    INSERT INTO public.matches (id, user_a_id, user_b_id, status, matched_at)
    VALUES (gen_random_uuid(), seeker3_id, seeker4_id, 'accepted', NOW() - INTERVAL '7 days');

    -- Match 4: Mixed1 ↔ Seeker1 (pending)
    INSERT INTO public.matches (id, user_a_id, user_b_id, status, matched_at)
    VALUES (gen_random_uuid(), mixed1_id, seeker1_id, 'pending', NOW() - INTERVAL '2 days');

    -- Match 5: Owner2 ↔ Seeker2 (accepted con chat)
    INSERT INTO public.matches (id, user_a_id, user_b_id, status, matched_at)
    VALUES (gen_random_uuid(), owner2_id, seeker2_id, 'accepted', NOW() - INTERVAL '6 days');

    -- ============================================
    -- PASO 5: Room Assignments
    -- ============================================

    -- Assignment 1: Owner1 ocupa su propia habitación (accepted)
    INSERT INTO public.room_assignments (id, room_id, assignee_id, status, match_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.rooms WHERE title = 'Habitación Doble 1'),
        owner1_id,
        'accepted',
        NULL,
        NOW() - INTERVAL '6 months',
        NOW() - INTERVAL '6 months'
    );

    -- Assignment 1b: Owner2 ocupa su propia habitación (accepted)
    INSERT INTO public.room_assignments (id, room_id, assignee_id, status, match_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.rooms WHERE title = 'Habitación Individual Central'),
        owner2_id,
        'accepted',
        NULL,
        NOW() - INTERVAL '8 months',
        NOW() - INTERVAL '8 months'
    );

    -- Assignment 2: Habitación ofrecida a Seeker1 (offered)
    INSERT INTO public.room_assignments (id, room_id, assignee_id, status, match_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.rooms WHERE title = 'Habitación Individual 2'),
        seeker1_id,
        'offered',
        (SELECT id FROM public.matches WHERE user_a_id = owner1_id AND user_b_id = seeker1_id),
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days'
    );

    -- Assignment 3: Habitación rechazada por Seeker2 (rejected)
    INSERT INTO public.room_assignments (id, room_id, assignee_id, status, match_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.rooms WHERE title = 'Habitación Doble 2'),
        seeker2_id,
        'rejected',
        (SELECT id FROM public.matches WHERE user_a_id = seeker2_id AND user_b_id = owner1_id),
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '4 days'
    );

    -- ============================================
    -- PASO 6: Room Interests
    -- ============================================

    INSERT INTO public.room_interests (user_id, room_id, message, created_at)
    VALUES
    (seeker3_id, (SELECT id FROM public.rooms WHERE title = 'Habitación Individual Premium'),
     'Hola! Me interesa mucho tu habitación. Soy artista y busco un espacio luminoso. ¿Podemos hablar?',
     NOW() - INTERVAL '2 days'),
    (seeker4_id, (SELECT id FROM public.rooms WHERE title = 'Habitación Individual 1'),
     '¡Hola! La habitación se ve genial. Acepto mascotas? Tengo un gato muy tranquilo.',
     NOW() - INTERVAL '1 day');

    -- ============================================
    -- PASO 7: Swipe Rejections
    -- ============================================

    INSERT INTO public.swipe_rejections (user_id, rejected_profile_id, created_at)
    VALUES
    (seeker1_id, seeker2_id, NOW() - INTERVAL '4 days'),
    (seeker1_id, mixed2_id, NOW() - INTERVAL '3 days'),
    (seeker3_id, mixed1_id, NOW() - INTERVAL '2 days'),
    (owner2_id, seeker4_id, NOW() - INTERVAL '1 day'); -- Rechazada por gender policy

    -- ============================================
    -- PASO 8: Chats y Messages
    -- ============================================

    -- Chat para Match 3 (Seeker3 ↔ Seeker4)
    INSERT INTO public.chats (match_id, created_at, updated_at)
    VALUES (
        (SELECT id FROM public.matches WHERE user_a_id = seeker3_id AND user_b_id = seeker4_id),
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '1 hour'
    );

    -- Messages para Chat 1
    INSERT INTO public.messages (chat_id, sender_id, body, created_at, read_at)
    VALUES
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = seeker3_id AND user_b_id = seeker4_id)),
     seeker3_id, 'Hola! Vi tu perfil y me pareció muy interesante', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = seeker3_id AND user_b_id = seeker4_id)),
     seeker4_id, 'Hola! Gracias :) También me gustó tu perfil', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = seeker3_id AND user_b_id = seeker4_id)),
     seeker3_id, 'Qué tipo de piso estás buscando?', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = seeker3_id AND user_b_id = seeker4_id)),
     seeker4_id, 'Busco algo tranquilo, pet-friendly porque tengo un gato', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = seeker3_id AND user_b_id = seeker4_id)),
     seeker3_id, 'Genial! A mí me encantan los gatos 😊', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = seeker3_id AND user_b_id = seeker4_id)),
     seeker4_id, 'Perfecto! Deberíamos buscar piso juntos entonces', NOW() - INTERVAL '1 hour', NULL);

    -- Chat para Match 5 (Owner2 ↔ Seeker2)
    INSERT INTO public.chats (match_id, created_at, updated_at)
    VALUES (
        (SELECT id FROM public.matches WHERE user_a_id = owner2_id AND user_b_id = seeker2_id),
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '30 minutes'
    );

    -- Messages para Chat 2
    INSERT INTO public.messages (chat_id, sender_id, body, created_at, read_at)
    VALUES
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = owner2_id AND user_b_id = seeker2_id)),
     owner2_id, 'Hola Ana! Vi que te interesa el piso de Chamberí', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = owner2_id AND user_b_id = seeker2_id)),
     seeker2_id, 'Sí! Me parece perfecto la ubicación', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = owner2_id AND user_b_id = seeker2_id)),
     owner2_id, 'Genial! Tengo dos habitaciones disponibles', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = owner2_id AND user_b_id = seeker2_id)),
     seeker2_id, 'Me gustaría ver la que tiene terraza', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = owner2_id AND user_b_id = seeker2_id)),
     owner2_id, 'Perfecto! Podemos coordinar una visita', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    ((SELECT id FROM public.chats WHERE match_id = (SELECT id FROM public.matches WHERE user_a_id = owner2_id AND user_b_id = seeker2_id)),
     seeker2_id, 'Estupendo! Te parece bien este fin de semana?', NOW() - INTERVAL '30 minutes', NULL);

END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar usuarios creados
SELECT 'Total usuarios:', COUNT(*) FROM public.users;
SELECT 'Total profiles:', COUNT(*) FROM public.profiles;

-- Verificar pisos y habitaciones
SELECT 'Total pisos:', COUNT(*) FROM public.flats;
SELECT 'Total habitaciones:', COUNT(*) FROM public.rooms;

-- Verificar matches
SELECT 'Total matches:', COUNT(*) FROM public.matches;
SELECT 'Matches por estado:' as label, status, COUNT(*) FROM public.matches GROUP BY status;

-- Verificar asignaciones
SELECT 'Total asignaciones:', COUNT(*) FROM public.room_assignments;
SELECT 'Asignaciones por estado:' as label, status, COUNT(*) FROM public.room_assignments GROUP BY status;

-- Verificar chats y mensajes
SELECT 'Total chats:', COUNT(*) FROM public.chats;
SELECT 'Total mensajes:', COUNT(*) FROM public.messages;

-- Verificar intereses
SELECT 'Total room interests:', COUNT(*) FROM public.room_interests;

-- Verificar rechazos
SELECT 'Total swipe rejections:', COUNT(*) FROM public.swipe_rejections;

-- ============================================
-- SEED COMPLETADO
-- ============================================
-- Los usuarios están listos para usar con contraseña: Test123456!
-- Ver testingAnotaciones.md para casos de prueba
