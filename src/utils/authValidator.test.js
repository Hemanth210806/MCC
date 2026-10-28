import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  normalizeIdentifier, 
  authenticateStaff, 
  createLoginNotification, 
  OWNER_EMAIL, 
  OFFICIAL_STAFF_ACCOUNTS 
} from './authValidator.js';

test('normalizeIdentifier correctly expands aliases including Owner', () => {
  assert.equal(normalizeIdentifier('hemanth'), OWNER_EMAIL);
  assert.equal(normalizeIdentifier('owner'), OWNER_EMAIL);
  assert.equal(normalizeIdentifier('hemanthkm'), OWNER_EMAIL);
  assert.equal(normalizeIdentifier('admin'), 'admin@mcc.gov.in');
  assert.equal(normalizeIdentifier('engineer'), 'roads.officer@mcc.gov.in');
  assert.equal(normalizeIdentifier('swm'), 'swm.officer@mcc.gov.in');
});

test('authenticateStaff authenticates Hemanth K M as Website Owner', () => {
  const res = authenticateStaff(OWNER_EMAIL, 'Admin@123');
  assert.equal(res.success, true);
  assert.equal(res.user.role, 'admin');
  assert.equal(res.user.isOwner, true);
  assert.equal(res.user.email, OWNER_EMAIL);
  assert.equal(res.user.name, 'Hemanth K M');
});

test('createLoginNotification dispatches to hemanthkm2006@gmail.com for every user', () => {
  const officer = { id: 2, name: 'Suresh Gowda', role: 'field_officer', email: 'roads.officer@mcc.gov.in' };
  const notice = createLoginNotification(officer);
  assert.equal(notice.to, 'hemanthkm2006@gmail.com');
  assert.match(notice.subject, /Suresh Gowda/);
  assert.equal(notice.user_email, 'roads.officer@mcc.gov.in');
  assert.match(notice.status, /hemanthkm2006@gmail.com/);
});

test('authenticateStaff is forgiving with common password variations for Owner and staff', () => {
  const res = authenticateStaff('hemanth', 'hemanth123');
  assert.equal(res.success, true);
  assert.equal(res.user.isOwner, true);

  const officerRes = authenticateStaff('roads.officer@mcc.gov.in', 'officer123');
  assert.equal(officerRes.success, true);
  assert.equal(officerRes.user.role, 'field_officer');
});
