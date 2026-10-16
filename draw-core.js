/* Shared, DOM-independent validation and weighted sampling. */
(function (scope) {
  'use strict';
  function validate(items) {
    if (!Array.isArray(items) || !items.length) throw new Error('팀원을 한 명 이상 추가해주세요.');
    if (items.length > 100) throw new Error('팀원은 최대 100명까지 등록할 수 있어요.');
    const names = new Set();
    return items.map(item => {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const weight = Number(item.weight);
      if (!name || name.length > 30) throw new Error('이름은 1~30자로 입력해주세요.');
      if (names.has(name)) throw new Error('같은 이름이 있어요. 동명이인은 이름 뒤에 구분을 붙여주세요.');
      if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) throw new Error('가중치는 0보다 크고 1,000 이하인 숫자로 입력해주세요.');
      names.add(name);
      return { name, weight };
    });
  }
  function sample(items, count, random = Math.random) {
    const pool = validate(items);
    if (!Number.isInteger(count) || count < 1 || count > pool.length) throw new Error('추첨 인원은 참여 가능한 팀원 수 안에서 설정해주세요.');
    const winners = [];
    for (let i = 0; i < count; i++) {
      const total = pool.reduce((sum, item) => sum + item.weight, 0);
      let ticket = random() * total;
      let index = pool.length - 1;
      for (let j = 0; j < pool.length; j++) {
        ticket -= pool[j].weight;
        if (ticket < 0) { index = j; break; }
      }
      winners.push(pool.splice(index, 1)[0]);
    }
    return winners;
  }
  const api = { validate, sample };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.DrawCore = api;
})(globalThis);
