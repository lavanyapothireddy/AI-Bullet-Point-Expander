// ← Change this to your Render backend URL after deploying
const API_BASE = "https://your-backend.onrender.com";

const bulletInput = document.getElementById("bulletInput");
const toneSelect  = document.getElementById("toneSelect");
const lengthSelect = document.getElementById("lengthSelect");
const expandAllBtn = document.getElementById("expandAllBtn");
const resetBtn     = document.getElementById("resetBtn");
const resultsSection = document.getElementById("resultsSection");
const cardsList    = document.getElementById("cardsList");
const resultsCount = document.getElementById("resultsCount");

function parseBullets(text) {
  return text
    .split("\n")
    .map(l => l.replace(/^[\s•\-\*>·]+/, "").trim())
    .filter(Boolean);
}

function createCard(bullet, index) {
  const card = document.createElement("div");
  card.className = "bullet-card";
  card.dataset.bullet = bullet;

  card.innerHTML = `
    <div class="card-top">
      <span class="card-num">${index + 1}</span>
      <span class="card-bullet">• ${bullet}</span>
      <div class="card-actions">
        <button class="btn-sm expand-btn">Expand ↗</button>
      </div>
    </div>
    <div class="expanded-area" style="display:none;"></div>
  `;

  const expandBtn = card.querySelector(".expand-btn");
  const expandedArea = card.querySelector(".expanded-area");

  expandBtn.addEventListener("click", () => expandBullet(bullet, expandBtn, expandedArea));
  return card;
}

async function expandBullet(bullet, btn, area) {
  btn.disabled = true;
  btn.textContent = "Expanding…";
  area.style.display = "block";
  area.innerHTML = `<div class="expanded-box"><span class="cursor">▌</span></div>`;

  const box = area.querySelector(".expanded-box");
  const tone = toneSelect.value;
  const length = lengthSelect.value;

  try {
    const response = await fetch(`${API_BASE}/expand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bullet, tone, length }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Server error");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            fullText += parsed.text;
            box.innerHTML = fullText + '<span class="cursor">▌</span>';
          }
        } catch {}
      }
    }

    box.innerHTML = fullText;

    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy text";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(fullText).then(() => {
        copyBtn.textContent = "✓ Copied!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "Copy text";
          copyBtn.classList.remove("copied");
        }, 2000);
      });
    };
    area.appendChild(copyBtn);

    btn.textContent = "Re-expand ↻";
    btn.disabled = false;
    btn.classList.add("active");

  } catch (err) {
    box.innerHTML = `<span class="error-msg">${err.message}</span>`;
    btn.textContent = "Retry ↻";
    btn.disabled = false;
  }
}

expandAllBtn.addEventListener("click", () => {
  const bullets = parseBullets(bulletInput.value);
  if (!bullets.length) return;

  cardsList.innerHTML = "";
  resultsSection.classList.remove("hidden");
  resultsCount.textContent = `${bullets.length} BULLET${bullets.length !== 1 ? "S" : ""} · ${toneSelect.value.toUpperCase()} · ${lengthSelect.options[lengthSelect.selectedIndex].text.toUpperCase()}`;

  bullets.forEach((b, i) => {
    const card = createCard(b, i);
    cardsList.appendChild(card);
  });

  // Auto-expand all
  const cards = cardsList.querySelectorAll(".bullet-card");
  cards.forEach(card => {
    const btn = card.querySelector(".expand-btn");
    const area = card.querySelector(".expanded-area");
    expandBullet(card.dataset.bullet, btn, area);
  });
});

resetBtn.addEventListener("click", () => {
  bulletInput.value = "";
  cardsList.innerHTML = "";
  resultsSection.classList.add("hidden");
});
