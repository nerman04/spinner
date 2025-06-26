let items = JSON.parse(localStorage.getItem("wheelItems")) || [
  { name: "치킨", weight: 30 },
  { name: "피자", weight: 40 },
  { name: "커피", weight: 30 },
];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const audio = document.getElementById("spin-audio");

let angle = 0;
let targetAngle = 0;
let spinning = false;
let spinStart = 0;
let spinDuration = 3000;
let selectedItem = null;

// 돌림판 그리기
function drawWheel() {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let startAngle = 0;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  ctx.translate(150, 150);
  ctx.rotate(angle);
  ctx.translate(-150, -150);

  items.forEach((item) => {
    const slice = (item.weight / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(150, 150);
    ctx.arc(150, 150, 150, startAngle, startAngle + slice);
    ctx.fillStyle = randomColor(item.name);
    ctx.fill();

    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(startAngle + slice / 2);
    ctx.fillStyle = "#000";
    ctx.font = "14px sans-serif";
    ctx.fillText(item.name, 60, 5);
    ctx.restore();

    startAngle += slice;
  });

  ctx.restore();

  // 중앙 화살표
  ctx.beginPath();
  ctx.moveTo(150, 0);
  ctx.lineTo(145, 20);
  ctx.lineTo(155, 20);
  ctx.closePath();
  ctx.fillStyle = "red";
  ctx.fill();
}

function startSpin() {
  if (spinning) return;

  // ── ① 가중치 기반으로 당첨 인덱스 선택 ─────────────────────────────
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  const r = Math.random() * total;
  let acc = 0,
    idx = 0;
  for (let i = 0; i < items.length; i++) {
    acc += items[i].weight;
    if (r < acc) {
      idx = i;
      break;
    }
  }
  selectedItem = items[idx];

  // ── ② 선택된 섹터가 포인터(12시)에 오도록 최종 각도 계산 ─────────
  const sliceDeg = (items[idx].weight / total) * 360; // 섹터 크기
  const baseDeg = items
    .slice(0, idx) // 시작 각
    .reduce((s, it) => s + (it.weight / total) * 360, 0);
  const offsetDeg = Math.random() * sliceDeg; // 섹터 안 임의 오프셋
  const pointerFix = 270; // 0°→3시 를 12시로 맞추기 위한 보정(+270°)

  // (5바퀴) + (pointerFix  -  baseDeg  - offsetDeg)
  let spinDeg = 360 * 5 + (pointerFix - baseDeg - offsetDeg);
  // 음수가 될 가능성 제거
  spinDeg = (((spinDeg % 360) + 360) % 360) + 360 * 5;

  targetAngle = (spinDeg * Math.PI) / 180;

  // ── ③ 애니메이션 시작 ───────────────────────────────────────────────
  spinStart = null;
  spinning = true;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  requestAnimationFrame(animate);
}

function animate(timestamp) {
  if (!spinStart) spinStart = timestamp;
  const elapsed = timestamp - spinStart;
  const progress = Math.min(elapsed / spinDuration, 1);
  angle = easeOutCubic(progress) * targetAngle;

  drawWheel();

  if (progress < 1) {
    requestAnimationFrame(animate);
  } else {
    spinning = false;
    angle %= 2 * Math.PI;
    audio.pause();
    setTimeout(() => {
      showResultModal(selectedItem.name);
    }, 300);
  }
}

function easeOutCubic(t) {
  return --t * t * t + 1;
}

function randomColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 70%, 60%)`;
}

// 모달 닫기
function closeModal() {
  document.getElementById("result-modal").style.display = "none";
}

// 관리자 모드
function toggleAdmin() {
  const show = confirm("관리자 모드를 여시겠습니까?");
  if (show) {
    document.getElementById("admin").style.display = "block";
    renderTable();
  }
}

function renderTable() {
  const table = document.getElementById("item-table");
  table.innerHTML = "";
  items.forEach((item, idx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input value="${item.name}" onchange="updateName(${idx}, this.value)"></td>
      <td><input type="number" value="${item.weight}" onchange="updateWeight(${idx}, this.value)"></td>
      <td><button onclick="deleteItem(${idx})">삭제</button></td>
    `;
    table.appendChild(row);
  });
}

function addItem() {
  items.push({ name: "새 항목", weight: 10 });
  renderTable();
  drawWheel();
}

function updateName(idx, value) {
  items[idx].name = value;
  drawWheel();
}

function updateWeight(idx, value) {
  items[idx].weight = parseInt(value);
  drawWheel();
}

function deleteItem(idx) {
  items.splice(idx, 1);
  renderTable();
  drawWheel();
}

function saveItems() {
  localStorage.setItem("wheelItems", JSON.stringify(items));
  // 설정 저장 완료 후 관리자 창 닫기
  closeAdminPanel();
  alert("저장 완료");
  drawWheel();
}

// 모바일 최적화로 PC에서는 가운데 안나올 수 있음
function showResultModal(name) {
  document.getElementById("winner-name").innerText = name;
  const modal = document.getElementById("result-modal");
  modal.style.display = "flex";

  // 모달 내부 컨텐츠 기준으로 중심 좌표 계산
  const content = modal.querySelector(".modal-content");
  const rect = content.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // 화면 기준 0~1 비율로 환산
  const originX = centerX / window.innerWidth;
  const originY = centerY / window.innerHeight;

  // confetti canvas 추가
  const myCanvas = document.createElement("canvas");
  myCanvas.id = "confetti-canvas";
  myCanvas.style.position = "fixed";
  myCanvas.style.top = 0;
  myCanvas.style.left = 0;
  myCanvas.style.width = "100%";
  myCanvas.style.height = "100%";
  myCanvas.style.pointerEvents = "none";
  myCanvas.style.zIndex = 10000;
  document.body.appendChild(myCanvas);

  const myConfetti = confetti.create(myCanvas, {
    resize: true,
    useWorker: true,
  });

  // 정확한 위치에서 폭죽 발사 🎆
  myConfetti({
    particleCount: 200,
    spread: 100,
    startVelocity: 35,
    origin: { x: originX, y: originY },
  });

  // 캔버스 제거
  setTimeout(() => {
    myCanvas.remove();
  }, 3000);
}

function closeAdminPanel() {
  const panel = document.getElementById("admin");
  if (panel) panel.style.display = "none";
}

// 초기
drawWheel();
