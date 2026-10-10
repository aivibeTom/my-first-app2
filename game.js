const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const coinCount = document.querySelector("#coin-count");
const progressLabel = document.querySelector("#progress");
const message = document.querySelector("#game-message");
const messageTitle = document.querySelector("#message-title");
const messageDetail = document.querySelector("#message-detail");
const restartButton = document.querySelector("#restart");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WORLD_WIDTH = 3400;
const GRAVITY = 1900;
const MOVE_SPEED = 340;
const JUMP_SPEED = 720;

const platforms = [
  { x: 0, y: 470, w: 520, h: 100 },
  { x: 620, y: 470, w: 420, h: 100 },
  { x: 1110, y: 470, w: 430, h: 100 },
  { x: 1610, y: 470, w: 380, h: 100 },
  { x: 2070, y: 470, w: 520, h: 100 },
  { x: 2670, y: 470, w: 730, h: 100 },
  { x: 290, y: 370, w: 140, h: 18 },
  { x: 760, y: 350, w: 150, h: 18 },
  { x: 1260, y: 365, w: 150, h: 18 },
  { x: 1770, y: 345, w: 140, h: 18 },
  { x: 2250, y: 360, w: 160, h: 18 },
  { x: 2810, y: 350, w: 150, h: 18 },
];

const spikes = [
  { x: 440, y: 438, w: 48, h: 32 },
  { x: 900, y: 438, w: 48, h: 32 },
  { x: 1450, y: 438, w: 48, h: 32 },
  { x: 1900, y: 438, w: 48, h: 32 },
  { x: 2450, y: 438, w: 48, h: 32 },
  { x: 3150, y: 438, w: 48, h: 32 },
];

const coinSpots = [
  [350, 330], [810, 310], [1320, 325], [1820, 305],
  [2310, 320], [2860, 310], [1000, 405], [2540, 405],
];

const keys = new Set();
const heldControls = new Set();
const player = { x: 70, y: 428, w: 30, h: 42, vx: 0, vy: 0, grounded: false };
let coins = [];
let collected = 0;
let cameraX = 0;
let gameState = "playing";
let previousTime = 0;

function resetGame() {
  player.x = 70;
  player.y = 428;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  cameraX = 0;
  collected = 0;
  coins = coinSpots.map(([x, y]) => ({ x, y, collected: false }));
  gameState = "playing";
  message.hidden = true;
  updateHud();
}

function updateHud() {
  coinCount.textContent = `COINS  ${collected}`;
  progressLabel.textContent = `${Math.min(100, Math.floor((player.x / (WORLD_WIDTH - 100)) * 100))}%`;
}

function endGame(won) {
  gameState = won ? "won" : "lost";
  messageTitle.textContent = won ? "STAGE CLEAR!" : "TRY AGAIN";
  messageDetail.textContent = won
    ? `コイン ${collected} / ${coins.length} 枚`
    : "トゲに当たったか、足場から落ちてしまった！";
  message.hidden = false;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;
}

function isPressed(...codes) {
  return codes.some((code) => keys.has(code));
}

function update(dt) {
  if (gameState !== "playing") return;

  const left = isPressed("ArrowLeft", "KeyA") || heldControls.has("left");
  const right = isPressed("ArrowRight", "KeyD") || heldControls.has("right");
  const jumpPressed = isPressed("ArrowUp", "KeyW", "Space") || heldControls.has("jump");

  player.vx = (Number(right) - Number(left)) * MOVE_SPEED;
  if (jumpPressed && player.grounded) {
    player.vy = -JUMP_SPEED;
    player.grounded = false;
  }

  player.x += player.vx * dt;
  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.w, player.x));

  const previousBottom = player.y + player.h;
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  player.grounded = false;

  if (player.vy >= 0) {
    for (const platform of platforms) {
      const horizontalOverlap = player.x + player.w > platform.x &&
        player.x < platform.x + platform.w;
      const crossedTop = previousBottom <= platform.y &&
        player.y + player.h >= platform.y;
      if (horizontalOverlap && crossedTop) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.grounded = true;
        break;
      }
    }
  }

  for (const spike of spikes) {
    if (overlaps(player, spike)) {
      endGame(false);
      return;
    }
  }

  for (const coin of coins) {
    if (!coin.collected && overlaps(player, { x: coin.x - 11, y: coin.y - 11, w: 22, h: 22 })) {
      coin.collected = true;
      collected += 1;
    }
  }

  if (player.y > HEIGHT + 80) {
    endGame(false);
    return;
  }
  if (player.x >= WORLD_WIDTH - 100) {
    endGame(true);
  }

  cameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * 0.35));
  updateHud();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#72c8e2");
  sky.addColorStop(1, "#d0f0db");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgb(255 246 190 / 85%)";
  ctx.beginPath();
  ctx.arc(790 - cameraX * 0.08, 100, 38, 0, Math.PI * 2);
  ctx.fill();

  drawHills("#93d5bb", 380, 0.18, 140);
  drawHills("#62b99f", 430, 0.32, 180);
}

function drawHills(color, baseY, speed, spacing) {
  const offset = (cameraX * speed) % spacing;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = -spacing - offset; x <= WIDTH + spacing; x += spacing) {
    ctx.quadraticCurveTo(x + spacing / 2, baseY - 70, x + spacing, baseY);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawWorld() {
  ctx.save();
  ctx.translate(-cameraX, 0);

  for (const platform of platforms) {
    ctx.fillStyle = "#516c4d";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#80d36f";
    ctx.fillRect(platform.x, platform.y, platform.w, 9);
    ctx.fillStyle = "rgb(26 61 52 / 15%)";
    for (let x = platform.x + 16; x < platform.x + platform.w; x += 38) {
      ctx.fillRect(x, platform.y + 24, 4, 4);
    }
  }

  for (const spike of spikes) {
    ctx.fillStyle = "#e96561";
    ctx.beginPath();
    ctx.moveTo(spike.x, spike.y + spike.h);
    ctx.lineTo(spike.x + spike.w / 2, spike.y);
    ctx.lineTo(spike.x + spike.w, spike.y + spike.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff0d6";
    ctx.fillRect(spike.x + 22, spike.y + 20, 4, 7);
  }

  for (const coin of coins) {
    if (coin.collected) continue;
    ctx.fillStyle = "#ffd65a";
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff3ad";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#d9992c";
    ctx.fillRect(coin.x - 1, coin.y - 6, 2, 12);
  }

  drawGoal();
  drawPlayer();
  ctx.restore();
}

function drawGoal() {
  const goalX = WORLD_WIDTH - 120;
  ctx.fillStyle = "#f4f5e9";
  ctx.fillRect(goalX, 330, 7, 140);
  ctx.fillStyle = "#fa6e69";
  ctx.beginPath();
  ctx.moveTo(goalX + 7, 332);
  ctx.lineTo(goalX + 62, 350);
  ctx.lineTo(goalX + 7, 368);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const runBob = player.grounded && Math.abs(player.vx) > 0 ? Math.sin(performance.now() / 65) * 2 : 0;
  const x = player.x;
  const y = player.y + runBob;

  ctx.fillStyle = "rgb(26 48 69 / 20%)";
  ctx.beginPath();
  ctx.ellipse(x + player.w / 2, 470, 19, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f47755";
  ctx.fillRect(x + 4, y + 13, 23, 26);
  ctx.fillStyle = "#ffd3ad";
  ctx.fillRect(x + 7, y + 2, 19, 18);
  ctx.fillStyle = "#26394f";
  ctx.fillRect(x + 19, y + 8, 3, 4);
  ctx.fillStyle = "#f1c34e";
  ctx.fillRect(x, y + 13, 9, 5);
  ctx.fillStyle = "#29384b";
  ctx.fillRect(x + 5, y + 37, 9, 5);
  ctx.fillRect(x + 19, y + 37, 9, 5);
}

function render() {
  drawBackground();
  drawWorld();
}

function frame(timestamp) {
  const dt = Math.min((timestamp - previousTime) / 1000 || 0, 1 / 30);
  previousTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (event.code === "KeyR" && gameState !== "playing") resetGame();
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {
  keys.clear();
  heldControls.clear();
});

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    heldControls.add(control);
  });
  const release = () => heldControls.delete(control);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

restartButton.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(frame);
