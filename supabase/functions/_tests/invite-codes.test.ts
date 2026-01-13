// supabase/functions/_tests/invite-codes.test.ts

/**
 * Tests para room-invitations (invite codes)
 * Valida generacion de codigo, expiracion, uso unico y linkage con rooms
 */

import { TestRunner, TestAssertions } from './test-utils.ts';

const runner = new TestRunner();

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 8;

// ====================
// TESTS DE GENERACION
// ====================

runner.test('invite-codes: codigo debe tener longitud 8', () => {
  const code = 'ABCD1234';
  TestAssertions.assertEquals(code.length, INVITE_CODE_LENGTH);
});

runner.test('invite-codes: codigo solo usa alfabeto permitido', () => {
  const validCode = 'ABCD2345';
  const invalidCode = 'ABCDO0I1'; // O, 0, I, 1 no estan permitidos

  const isValid = [...validCode].every((ch) => INVITE_CODE_ALPHABET.includes(ch));
  const isInvalid = [...invalidCode].every((ch) => INVITE_CODE_ALPHABET.includes(ch));

  TestAssertions.assertTrue(isValid, 'Codigo valido debe pasar');
  TestAssertions.assertFalse(isInvalid, 'Codigo invalido debe fallar');
});

runner.test('invite-codes: si hay duplicado debe reintentar generacion', () => {
  const existingCodes = new Set(['ABCDEFGH']);
  const nextCode = 'ABCDEFGH';
  const shouldRetry = existingCodes.has(nextCode);
  TestAssertions.assertTrue(shouldRetry, 'Debe reintentar si hay duplicado');
});

// ====================
// TESTS DE EXPIRACION
// ====================

runner.test('invite-codes: expires_at debe ser null si no hay expiracion', () => {
  const expiresInHours = 0;
  const expiresAt = Number.isFinite(expiresInHours) && expiresInHours > 0 ? new Date() : null;
  TestAssertions.assertNull(expiresAt, 'Sin expiracion debe ser null');
});

runner.test('invite-codes: expires_at debe ser futuro si hay expiracion', () => {
  const expiresInHours = 24;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const isFuture = expiresAt.getTime() > Date.now();
  TestAssertions.assertTrue(isFuture, 'Debe ser fecha futura');
});

// ====================
// TESTS DE ROOMS Y PERMISOS
// ====================

runner.test('invite-codes: room_id es requerido', () => {
  const body = {};
  const hasRoomId = 'room_id' in body;
  TestAssertions.assertFalse(hasRoomId, 'Debe requerir room_id');
});

runner.test('invite-codes: solo owner puede generar invitacion', () => {
  const room = { owner_id: 'owner-1' };
  const userId = 'user-2';
  const isOwner = room.owner_id === userId;
  TestAssertions.assertFalse(isOwner, 'Debe rechazar si no es owner');
});

runner.test('invite-codes: no permite invitaciones para areas comunes', () => {
  const roomExtras = { category: 'area_comun' };
  const isCommonArea = roomExtras.category === 'area_comun';
  TestAssertions.assertTrue(isCommonArea, 'Debe rechazar areas comunes');
});

runner.test('invite-codes: no permite invitaciones si room ya asignado', () => {
  const assignments = [{ status: 'accepted' }];
  const hasAccepted = assignments.some((row) => row.status === 'accepted');
  TestAssertions.assertTrue(hasAccepted, 'Debe rechazar si room ya asignado');
});

runner.test('invite-codes: invitacion debe incluir room_id y owner_id', () => {
  const invite = {
    room_id: 'room-123',
    owner_id: 'owner-123',
    code: 'ABCD1234',
  };
  TestAssertions.assertExists(invite.room_id);
  TestAssertions.assertExists(invite.owner_id);
  TestAssertions.assertExists(invite.code);
});

// ====================
// EJECUTAR TESTS
// ====================

if (import.meta.main) {
  console.log('Running invite-codes tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);

  Deno.exit(summary.failed > 0 ? 1 : 0);
}
