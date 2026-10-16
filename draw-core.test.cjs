const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate, sample } = require('./draw-core.js');
const roster = [{ name: '가', weight: 1 }, { name: '나', weight: 2 }, { name: '다', weight: 3 }];
test('여러 명 추첨은 중복이 없고 원본을 변경하지 않는다', () => {
  for (let i = 0; i < 1000; i++) {
    const result = sample(roster, 3);
    assert.equal(new Set(result.map(p => p.name)).size, 3);
  }
  assert.equal(roster.length, 3);
});
test('가중치 경계와 마지막 항목 선택', () => {
  assert.equal(sample(roster, 1, () => 0)[0].name, '가');
  assert.equal(sample(roster, 1, () => 1 / 6)[0].name, '나');
  assert.equal(sample(roster, 1, () => .999999)[0].name, '다');
  assert.deepEqual(sample(roster, 3, () => 0).map(p => p.name), ['가', '나', '다']);
});
test('잘못된 이름, 가중치, 인원을 거부한다', () => {
  for (const weight of [0, -1, NaN, Infinity, 1001]) assert.throws(() => validate([{ name: '가', weight }]));
  assert.throws(() => validate([]));
  assert.throws(() => validate([{ name: ' ', weight: 1 }]));
  assert.throws(() => validate([{ name: '가', weight: 1 }, { name: ' 가 ', weight: 1 }]));
  for (const count of [0, -1, 4, 1.5, NaN]) assert.throws(() => sample(roster, count));
  assert.equal(validate([{name:' 가 ',weight:0.5}])[0].name, '가');
});
