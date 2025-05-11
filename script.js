const firebaseConfig = {
  apiKey: "",
  authDomain: "rsp-game-76111.firebaseapp.com",
  projectId: "rsp-game-76111"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const imageMap = { rock: 'rock.png', scissors: 'scissors.png', paper: 'paper.png' };
const rewards = ['X8', 'X4', 'X15', 'X2', 'X10', 'X20', 'X1', 'X100'];
const weights = [6, 11, 3, 18, 3, 2, 49, 0.01];
const colors = ['#ff3333', '#ff9933', '#ffff33', '#66ff66', '#33ffff', '#3399ff', '#cc66ff', '#ff66cc'];
const center = 150;
const radius = 140;
const wheel = document.getElementById('wheel');
const pointer = document.querySelector('.roulette-wrapper .pointer');

let computerChoice = '';
let intervalId;
let gameStarted = false;
let coinCount = 0;
let currentStudentId = null;

function updateCoinDisplay() {
  document.getElementById('coinCount').textContent = coinCount;
}


// 로그인
function login() {
  const input = document.getElementById('studentIdInput');
  const id = input.value.trim().replace(/\s+/g, ' ');
  if (!id) return alert("(학번이름)을 입력해주세요.");
   if (id.includes(" ")) {
    alert("띄어쓰기를 포함할 수 없습니다. '0000홍길동' 형태로 입력하세요.");
    return;
  }
  currentStudentId = id;
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('user-info').style.display = 'block';
  document.getElementById('studentIdDisplay').textContent = id;
   document.getElementById('addCoinBtn').disabled = false;
  document.getElementById('withdrawBtn').disabled = false;
  updateCoinDisplay();
  loadGameStats();
  loadSavedCoins();
  input.value = '';
}

// 로그아웃
function logout() {
  currentStudentId = null;
  coinCount = 0;
  updateCoinDisplay();
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('user-info').style.display = 'none';
  document.getElementById('studentIdDisplay').textContent = '';
  document.getElementById('computer').src = 'rock.png';
  document.getElementById('result').textContent = '';
  document.getElementById('result').style.display = 'none';
  document.getElementById('finalReward').textContent = '';
  document.getElementById('rouletteContainer').style.display = 'none';
  document.getElementById('addCoinBtn').disabled = true;
  pointer.style.display = 'none';
  document.getElementById('startBtn').disabled = false;
  document.getElementById('game-summary').style.display = 'none';
  document.getElementById('coinInput').value = '';
  document.getElementById('coinPassword').value = '';
  document.getElementById('password-box').style.display = 'none';
}

// 비밀번호 입력창 표시
function showPasswordInput() {
  if (!currentStudentId) {
    alert("로그인이 필요합니다.");
    return;
  }
  document.getElementById('password-box').style.display = 'flex';
}


// 비밀번호 확인 후 충전
async function submitPassword() {
  const input = document.getElementById('coinInput');
  const pwInput = document.getElementById('coinPassword');
  const password = pwInput.value.trim();
  const added = parseInt(input.value);

  const hash = await sha256(password);
  const PASSWORD_HASH = "dc2222c7635846aa16964af1d476074a1db431903d13ea38009c879ef234a534"; //비밀번호 해시

  if (!currentStudentId) return alert("로그인이 필요합니다.");
  if (hash !== PASSWORD_HASH) return alert("비밀번호가 틀렸습니다.");

  if (isNaN(added) || added <= 0) {
    alert("유효한 포인트 수를 입력해주세요.");
    return;
  }

  // ✅ 1. 오늘 충전한 코인 총합 조회
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 자정 기준

  const snapshot = await db.collection("coinLogs")
    .where("studentId", "==", currentStudentId)
    .where("type", "==", "충전")
    .where("time", ">=", startOfDay.toISOString())
    .get();

  let todayCharged = 0;
  snapshot.forEach(doc => {
    todayCharged += doc.data().amount || 0;
  });

  if ((todayCharged + added) > 20) {
    const left = 20 - todayCharged;
    alert(`하루 충전 한도(20개)를 초과했습니다.\n현재까지 충전: ${todayCharged}개\n남은 가능량: ${left <= 0 ? 0 : left}개`);
    return;
  }

  // ✅ 2. 충전 처리
  coinCount += added;
  updateCoinDisplay();
  await updateCoinStats("충전", added);
  await saveCurrentCoins();

  // ✅ 3. UI 초기화
  input.value = '';
  pwInput.value = '';
  document.getElementById('password-box').style.display = 'none';
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}


// 코인 저장
async function saveCurrentCoins() {
  if (!currentStudentId) return;
  const ref = db.collection('userStats').doc(currentStudentId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : { studentId: currentStudentId };
  data.currentCoins = coinCount;
  await ref.set(data);
}

// 로그인 시 저장된 코인 불러오기
async function loadSavedCoins() {
  if (!currentStudentId) return;
  const ref = db.collection('userStats').doc(currentStudentId);
  const snap = await ref.get();
  if (snap.exists && snap.data().currentCoins !== undefined) {
    coinCount = snap.data().currentCoins;
    updateCoinDisplay();
  } else {
    coinCount = 0;
    updateCoinDisplay();
  }
}

// 출금
async function resetCoins() {
  if (!currentStudentId) return alert("로그인이 필요합니다.");
  const current = coinCount;
  if (confirm(`현재 포인트는 ${current}개입니다. 받으시겠습니까?`)) {
    coinCount = 0;
    updateCoinDisplay();
    alert(`포인트 받기가 완료되었습니다. \n 관리자에게 포인트를 받고 교환을 하러 가주세요.(${current}개)`);
    await updateCoinStats("출금", current);
    await saveCurrentCoins();
  }
}

// 통계 기록
async function updateCoinStats(type, amount) {
  if (!currentStudentId) return;
  const ref = db.collection('userStats').doc(currentStudentId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {
    studentId: currentStudentId,
    totalGames: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    totalCharge: 0,
    totalWithdraw: 0
  };
  if (type === "충전") data.totalCharge += amount;
  if (type === "출금") data.totalWithdraw += amount;
  await ref.set(data);
  await db.collection("coinLogs").add({
    studentId: currentStudentId,
    type,
    amount,
    time: new Date().toISOString()
  });
}

// 게임 시작
document.getElementById('startBtn').addEventListener('click', () => {
  if (!currentStudentId) return alert("로그인이 필요합니다.");
  if (gameStarted) return;
  if (coinCount <= 0) return alert("포인트가가 부족합니다.");
  coinCount--;
  updateCoinDisplay();
  gameStarted = true;
  intervalId = setInterval(changeComputerImage, 30);
  document.getElementById('startBtn').disabled = true;
  document.getElementById('result').textContent = '';
  document.getElementById('finalReward').textContent = '';
  document.getElementById('rouletteContainer').style.display = 'none';
  pointer.style.display = 'none';
  db.collection("gameLogs").add({
    studentId: currentStudentId,
    type: "게임시작",
    time: new Date().toISOString()
  });
});

let previousChoice = null;

function changeComputerImage() {
  const choices = ['rock', 'scissors', 'paper'];
  let newChoice;

  do {
    newChoice = choices[Math.floor(Math.random() * 3)];
  } while (newChoice === previousChoice); // 이전과 같으면 다시 뽑기

  previousChoice = newChoice;
  computerChoice = newChoice;
  document.getElementById('computer').src = imageMap[newChoice];
}


async function updateGameResult(resultText) {
  if (!currentStudentId) return;
  const ref = db.collection('userStats').doc(currentStudentId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {
    studentId: currentStudentId,
    totalGames: 0,
    wins: 0,
    draws: 0,
    losses: 0
  };
  data.totalGames++;
  if (resultText.includes("이겼")) data.wins++;
  else if (resultText.includes("무승부")) data.draws++;
  else data.losses++;
  await ref.set(data);
  await db.collection("gameLogs").add({
    studentId: currentStudentId,
    type: "게임결과",
    result: resultText,
    time: new Date().toISOString()
  });
  await loadGameStats();
}

function userPlay(userChoice) {
  if (!gameStarted) return;
  clearInterval(intervalId);
  const resultBox = document.getElementById('result');
  resultBox.style.display = 'block';
  let resultText = '';
  if (userChoice === computerChoice) {
    resultText = "무승부!";
    updateCoinDisplay();
  } else if (
    (userChoice === 'rock' && computerChoice === 'scissors') ||
    (userChoice === 'scissors' && computerChoice === 'paper') ||
    (userChoice === 'paper' && computerChoice === 'rock')
  ) {
    resultText = "이겼습니다!";
    document.getElementById('winSound')?.play();
    document.getElementById('rouletteContainer').style.display = 'block';
    pointer.style.display = 'block';
    setTimeout(startWheelSpin, 1000);
  } else {
    resultText = "졌습니다!";
  }
  resultBox.textContent = resultText;
  updateGameResult(resultText);
  gameStarted = false;
  document.getElementById('startBtn').disabled = false;
}

async function loadGameStats() {
  if (!currentStudentId) return;
  const ref = db.collection('userStats').doc(currentStudentId);
  const userSnap = await ref.get();

  let totalRewardCoin = 0;
  const rewardQuery = await db.collection("gameLogs")
    .where("studentId", "==", currentStudentId)
    .where("type", "==", "보상")
    .get();

  rewardQuery.forEach(doc => {
    const rewardStr = doc.data().reward || '';
    const match = rewardStr.match(/X(\d+)/);
    if (match && match[1]) {
      totalRewardCoin += parseInt(match[1]);
    }
  });

  if (userSnap.exists) {
    const stats = userSnap.data();
    const total = stats.totalGames || 0;
    const wins = stats.wins || 0;
    const draws = stats.draws || 0;
    const losses = stats.losses || 0;
    const rate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    document.getElementById("summary-total").textContent = total;
    document.getElementById("summary-win").textContent = wins;
    document.getElementById("summary-draw").textContent = draws;
    document.getElementById("summary-loss").textContent = losses;
    document.getElementById("summary-rate").textContent = `${rate}%`;
    document.getElementById("summary-reward").textContent = totalRewardCoin;
    document.getElementById("game-summary").style.display = "block";
  }
}

// 룰렛 관련
function createWheel() {
  wheel.innerHTML = '';
  const anglePerSegment = 360 / rewards.length;
  for (let i = 0; i < rewards.length; i++) {
    const startAngle = anglePerSegment * i;
    const endAngle = anglePerSegment * (i + 1);
    const largeArc = anglePerSegment > 180 ? 1 : 0;
    const startX = center + radius * Math.cos((startAngle - 90) * Math.PI / 180);
    const startY = center + radius * Math.sin((startAngle - 90) * Math.PI / 180);
    const endX = center + radius * Math.cos((endAngle - 90) * Math.PI / 180);
    const endY = center + radius * Math.sin((endAngle - 90) * Math.PI / 180);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;
    path.setAttribute('d', d);
    path.setAttribute('fill', colors[i]);
    path.setAttribute('stroke', 'gold');
    path.setAttribute('stroke-width', '2');
    wheel.appendChild(path);

    const textAngle = (startAngle + endAngle) / 2 - 90;
    const textRadius = radius * 0.75;
    const textX = center + textRadius * Math.cos(textAngle * Math.PI / 180);
    const textY = center + textRadius * Math.sin(textAngle * Math.PI / 180);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", textX);
    text.setAttribute("y", textY);
    text.setAttribute("fill", "#fff");
    text.setAttribute("font-size", "18");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("transform", `rotate(${textAngle + 90}, ${textX}, ${textY})`);
    text.textContent = rewards[i];
    wheel.appendChild(text);
  }
  const borderCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  borderCircle.setAttribute("cx", center);
  borderCircle.setAttribute("cy", center);
  borderCircle.setAttribute("r", radius);
  borderCircle.setAttribute("stroke", "gold");
  borderCircle.setAttribute("stroke-width", "15");
  borderCircle.setAttribute("fill", "none");
  wheel.appendChild(borderCircle);
}

function getRandomReward() {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const rand = Math.random() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < rewards.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) return rewards[i];
  }
}

function startWheelSpin() {
  const rewardDisplay = document.getElementById('finalReward');
  const selected = getRandomReward();
  const index = rewards.indexOf(selected);
  const degPer = 360 / rewards.length;
  const stopDeg = index * degPer + Math.random() * degPer;
  const extraSpins = 5;
  const targetAngle = 360 * extraSpins + (360 - stopDeg);
  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';
  document.getElementById('spinSound').currentTime = 0;
  document.getElementById('spinSound').play();
  setTimeout(() => {
    wheel.style.transition = 'transform 4s cubic-bezier(0.33, 1, 0.68, 1)';
    wheel.style.transform = `rotate(${targetAngle}deg)`;
  }, 50);
  setTimeout(() => {
    rewardDisplay.textContent = `보상: ${selected} point`;
    document.getElementById('RewardSound')?.play();
    const numeric = parseInt(selected.replace('X', ''));
    rewardDisplay.style.display = 'block';
    if (!isNaN(numeric)) {
      coinCount += numeric;
      updateCoinDisplay();
      saveCurrentCoins();
    }
    db.collection("gameLogs").add({
      studentId: currentStudentId,
      type: "보상",
      reward: selected,
      time: new Date().toISOString()
    }).then(() => {
      loadGameStats();
    });
  }, 4100);
}

createWheel();