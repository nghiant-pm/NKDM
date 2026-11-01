/* ══════════════════════════════════════════════════════════════
   guide.js — PHẦN CHẠY hướng dẫn sử dụng (nội dung: guide-tours.js · trang giải thích: /guide.html).
   Chép từ YMLC (Documents\[1] Project\LC Vaccine\public\shared\guide.js, 31/10/2026), đổi cho Fin2:
   - Không phụ thuộc session.js/fb-config: index.html truyền vào { me, markSeen, menu, ready }.
   - Màu/cỡ chữ theo biến CSS của Fin2 (--fs-body, --surface-2…).
   - Nút ? đặt cạnh nút đổi giao diện; menu ghép thêm mục của app (Thiết lập sổ, Tài khoản, Đăng xuất).
   Tour tự chạy lần đầu: làm mờ nền, khoanh sáng đúng nút, bong bóng chữ. Điện thoại: thẻ ở đáy (hoặc đỉnh).
   Xem xong / Bỏ qua = đã xem: ghi members/{email}.guideSeen (markSeen) + nhớ trên máy.
   Tour chỉ khoanh / bấm thứ để XEM — không bao giờ bấm nút ghi dữ liệu.
   ══════════════════════════════════════════════════════════════ */
import { TOURS } from "/guide-tours.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isPhone = () => matchMedia("(max-width: 768px)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

const CSS = `
#tb-help{font-weight:500;font-size:16px;}
.gd-menu{position:fixed;z-index:1002;min-width:220px;display:grid;padding:4px;background:var(--surface);color:var(--text);
  border:1px solid var(--border);border-radius:var(--r-input);box-shadow:0 8px 24px rgba(0,0,0,.14);animation:gdIn .16s var(--ease);}
.gd-menu button,.gd-menu a{display:flex;align-items:center;min-height:40px;padding:0 12px;border:0;border-radius:6px;background:none;
  color:var(--text);font:inherit;font-size:var(--fs-body);text-align:left;text-decoration:none;cursor:pointer;}
.gd-menu button:hover,.gd-menu a:hover,.gd-menu button:focus-visible,.gd-menu a:focus-visible{background:var(--surface-2);outline:none;}
.gd-menu .gd-sep{height:1px;margin:4px 6px;background:var(--border);}

.gd-block{position:fixed;inset:0;z-index:1000;}
.gd-dim{position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.55);pointer-events:none;animation:gdFade .2s var(--ease);}
.gd-spot{position:fixed;z-index:1001;border-radius:10px;pointer-events:none;box-shadow:0 0 0 9999px rgba(15,23,42,.55),0 0 0 3px var(--brand);
  transition:top .25s var(--ease),left .25s var(--ease),width .25s var(--ease),height .25s var(--ease);}
.gd-tip{position:fixed;z-index:1002;width:min(340px,calc(100vw - 32px));display:grid;gap:8px;padding:16px 16px 12px;
  background:var(--surface);color:var(--text);border-radius:var(--r-modal);box-shadow:0 20px 60px rgba(0,0,0,.28);
  transition:top .25s var(--ease),left .25s var(--ease);}
.gd-tip:focus{outline:none;}
.gd-tip.enter{animation:gdIn .2s var(--ease);}
.gd-tip .gd-n{font-size:var(--fs-label);color:var(--text-muted);font-variant-numeric:tabular-nums;}
.gd-tip h2{margin:0;font-size:var(--fs-body);font-weight:500;}
.gd-tip p{margin:0;font-size:var(--fs-body);line-height:1.5;color:var(--text);}
.gd-tip .gd-foot{display:flex;align-items:center;gap:8px;margin-top:8px;}
.gd-tip .gd-foot .spacer{flex:1;}
.gd-tip .btn{min-height:36px;padding:0 14px;}
.gd-tip .btn.ghost{border-color:transparent;background:none;color:var(--text-muted);}
@keyframes gdIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
@keyframes gdFade{from{opacity:0;}to{opacity:1;}}
@media (max-width:768px){
  .gd-tip{left:0!important;right:0;width:100%;border-radius:var(--r-modal) var(--r-modal) 0 0;
    padding-bottom:calc(12px + env(safe-area-inset-bottom));transition:none;}
  .gd-tip.top{border-radius:0 0 var(--r-modal) var(--r-modal);padding-top:calc(16px + env(safe-area-inset-top));}
  .gd-tip .gd-foot .btn{flex:1;}
  .gd-tip .gd-foot .spacer{display:none;}
}
@media (prefers-reduced-motion:reduce){.gd-spot,.gd-tip{transition:none;}.gd-tip.enter,.gd-dim,.gd-menu{animation:none;}}`;

let OPT = null, running = null;

/* ── Đã xem: server (members.guideSeen) + nhớ trên máy ── */
const localKey = () => `gdSeen:${OPT.me.uid}`;
function localSeen(){ try { return JSON.parse(localStorage.getItem(localKey()) || "[]"); } catch(e){ return []; } }
const isSeen = (id) => !!OPT.me.guideSeen?.[id] || localSeen().includes(id);
function markSeen(id){
  try { localStorage.setItem(localKey(), JSON.stringify([...new Set([...localSeen(), id])])); } catch(e){}
  OPT.markSeen(id);   // lỗi mạng: máy này vẫn nhớ
}
const fill = (s) => String(s || "").replace(/\{name\}/g, OPT.me.name || "");

/* ══════════════ Nút ? + menu ══════════════ */
function mountButton(){
  if(document.getElementById("tb-help")) return;
  const b = document.createElement("button");
  b.className = "icon-btn";
  b.id = "tb-help";
  b.type = "button";
  b.setAttribute("aria-label", "Hướng dẫn sử dụng");
  b.setAttribute("aria-haspopup", "menu");
  b.setAttribute("aria-expanded", "false");
  b.textContent = "?";
  document.getElementById("theme-btn").before(b);
  b.onclick = () => (document.querySelector(".gd-menu") ? closeMenu() : openMenu(b));
}

function closeMenu(){
  document.querySelector(".gd-menu")?.remove();
  document.getElementById("tb-help")?.setAttribute("aria-expanded", "false");
  document.removeEventListener("pointerdown", outside, true);
}
function outside(e){ if(!e.target.closest(".gd-menu, #tb-help")) closeMenu(); }

function openMenu(btn){
  const extra = OPT.menu();
  const m = document.createElement("div");
  m.className = "gd-menu";
  m.setAttribute("role", "menu");
  m.innerHTML = [
    ...TOURS.map((t) => `<button role="menuitem" data-gd-run="${esc(t.id)}">Xem lại: ${esc(t.title)}</button>`),
    `<a role="menuitem" href="/guide.html" target="_blank" rel="noopener">Giải thích chiến thuật</a>`,
    ...extra.map((it, i) => (it.sep ? '<div class="gd-sep"></div>' : "") + `<button role="menuitem" data-gd-extra="${i}">${esc(it.label)}</button>`),
  ].join("");
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect();
  m.style.top = `${r.bottom + 6}px`;
  m.style.left = `${Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8))}px`;
  btn.setAttribute("aria-expanded", "true");
  m.querySelector('[role="menuitem"]').focus();
  m.onclick = (e) => {
    const it = e.target.closest("[data-gd-run],[data-gd-extra]");
    if(!it || it.tagName === "A"){ closeMenu(); return; }
    closeMenu();
    if(it.dataset.gdExtra) return extra[+it.dataset.gdExtra].run();
    run(TOURS.find((t) => t.id === it.dataset.gdRun));
  };
  m.onkeydown = (e) => {
    const items = [...m.querySelectorAll('[role="menuitem"]')], i = items.indexOf(document.activeElement);
    if(e.key === "Escape"){ e.preventDefault(); closeMenu(); btn.focus(); }
    if(e.key === "ArrowDown"){ e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if(e.key === "ArrowUp"){ e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  };
  setTimeout(() => document.addEventListener("pointerdown", outside, true));
}

/* ══════════════ Chạy tour ══════════════ */
/** Phần tử đang hiện thật (có kích thước) — không thì coi như không có. */
function shown(sel){
  const el = sel && document.querySelector(sel);
  if(!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" ? el : null;
}

/** Chờ sổ về lần đầu (tối đa 6 giây) rồi thêm một nhịp cho bảng vẽ xong. */
async function pageReady(){
  for(let i = 0; i < 30 && !OPT.ready(); i++) await sleep(200);
  await sleep(400);
}

export function runTour(id){ run(TOURS.find((t) => t.id === id)); }

function run(tour, startKey){
  if(!tour || running) return;
  const steps = tour.steps;
  let i = Math.max(0, startKey ? steps.findIndex((s) => s.key === startKey) : 0);
  const prevFocus = document.activeElement;
  const block = document.createElement("div"); block.className = "gd-block";
  const dim = document.createElement("div"); dim.className = "gd-dim";
  const spot = document.createElement("div"); spot.className = "gd-spot"; spot.hidden = true;
  const tip = document.createElement("div");
  tip.className = "gd-tip enter";
  tip.setAttribute("role", "dialog");
  tip.setAttribute("aria-modal", "true");
  tip.setAttribute("aria-labelledby", "gd-title");
  tip.tabIndex = -1;
  document.body.append(block, dim, spot, tip);
  let target = null, timer = 0, busy = false;

  function place(){
    target = steps[i].el ? shown(steps[i].el) : null;
    if(!target){ spot.hidden = true; dim.hidden = false; }
    else {
      const r = target.getBoundingClientRect(), pad = 6;
      Object.assign(spot.style, { top:`${r.top - pad}px`, left:`${r.left - pad}px`, width:`${r.width + pad * 2}px`, height:`${r.height + pad * 2}px` });
      spot.hidden = false; dim.hidden = true;
    }
    tip.classList.remove("top");
    if(isPhone()){
      // Điện thoại: thẻ ở đáy; nút cần chỉ nằm ở nửa dưới → thẻ lên đỉnh để không che.
      const low = target && target.getBoundingClientRect().top > innerHeight * 0.5;
      tip.classList.toggle("top", !!low);
      Object.assign(tip.style, low ? { top:"0px", bottom:"" } : { top:"", bottom:"0px" });
      return;
    }
    tip.style.bottom = "";
    const w = tip.offsetWidth, h = tip.offsetHeight, gap = 14;
    if(!target){
      Object.assign(tip.style, { top:`${Math.max(16, (innerHeight - h) / 2)}px`, left:`${(innerWidth - w) / 2}px` });
      return;
    }
    const r = target.getBoundingClientRect();
    let top, left = r.left + r.width / 2 - w / 2;
    if(r.bottom + gap + h < innerHeight - 8) top = r.bottom + gap;              // dưới
    else if(r.top - gap - h > 8) top = r.top - gap - h;                         // trên
    else {                                                                       // bên cạnh (phần tử cao như bảng mã)
      top = Math.min(Math.max(8, r.top), innerHeight - h - 8);
      left = r.left - gap - w > 8 ? r.left - gap - w : r.right + gap;
    }
    Object.assign(tip.style, { top:`${top}px`, left:`${Math.min(Math.max(8, left), innerWidth - w - 8)}px` });
  }

  async function show(n){
    if(busy) return;
    busy = true;
    i = n;
    const s = steps[i];
    // Bấm trước để XEM (đổi tab) — chờ trang vẽ lại.
    const clickEl = s.click ? document.querySelector(s.click) : null;
    if(clickEl){ clickEl.click(); await sleep(REDUCED ? 80 : 300); }
    const el = s.el ? shown(s.el) : null;
    if(el) el.scrollIntoView({ block:"nearest", behavior:"instant" });
    const last = i === steps.length - 1;
    const text = fill(el || !s.alt ? s.text : s.alt);
    tip.innerHTML = `<div class="gd-n">${esc(tour.title)} · ${i + 1}/${steps.length}</div>
      ${s.title ? `<h2 id="gd-title">${esc(fill(s.title))}</h2><p>${esc(text)}</p>` : `<p id="gd-title">${esc(text)}</p>`}
      <div class="gd-foot">
        ${last ? "" : '<button class="btn ghost" type="button" data-gd="skip">Bỏ qua</button>'}<span class="spacer"></span>
        ${i ? '<button class="btn" type="button" data-gd="back">Quay lại</button>' : ""}
        <button class="btn primary" type="button" data-gd="next">${last ? "Xong" : "Tiếp"}</button></div>`;
    place();
    if(!REDUCED){ tip.classList.remove("enter"); void tip.offsetWidth; tip.classList.add("enter"); }
    tip.querySelector('[data-gd="next"]').focus();
    busy = false;
  }

  function end(){
    clearInterval(timer);
    removeEventListener("resize", place);
    removeEventListener("scroll", place, true);
    document.removeEventListener("keydown", onKey, true);
    block.remove(); dim.remove(); spot.remove(); tip.remove();
    running = null;
    markSeen(tour.id);
    if(tour.done) document.querySelector(tour.done)?.click();   // trả về chỗ bắt đầu (VD tab Danh mục)
    if(prevFocus?.focus && document.contains(prevFocus)) prevFocus.focus();
  }

  function onKey(e){
    // Bắt trước trang — tour đang mở thì phím thuộc về tour.
    if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); return end(); }
    if(e.key === "ArrowRight"){ e.preventDefault(); e.stopPropagation(); return i < steps.length - 1 ? show(i + 1) : end(); }
    if(e.key === "ArrowLeft" && i){ e.preventDefault(); e.stopPropagation(); return show(i - 1); }
    if(e.key === "Tab"){   // giữ phím Tab trong bong bóng
      const f = [...tip.querySelectorAll("button")];
      if(!f.length) return;
      const k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }

  tip.onclick = (e) => {
    const b = e.target.closest("[data-gd]");
    if(!b) return;
    if(b.dataset.gd === "skip") return end();
    if(b.dataset.gd === "back") return show(i - 1);
    return i < steps.length - 1 ? show(i + 1) : end();
  };
  addEventListener("resize", place);
  addEventListener("scroll", place, true);
  document.addEventListener("keydown", onKey, true);
  timer = setInterval(() => { if(!busy) place(); }, 400);   // dữ liệu realtime vẽ lại → bám theo phần tử mới
  running = tour;
  show(i);
}

/** Gọi từ index.html sau khi đăng nhập. opts = { me:{uid,name,guideSeen}, markSeen(id), menu() → [{label, run, sep?}], ready() }. */
export async function initGuide(opts){
  OPT = opts;
  if(!document.getElementById("gd-css")){
    const st = document.createElement("style"); st.id = "gd-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  mountButton();
  await pageReady();
  // Tự chạy tour chưa xem (mỗi lần mở app tối đa 1 tour); đang mở popup thì thôi.
  const next = TOURS.find((t) => !isSeen(t.id));
  if(next && !document.querySelector("dialog[open]")) run(next);
}
