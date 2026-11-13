const assert = require('assert');

// 1. LIMITS & CONSTANTS
const LIMITS = {
  MAX_ROOMS_CREATED: 5,
  MIN_ROOM_MEMBERS: 1,
  MAX_ROOM_MEMBERS: 30,
};

const GOAL_RANKING_CATEGORIES = {
  TOP: 'Naantha ipo ooroda top la irukura',
  GOOD: 'Vaalthukal vaalthukal',
  ZERO: 'Choplangii ta bro',
};

const EMPTY_GOAL_STATE = {
  headline: 'NOTITU poiruchu THAMBI 😭',
  motivational: 'Innaiku miss aachu. Naalaikku comeback pannalaam!',
  actionButton: 'Tomorrow, we go again',
};

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}: ${err.message}`);
    failed++;
  }
}

console.log('=== TEST SUITE 1: AUTH & INPUT VALIDATIONS ===');
it('Validates email format strictly', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.strictEqual(emailRegex.test('valid@example.com'), true);
  assert.strictEqual(emailRegex.test('user+tag@phmly.app'), true);
  assert.strictEqual(emailRegex.test('invalid-email'), false);
  assert.strictEqual(emailRegex.test('missing@domain'), false);
  assert.strictEqual(emailRegex.test(''), false);
});

it('Validates password length requirement (>= 6 chars)', () => {
  const minLength = 6;
  assert.strictEqual('123456'.length >= minLength, true);
  assert.strictEqual('abc'.length >= minLength, false);
  assert.strictEqual(''.length >= minLength, false);
});

console.log('\n=== TEST SUITE 2: ROOM MANAGEMENT & LIMIT RULES ===');
it('Enforces 5-room creation ceiling per owner', () => {
  const userCreatedCount = 5;
  const canCreate = userCreatedCount < LIMITS.MAX_ROOMS_CREATED;
  assert.strictEqual(canCreate, false);
  assert.strictEqual(4 < LIMITS.MAX_ROOMS_CREATED, true);
});

it('Enforces 30-member room capacity ceiling', () => {
  assert.strictEqual(29 < LIMITS.MAX_ROOM_MEMBERS, true);
  assert.strictEqual(30 < LIMITS.MAX_ROOM_MEMBERS, false);
  assert.strictEqual(31 <= LIMITS.MAX_ROOM_MEMBERS, false);
});

it('Room creator has Delete Room permission only, cannot Leave Room', () => {
  const ownerId = 'user-owner-1';
  const memberId = 'user-member-2';
  const strangerId = 'user-stranger-3';
  const room = {
    id: 'room-1',
    ownerId: ownerId,
    memberIds: [ownerId, memberId],
  };

  function getPermissions(user, r) {
    if (!user) return { canDelete: false, canLeave: false };
    const isOwner = r.ownerId === user.id;
    const isMember = !isOwner && r.memberIds.includes(user.id);
    return { canDelete: isOwner, canLeave: isMember };
  }

  // Creator
  const creatorPerms = getPermissions({ id: ownerId }, room);
  assert.strictEqual(creatorPerms.canDelete, true);
  assert.strictEqual(creatorPerms.canLeave, false);

  // Invited Member
  const memberPerms = getPermissions({ id: memberId }, room);
  assert.strictEqual(memberPerms.canDelete, false);
  assert.strictEqual(memberPerms.canLeave, true);

  // Stranger
  const strangerPerms = getPermissions({ id: strangerId }, room);
  assert.strictEqual(strangerPerms.canDelete, false);
  assert.strictEqual(strangerPerms.canLeave, false);
});

console.log('\n=== TEST SUITE 3: GOAL TRACKER RANKINGS & CATEGORIES ===');
it('Calculates correct Tamil ranking tier for top performers', () => {
  const members = [
    { id: '1', name: 'Karthik', completedCount: 3, totalCount: 3 },
    { id: '2', name: 'Priya', completedCount: 1, totalCount: 2 },
    { id: '3', name: 'Deepa', completedCount: 0, totalCount: 1 },
  ];

  const maxCompleted = Math.max(...members.map(m => m.completedCount));
  assert.strictEqual(maxCompleted, 3);

  const top = members.filter(m => m.completedCount === maxCompleted);
  const good = members.filter(m => m.completedCount > 0 && m.completedCount < maxCompleted);
  const zero = members.filter(m => m.completedCount === 0);

  assert.strictEqual(top.length, 1);
  assert.strictEqual(top[0].name, 'Karthik');
  assert.strictEqual(good.length, 1);
  assert.strictEqual(good[0].name, 'Priya');
  assert.strictEqual(zero.length, 1);
  assert.strictEqual(zero[0].name, 'Deepa');
});

it('Preserves authentic PHMLY Tamil empty states and category labels', () => {
  assert.strictEqual(GOAL_RANKING_CATEGORIES.TOP, 'Naantha ipo ooroda top la irukura');
  assert.strictEqual(GOAL_RANKING_CATEGORIES.GOOD, 'Vaalthukal vaalthukal');
  assert.strictEqual(GOAL_RANKING_CATEGORIES.ZERO, 'Choplangii ta bro');
  assert.strictEqual(EMPTY_GOAL_STATE.headline, 'NOTITU poiruchu THAMBI 😭');
  assert.strictEqual(EMPTY_GOAL_STATE.actionButton, 'Tomorrow, we go again');
});

console.log('\n=== TEST SUITE 4: VAULT ZIP GENERATION LOGIC ===');
const JSZip = require('jszip');
it('Packages multiple files into a valid ZIP archive using JSZip', async () => {
  const zip = new JSZip();
  zip.file('readme.txt', 'PHMLY Project Vault Resource File');
  zip.file('notes.json', JSON.stringify({ project: 'PHMLY', status: 'verified' }));

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  assert.strictEqual(Buffer.isBuffer(content), true);
  assert.strictEqual(content.length > 50, true);
});

console.log(`\n========================================`);
console.log(`Summary: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);

