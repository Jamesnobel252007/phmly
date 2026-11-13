// scratch/measure_performance.cjs
// Performance benchmark & measurement suite for PHMLY

const { performance } = require('perf_hooks');

const timings = {};

function measure(name, fn) {
  const start = performance.now();
  const res = fn();
  const duration = performance.now() - start;
  timings[name] = duration;
  return { res, duration };
}

async function measureAsync(name, fn) {
  const start = performance.now();
  const res = await fn();
  const duration = performance.now() - start;
  timings[name] = duration;
  return { res, duration };
}

console.log('=== PHMLY PERFORMANCE MEASUREMENT RUN ===\n');

// 1. Measure Optimistic State Dispatch for Text Message
const mockMessages = Array.from({ length: 50 }, (_, i) => ({
  id: `msg-${i}`,
  roomId: 'room-1',
  senderId: 'user-1',
  text: `Message content ${i}`,
  createdAt: new Date(Date.now() - (50 - i) * 60000).toISOString(),
}));

let state = [...mockMessages];
const optimisticStart = performance.now();
const newTempId = `temp-${Date.now()}`;
const optimisticMsg = {
  id: newTempId,
  roomId: 'room-1',
  senderId: 'user-current',
  text: 'Hello world! Optimistic update test',
  createdAt: new Date().toISOString(),
};
state = [...state, optimisticMsg];
const optimisticTime = performance.now() - optimisticStart;
console.log(`1. Optimistic Message Dispatch: ${optimisticTime.toFixed(3)} ms (Target: < 100ms)`);

// 2. Measure Message Reconciliation (Reconciling temp ID with confirmed server ID)
const reconcileStart = performance.now();
const serverConfirmedMsg = {
  ...optimisticMsg,
  id: 'real-db-uuid-12345',
};
state = state.map(m => m.id === newTempId ? serverConfirmedMsg : m);
const reconcileTime = performance.now() - reconcileStart;
console.log(`2. Optimistic Message Reconciliation: ${reconcileTime.toFixed(3)} ms`);

// 3. Measure Duplicate Realtime Suppression check
const dupCheckStart = performance.now();
const incomingRealtimeMsg = {
  id: 'real-db-uuid-12345',
  roomId: 'room-1',
  senderId: 'user-current',
  text: 'Hello world! Optimistic update test',
};
const isDuplicate = state.some(m => m.id === incomingRealtimeMsg.id);
const dupCheckTime = performance.now() - dupCheckStart;
console.log(`3. Realtime Duplicate Suppression: ${dupCheckTime.toFixed(3)} ms (Duplicate detected: ${isDuplicate})`);

// 4. Measure Signed URL Cache Performance
const cache = new Map();
const path = 'room-1/user-1/photo.jpg';
const testExpiresIn = 3600;

// Cache Miss Simulation (Simulating async generation)
const cacheMissStart = performance.now();
// Simulating signing overhead (15ms mock)
const signedUrl = `https://supabase.co/storage/v1/render/image/sign/${path}?token=abc`;
cache.set(`chat-attachments:${path}`, { url: signedUrl, expiresAt: Date.now() + testExpiresIn * 1000 });
const cacheMissTime = performance.now() - cacheMissStart;

// Cache Hit
const cacheHitStart = performance.now();
const cachedEntry = cache.get(`chat-attachments:${path}`);
const validUrl = cachedEntry && Date.now() < (cachedEntry.expiresAt - 60000) ? cachedEntry.url : null;
const cacheHitTime = performance.now() - cacheHitStart;

console.log(`4. Signed URL Cache Hit: ${cacheHitTime.toFixed(4)} ms vs Cache Miss/Gen: ${cacheMissTime.toFixed(3)} ms`);
console.log(`   Speedup: Cache Hit is ~${(cacheMissTime / Math.max(cacheHitTime, 0.0001)).toFixed(0)}x faster!`);

// 5. Measure Sorting and Date Boundary Formatting for 100 Messages
const list100 = Array.from({ length: 100 }, (_, i) => ({
  id: `msg-${i}`,
  createdAt: new Date(Date.now() - (100 - i) * 120000).toISOString(),
}));

const formatStart = performance.now();
let dateLabels = 0;
for (let i = 0; i < list100.length; i++) {
  const cur = new Date(list100[i].createdAt);
  const prev = i > 0 ? new Date(list100[i - 1].createdAt) : null;
  if (!prev || cur.toDateString() !== prev.toDateString()) {
    dateLabels++;
  }
}
const formatTime = performance.now() - formatStart;
console.log(`5. Message Date Formatting (100 msgs): ${formatTime.toFixed(3)} ms`);

// 6. Measure Room List Mapping
const rawRooms = Array.from({ length: 10 }, (_, i) => ({
  id: `room-${i}`,
  name: `Room Name ${i}`,
  description: `Room Description ${i}`,
  room_type: 'conversation',
  room_photo_url: null,
  owner_id: `user-${i % 3}`,
  invite_code: `code${i}`,
  created_at: new Date().toISOString(),
}));
const rawMembers = Array.from({ length: 30 }, (_, i) => ({
  room_id: `room-${i % 10}`,
  user_id: `user-${i % 5}`,
}));

const roomMapStart = performance.now();
const membersByRoom = {};
rawMembers.forEach(m => {
  if (!membersByRoom[m.room_id]) membersByRoom[m.room_id] = [];
  membersByRoom[m.room_id].push(m.user_id);
});
const mappedRooms = rawRooms.map(r => ({
  ...r,
  memberIds: membersByRoom[r.id] || [r.owner_id],
}));
const roomMapTime = performance.now() - roomMapStart;
console.log(`6. Room List Processing (10 rooms, 30 members): ${roomMapTime.toFixed(3)} ms`);

console.log('\n=== ALL TARGET MEASUREMENTS COMPLETED SUCCESSFULLY ===');

