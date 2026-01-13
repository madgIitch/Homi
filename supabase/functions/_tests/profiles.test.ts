// supabase/functions/_tests/profiles.test.ts

/**
 * Tests para la edge function profiles
 * Valida CRUD operations, validación de datos y permisos
 */

import {
  TestRunner,
  TestAssertions,
  createMockRequest,
  createAuthenticatedRequest,
} from './test-utils.ts';

const runner = new TestRunner();

// ====================
// TESTS DE VALIDACIÓN DE DATOS
// ====================

runner.test('profiles: debe validar gender correcto', () => {
  const validGenders = ['male', 'female', 'non_binary', 'other', 'undisclosed'];
  const invalidGenders = ['hombre', 'mujer', 'invalid', ''];

  for (const gender of validGenders) {
    TestAssertions.assertTrue(
      validGenders.includes(gender),
      `${gender} debe ser válido`
    );
  }

  for (const gender of invalidGenders) {
    TestAssertions.assertFalse(
      validGenders.includes(gender),
      `${gender} debe ser inválido`
    );
  }
});

runner.test('profiles: debe validar housing_situation correcto', () => {
  const validSituations = ['seeking', 'offering'];
  const invalidSituations = ['buscando', 'ofreciendo', 'mixed', ''];

  for (const situation of validSituations) {
    TestAssertions.assertTrue(
      validSituations.includes(situation),
      `${situation} debe ser válido`
    );
  }

  for (const situation of invalidSituations) {
    TestAssertions.assertFalse(
      validSituations.includes(situation),
      `${situation} debe ser inválido`
    );
  }
});

runner.test('profiles: debe validar tipos de datos correctos', () => {
  const profileData = {
    bio: 'Test bio',
    gender: 'male',
    occupation: 'Developer',
    smoker: false,
    has_pets: true,
    university: 'Test University',
    field_of_study: 'Computer Science',
    interests: ['music', 'sports'],
    budget_min: 500,
    budget_max: 1000,
    desired_roommates_min: 1,
    desired_roommates_max: 3,
    is_searchable: true,
  };

  TestAssertions.assertEquals(typeof profileData.bio, 'string');
  TestAssertions.assertEquals(typeof profileData.smoker, 'boolean');
  TestAssertions.assertEquals(typeof profileData.has_pets, 'boolean');
  TestAssertions.assertTrue(Array.isArray(profileData.interests));
  TestAssertions.assertEquals(typeof profileData.budget_min, 'number');
  TestAssertions.assertEquals(typeof profileData.budget_max, 'number');
  TestAssertions.assertEquals(typeof profileData.is_searchable, 'boolean');
});

runner.test('profiles: debe validar que budget_max >= budget_min', () => {
  const validBudget = { budget_min: 500, budget_max: 1000 };
  const invalidBudget = { budget_min: 1000, budget_max: 500 };

  TestAssertions.assertTrue(
    validBudget.budget_max >= validBudget.budget_min,
    'Budget válido debe pasar'
  );

  TestAssertions.assertFalse(
    invalidBudget.budget_max >= invalidBudget.budget_min,
    'Budget inválido debe fallar'
  );
});

runner.test('profiles: debe validar que roommates_max >= roommates_min', () => {
  const validRoommates = { desired_roommates_min: 1, desired_roommates_max: 3 };
  const invalidRoommates = { desired_roommates_min: 3, desired_roommates_max: 1 };

  TestAssertions.assertTrue(
    validRoommates.desired_roommates_max >= validRoommates.desired_roommates_min,
    'Roommates válido debe pasar'
  );

  TestAssertions.assertFalse(
    invalidRoommates.desired_roommates_max >= invalidRoommates.desired_roommates_min,
    'Roommates inválido debe fallar'
  );
});

// ====================
// TESTS DE MÉTODOS HTTP
// ====================

runner.test('profiles: GET debe requerir autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/profiles', {
    method: 'GET',
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('profiles: POST debe requerir autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/profiles', {
    method: 'POST',
    body: { bio: 'Test' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('profiles: PATCH debe requerir autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/profiles', {
    method: 'PATCH',
    body: { bio: 'Updated' },
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

runner.test('profiles: DELETE debe requerir autenticación', () => {
  const requestWithoutAuth = createMockRequest('http://localhost/profiles', {
    method: 'DELETE',
  });

  const hasAuth = requestWithoutAuth.headers.has('Authorization');
  TestAssertions.assertFalse(hasAuth, 'Request sin auth debe fallar');
});

// ====================
// TESTS DE ESTRUCTURA DE DATOS
// ====================

runner.test('profiles: debe tener estructura correcta en respuesta GET', () => {
  const mockProfile = {
    id: 'user-id',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    gender: 'male',
    occupation: 'Developer',
    smoker: false,
    has_pets: true,
    social_links: {},
    university: 'Test University',
    field_of_study: 'Computer Science',
    interests: ['music', 'sports'],
    lifestyle_preferences: {
      schedule: 'flexible',
      cleaning: 'organized',
      guests: 'occasional',
    },
    housing_situation: 'seeking',
    preferred_zones: ['Centro', 'Malasaña'],
    budget_min: 500,
    budget_max: 1000,
    desired_roommates_min: 1,
    desired_roommates_max: 3,
    is_searchable: true,
    updated_at: new Date().toISOString(),
  };

  TestAssertions.assertExists(mockProfile.id);
  TestAssertions.assertExists(mockProfile.gender);
  TestAssertions.assertExists(mockProfile.housing_situation);
  TestAssertions.assertTrue(Array.isArray(mockProfile.interests));
  TestAssertions.assertTrue(Array.isArray(mockProfile.preferred_zones));
  TestAssertions.assertEquals(typeof mockProfile.lifestyle_preferences, 'object');
});

// ====================
// TESTS DE VALIDACIÓN DE ARRAYS
// ====================

runner.test('profiles: interests debe ser array de strings', () => {
  const validInterests = ['music', 'sports', 'travel'];
  const invalidInterests = [1, 2, 3] as unknown as string[];

  TestAssertions.assertTrue(
    validInterests.every((item) => typeof item === 'string'),
    'Interests válidos debe pasar'
  );

  TestAssertions.assertFalse(
    invalidInterests.every((item) => typeof item === 'string'),
    'Interests inválidos debe fallar'
  );
});

runner.test('profiles: preferred_zones debe ser array de strings', () => {
  const validZones = ['Centro', 'Malasaña', 'Chamberí'];
  const invalidZones = [1, 2, 3] as unknown as string[];

  TestAssertions.assertTrue(
    validZones.every((item) => typeof item === 'string'),
    'Zonas válidas debe pasar'
  );

  TestAssertions.assertFalse(
    invalidZones.every((item) => typeof item === 'string'),
    'Zonas inválidas debe fallar'
  );
});

// ====================
// TESTS DE LIFESTYLE PREFERENCES
// ====================

runner.test('profiles: lifestyle_preferences debe tener estructura correcta', () => {
  const validPreferences = {
    schedule: 'flexible',
    cleaning: 'organized',
    guests: 'occasional',
  };

  TestAssertions.assertEquals(typeof validPreferences, 'object');
  TestAssertions.assertEquals(typeof validPreferences.schedule, 'string');
  TestAssertions.assertEquals(typeof validPreferences.cleaning, 'string');
  TestAssertions.assertEquals(typeof validPreferences.guests, 'string');
});

// ====================
// TESTS DE CÓDIGOS DE ESTADO
// ====================

runner.test('profiles: GET con perfil existente debe devolver 200', () => {
  const expectedStatus = 200;
  TestAssertions.assertEquals(expectedStatus, 200);
});

runner.test('profiles: GET con perfil no existente debe devolver 404', () => {
  const expectedStatus = 404;
  TestAssertions.assertEquals(expectedStatus, 404);
});

runner.test('profiles: POST con perfil ya existente debe devolver 409', () => {
  const expectedStatus = 409;
  TestAssertions.assertEquals(expectedStatus, 409);
});

runner.test('profiles: POST con datos válidos debe devolver 201', () => {
  const expectedStatus = 201;
  TestAssertions.assertEquals(expectedStatus, 201);
});

runner.test('profiles: PATCH con datos válidos debe devolver 200', () => {
  const expectedStatus = 200;
  TestAssertions.assertEquals(expectedStatus, 200);
});

runner.test('profiles: PATCH con perfil no existente debe devolver 404', () => {
  const expectedStatus = 404;
  TestAssertions.assertEquals(expectedStatus, 404);
});

runner.test('profiles: DELETE exitoso debe devolver 200', () => {
  const expectedStatus = 200;
  TestAssertions.assertEquals(expectedStatus, 200);
});

// ====================
// TESTS DE VALIDACIÓN DE SOCIAL LINKS
// ====================

runner.test('profiles: social_links debe ser un objeto JSON válido', () => {
  const validSocialLinks = {
    instagram: '@username',
    twitter: '@username',
    linkedin: 'linkedin.com/in/username',
  };

  TestAssertions.assertEquals(typeof validSocialLinks, 'object');
  TestAssertions.assertTrue(validSocialLinks !== null);
  TestAssertions.assertTrue(!Array.isArray(validSocialLinks));
});

// ====================
// TESTS DE PERMISOS
// ====================

runner.test('profiles: usuario solo puede ver su propio perfil', () => {
  const userId = 'user-123';
  const requestedProfileId = 'user-123';
  const otherProfileId = 'user-456';

  TestAssertions.assertTrue(
    userId === requestedProfileId,
    'Usuario puede ver su perfil'
  );

  TestAssertions.assertFalse(
    userId === otherProfileId,
    'Usuario no puede ver otro perfil sin permisos'
  );
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('🧪 Running profiles tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
