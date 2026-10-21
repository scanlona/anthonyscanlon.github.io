const name = "anthony scanlon.";
const typingDelays = [
  330, 470, 290, 420, 540, 360, 450, 690, 310, 500, 350, 460, 300, 560, 390, 650,
];
const typedName = document.querySelector("#typed-name");
const canvas = document.querySelector("#starfield");
const context = canvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const gallerySlides = document.querySelectorAll(".gallery-slide");
const cookieButton = document.querySelector("#cookie-button");
const cookieChomp = document.querySelector("#cookie-chomp");
const backgroundMusic = document.querySelector("#background-music");
const stars = [];
const connections = new Map();
const minimumSeparation = 30;
const pointer = { x: 0, y: 0, active: false };
let width = 0;
let height = 0;
let previousFrame = 0;

function typeName() {
  let index = 0;

  const typeNextCharacter = () => {
    index += 1;
    typedName.textContent = name.slice(0, index);

    if (index < name.length) {
      window.setTimeout(typeNextCharacter, typingDelays[index - 1]);
    }
  };

  window.setTimeout(typeNextCharacter, typingDelays[0]);
}

function createStars() {
  const count = Math.min(96, Math.max(32, Math.round((width * height) / 14000)));

  for (let index = 0; index < count; index += 1) {
    const direction = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 1.8;

    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      speed,
      nextTurn: 1200 + Math.random() * 4800,
      radius: 0.9 + Math.random() * 1.5,
      gravity: 0.5 + Math.random() * 1.3,
      glow: 0.035 + Math.random() * 0.075,
      highlight: 0,
    });
  }

  const order = stars.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  for (let index = 0; index + 1 < order.length; index += 2) {
    const first = order[index];
    const second = order[index + 1];
    connections.set(`${first}-${second}`, {
      pulsePeriod: 2.5 + Math.random() * 3.5,
      pulseDuration: 0.4 + Math.random() * 0.5,
      pulseOffset: Math.random() * 6,
      gravityStrength: 0.25 + Math.random() * 0.5,
    });
  }
}

function resizeCanvas() {
  const oldWidth = width;
  const oldHeight = height;
  width = window.innerWidth;
  height = window.innerHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  if (stars.length === 0) {
    createStars();
  } else {
    for (const star of stars) {
      star.x = oldWidth ? (star.x / oldWidth) * width : Math.random() * width;
      star.y = oldHeight ? (star.y / oldHeight) * height : Math.random() * height;
    }
  }

  resolveOverlaps();
}

function applyGravityAndRepulsion(delta, timestamp) {
  const time = timestamp / 1000;
  for (let first = 0; first < stars.length; first += 1) {
    for (let second = first + 1; second < stars.length; second += 1) {
      const star = stars[first];
      const other = stars[second];
      let dx = other.x - star.x;
      let dy = other.y - star.y;

      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < 1) continue;

      const distance = Math.sqrt(distanceSquared);
      const directionX = dx / distance;
      const directionY = dy / distance;
      let force = 0;

      if (distance < minimumSeparation) {
        force -= Math.min((minimumSeparation - distance) * 0.01, 0.15);
      }

      const pair = connections.get(`${first}-${second}`);
      if (pair && (time + pair.pulseOffset) % pair.pulsePeriod < pair.pulseDuration) {
        force += Math.min(
          (star.gravity * other.gravity * pair.gravityStrength) / (distance + 80),
          0.035,
        );
      }

      const forceX = directionX * force * delta;
      const forceY = directionY * force * delta;
      star.vx += forceX;
      star.vy += forceY;
      other.vx -= forceX;
      other.vy -= forceY;
    }
  }
}

function normalizeVelocity(star) {
  const currentSpeed = Math.hypot(star.vx, star.vy);
  if (currentSpeed === 0) {
    const direction = Math.random() * Math.PI * 2;
    star.vx = Math.cos(direction) * star.speed;
    star.vy = Math.sin(direction) * star.speed;
    return;
  }

  star.vx = (star.vx / currentSpeed) * star.speed;
  star.vy = (star.vy / currentSpeed) * star.speed;
}

function respawnStar(star, timestamp) {
  const side = Math.floor(Math.random() * 4);
  const edgeMargin = star.radius + 4;
  const spread = (Math.random() - 0.5) * (Math.PI / 2);
  let direction;

  if (side === 0) {
    star.x = -edgeMargin;
    star.y = Math.random() * height;
    direction = spread;
  } else if (side === 1) {
    star.x = width + edgeMargin;
    star.y = Math.random() * height;
    direction = Math.PI + spread;
  } else if (side === 2) {
    star.x = Math.random() * width;
    star.y = -edgeMargin;
    direction = Math.PI / 2 + spread;
  } else {
    star.x = Math.random() * width;
    star.y = height + edgeMargin;
    direction = -Math.PI / 2 + spread;
  }

  star.vx = Math.cos(direction) * star.speed;
  star.vy = Math.sin(direction) * star.speed;
  star.nextTurn = timestamp + 1200 + Math.random() * 4800;
}

function resolveOverlaps() {
  for (let pass = 0; pass < 4; pass += 1) {
    for (let first = 0; first < stars.length; first += 1) {
      for (let second = first + 1; second < stars.length; second += 1) {
        const star = stars[first];
        const other = stars[second];
        if (
          star.x < 0 || star.x > width || star.y < 0 || star.y > height ||
          other.x < 0 || other.x > width || other.y < 0 || other.y > height
        ) {
          continue;
        }

        let dx = other.x - star.x;
        let dy = other.y - star.y;

        const distance = Math.hypot(dx, dy);
        if (distance >= minimumSeparation) continue;

        const angle = distance < 0.001 ? Math.random() * Math.PI * 2 : 0;
        const directionX = distance < 0.001 ? Math.cos(angle) : dx / distance;
        const directionY = distance < 0.001 ? Math.sin(angle) : dy / distance;
        const overlap = (minimumSeparation - distance) / 2;

        star.x -= directionX * overlap;
        star.y -= directionY * overlap;
        other.x += directionX * overlap;
        other.y += directionY * overlap;
      }
    }
  }
}

function drawStars(delta, timestamp) {
  context.clearRect(0, 0, width, height);
  applyGravityAndRepulsion(delta, timestamp);

  for (const star of stars) {
    if (timestamp >= star.nextTurn) {
      const direction = Math.atan2(star.vy, star.vx) + (Math.random() - 0.5) * 0.8;
      star.vx = Math.cos(direction) * star.speed;
      star.vy = Math.sin(direction) * star.speed;
      star.nextTurn = timestamp + 1200 + Math.random() * 4800;
    }

    normalizeVelocity(star);
    star.x += star.vx * delta;
    star.y += star.vy * delta;
  }

  resolveOverlaps();

  for (const star of stars) {
    if (
      star.x < -star.radius * 2 || star.x > width + star.radius * 2 ||
      star.y < -star.radius * 2 || star.y > height + star.radius * 2
    ) {
      respawnStar(star, timestamp);
    }
  }

  for (const star of stars) {
    const speed = Math.hypot(star.vx, star.vy);
    const pointerDistance = pointer.active
      ? Math.hypot(pointer.x - star.x, pointer.y - star.y)
      : Infinity;
    const proximity = Math.max(0, 1 - pointerDistance / 150);
    const highlightTarget = proximity * proximity;
    star.highlight += (highlightTarget - star.highlight) * (1 - Math.pow(0.82, delta));
    const illumination = star.highlight;
    const tailLength = 12 + Math.min(speed * 8, 26);
    const tailX = star.x - (star.vx / Math.max(speed, 0.001)) * tailLength;
    const tailY = star.y - (star.vy / Math.max(speed, 0.001)) * tailLength;
    const tail = context.createLinearGradient(tailX, tailY, star.x, star.y);
    tail.addColorStop(0, "rgba(180, 207, 255, 0)");
    tail.addColorStop(1, `rgba(220, 235, 255, ${0.025 + star.glow * 0.2 + illumination * 0.42})`);
    context.strokeStyle = tail;
    context.lineWidth = Math.max(0.55, star.radius * (0.55 + illumination * 0.8));
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(star.x, star.y);
    context.stroke();

    const glow = star.radius * (3 + illumination * 7);
    const halo = context.createRadialGradient(star.x, star.y, 0, star.x, star.y, glow);
    halo.addColorStop(0, `rgba(255, 255, 255, ${star.glow + illumination * 0.55})`);
    halo.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = halo;
    context.beginPath();
    context.arc(star.x, star.y, glow, 0, Math.PI * 2);
    context.fill();

    const sphere = context.createRadialGradient(
      star.x - star.radius * 0.35,
      star.y - star.radius * 0.35,
      0,
      star.x,
      star.y,
      star.radius,
    );
    sphere.addColorStop(0, `rgba(255, 255, 255, ${0.18 + illumination * 0.72})`);
    sphere.addColorStop(1, `rgba(255, 255, 255, ${0.075 + illumination * 0.3})`);
    context.fillStyle = sphere;
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
}

function animate(timestamp) {
  const delta = Math.min((timestamp - (previousFrame || timestamp)) / 16.67, 2);
  previousFrame = timestamp;
  drawStars(delta, timestamp);

  if (!reducedMotion.matches) {
    window.requestAnimationFrame(animate);
  }
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
});
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});
window.requestAnimationFrame(animate);

if (reducedMotion.matches) {
  typedName.textContent = name;
} else {
  window.setTimeout(typeName, 500);
}

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    typedName.textContent = name;
    return;
  }

  previousFrame = 0;
  window.requestAnimationFrame(animate);
});

if (!reducedMotion.matches && gallerySlides.length > 1) {
  let activeSlide = 0;

  window.setInterval(() => {
    gallerySlides[activeSlide].classList.remove("is-active");
    activeSlide = (activeSlide + 1) % gallerySlides.length;
    gallerySlides[activeSlide].classList.add("is-active");
  }, 5000);
}

backgroundMusic.volume = 0.35;
let musicPlayAttempt;

function startBackgroundMusic() {
  if (!backgroundMusic.paused) return Promise.resolve(true);
  if (musicPlayAttempt) return musicPlayAttempt;

  musicPlayAttempt = backgroundMusic
    .play()
    .then(() => true)
    .catch((error) => {
      if (error.name !== "NotAllowedError" && error.name !== "AbortError") {
        console.error("Could not start background music.", error);
      }
      return false;
    })
    .finally(() => {
      musicPlayAttempt = undefined;
    });

  return musicPlayAttempt;
}

function resumeMusicAfterInteraction() {
  startBackgroundMusic().then((started) => {
    if (!started) return;

    document.removeEventListener("pointerdown", resumeMusicAfterInteraction);
    document.removeEventListener("keydown", resumeMusicAfterInteraction);
    document.removeEventListener("touchstart", resumeMusicAfterInteraction);
  });
}

document.addEventListener("pointerdown", resumeMusicAfterInteraction);
document.addEventListener("keydown", resumeMusicAfterInteraction);
document.addEventListener("touchstart", resumeMusicAfterInteraction);
backgroundMusic.addEventListener("canplay", startBackgroundMusic, { once: true });
startBackgroundMusic();

cookieButton.addEventListener("click", () => {
  if (cookieButton.hidden) return;

  cookieButton.hidden = true;
  document.body.classList.remove("cookie-shake");
  void document.body.offsetWidth;
  document.body.classList.add("cookie-shake");
  window.setTimeout(() => document.body.classList.remove("cookie-shake"), 450);
  window.setTimeout(() => {
    cookieButton.hidden = false;
  }, 7000);

  cookieChomp.currentTime = 0;
  cookieChomp.play().catch((error) => {
    console.error("Could not play the cookie sound effect.", error);
  });
});

cookieButton.addEventListener("click", () => {
  if (cookieButton.hidden) return;

  cookieButton.hidden = true;
  document.body.classList.remove("cookie-shake");
  void document.body.offsetWidth;
  document.body.classList.add("cookie-shake");
  window.setTimeout(() => document.body.classList.remove("cookie-shake"), 450);
  window.setTimeout(() => {
    cookieButton.hidden = false;
  }, 7000);

  cookieChomp.currentTime = 0;
  cookieChomp.play().catch((error) => {
    console.error("Could not play the cookie sound effect.", error);
  });
});
