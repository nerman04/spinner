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

  const total = items.reduce((sum, i) => sum + i.weight, 0);
  const rand = Math.random() * total;
  let accum = 0;
  let selectedIndex = 0;

  for (let i = 0; i < items.length; i++) {
    accum += items[i].weight;
    if (rand < accum) {
      selectedIndex = i;
      break;
    }
  }

  selectedItem = items[selectedIndex];

  const sliceDeg = (items[selectedIndex].weight / total) * 360;
  const baseDeg = items
    .slice(0, selectedIndex)
    .reduce((sum, i) => sum + (i.weight / total) * 360, 0);
  const offset = Math.random() * sliceDeg;
  const finalDeg = 360 * 5 + (360 - baseDeg - offset);
  targetAngle = (finalDeg * Math.PI) / 180;

  spinStart = null;
  spinning = true;

  audio.currentTime = 0;
  audio.play().catch((err) => {
    console.warn("소리 재생 실패: 사용자 상호작용 필요", err);
  });
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
  alert("저장 완료");
  drawWheel();
}

function showResultModal(name) {
  // 1. 모달 내용 업데이트
  document.getElementById("winner-name").innerText = name;
  const modal = document.getElementById("result-modal");
  modal.style.display = "flex";

  // 2. 모달 중심 좌표 계산
  const rect = modal.querySelector(".modal-content").getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const originX = centerX / screenWidth;
  const originY = centerY / screenHeight;

  // 3. 모달 위에 canvas 추가
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

  // 4. confetti 실행
  const myConfetti = confetti.create(myCanvas, {
    resize: true,
    useWorker: true,
  });

  // 🎉 모달 중앙에서 터지도록
  myConfetti({
    particleCount: 200,
    spread: 100,
    startVelocity: 30,
    origin: { x: originX, y: originY },
  });

  // 5. 일정 시간 후 canvas 제거
  setTimeout(() => {
    myCanvas.remove();
  }, 3000);
}

// 초기
drawWheel();
