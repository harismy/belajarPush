const el = (id) => document.getElementById(id);

const nameEl = el("name");
const roleEl = el("role");
const bioEl = el("bio");
const linksEl = el("links");
const skillsEl = el("skills");

const chatBox = el("chat-box");
const userInput = el("user-input");
const sendBtn = el("send-btn");

const form = el("guestbook-form");
const gbName = el("gb-name");
const gbMessage = el("gb-message");
const messagesList = el("messages-list");

// ---------- Helpers ----------
function addChatMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function renderLinks(links) {
  linksEl.innerHTML = "";
  links.forEach((item) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.className = "link-item";
    if (item.icon) {
      const icon = document.createElement("i");
      icon.className = `link-icon ${item.icon}`;
      icon.setAttribute("aria-hidden", "true");
      a.appendChild(icon);
    }
    const label = document.createElement("span");
    label.textContent = item.title;
    a.appendChild(label);
    linksEl.appendChild(a);
  });
}

function renderSkills(skills) {
  skillsEl.innerHTML = "";
  skills.forEach((s) => {
    const div = document.createElement("div");
    div.className = "chip";
    // tampilkan level kalau ada
    div.textContent = s.level ? `${s.name} (${s.level})` : s.name;
    skillsEl.appendChild(div);
  });
}

function renderMessages(messages) {
  messagesList.innerHTML = "";
  messages.slice().reverse().forEach((m) => {
    const card = document.createElement("div");
    card.className = "message-card";

    const who = document.createElement("p");
    who.className = "who";
    who.textContent = m.name;

    const text = document.createElement("p");
    text.className = "text";
    text.textContent = m.message;

    card.appendChild(who);
    card.appendChild(text);
    messagesList.appendChild(card);
  });
}

// ---------- API Calls ----------
async function loadProfile() {
  try {
    const res = await fetch("/profile");
    const json = await res.json();

    const p = json?.data?.profile;
    if (p) {
      nameEl.textContent = p.name || "Nama Kamu";
      roleEl.textContent = p.role || "";
      bioEl.textContent = p.bio || "";
    }

    const links = json?.data?.links || [];
    const skills = json?.data?.skills || [];

    renderLinks(links);
    renderSkills(skills);
  } catch (err) {
    console.log("Gagal load profile:", err);
  }
}

async function sendChat() {
  const text = userInput.value.trim();
  if (!text) return;

  addChatMessage("user", text);
  userInput.value = "";

  try {
    const res = await fetch(`/chat?prompt=${encodeURIComponent(text)}`);
    const json = await res.json();

    // backend lama mengembalikan message.content = response text
    let content = json?.message?.content ?? "Maaf, tidak ada jawaban.";

    // kalau response berupa JSON string {answer:"..."} coba parse
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.answer) content = parsed.answer;
    } catch (_) {}

    addChatMessage("bot", content);
  } catch (err) {
    addChatMessage("bot", "Maaf, server sedang bermasalah.");
    console.log(err);
  }
}

async function loadGuestbook() {
  try {
    const res = await fetch("/guestbook");
    const json = await res.json();
    renderMessages(json.data || []);
  } catch (err) {
    console.log("Gagal load guestbook:", err);
  }
}

async function submitGuestbook(e) {
  e.preventDefault();

  const name = gbName.value.trim();
  const message = gbMessage.value.trim();
  if (!name || !message) return;

  try {
    const res = await fetch("/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message }),
    });

    const json = await res.json();
    if (json.status === "success") {
      gbName.value = "";
      gbMessage.value = "";
      await loadGuestbook();
    }
  } catch (err) {
    console.log("Gagal kirim pesan:", err);
  }
}

// ---------- Events ----------
sendBtn.addEventListener("click", sendChat);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

form.addEventListener("submit", submitGuestbook);

// ---------- Init ----------
loadProfile();
loadGuestbook();
