const $ = s => document.querySelector(s);
const API = "https://api.lyrics.ovh";
const FALLBACK_COVER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#232326"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#b8ff5a" font-size="70">♪</text></svg>`);

let currentSong = null;
let previousView = "homeView";
const getStore = key => JSON.parse(localStorage.getItem(key) || "[]");
const setStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === id));
  document.querySelectorAll(".nav-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === id));
  if (id === "favoritesView") renderFavorites();
  window.scrollTo({top:0, behavior:"smooth"});
}
function normalizeSong(item) {
  const a = item.artist || {};
  const album = item.album || {};
  return {
    id: item.id || `${a.name || item.artist}-${item.title}`,
    title: item.title || "Unknown title",
    artist: a.name || item.artist || "Unknown artist",
    cover: album.cover_medium || album.cover || item.cover || FALLBACK_COVER
  };
}
function renderSongs(container, songs, emptyText) {
  container.innerHTML = "";
  container.classList.toggle("empty-state", !songs.length);
  if (!songs.length) { container.innerHTML = `<p>${emptyText}</p>`; return; }
  songs.forEach(song => {
    const node = $("#songTemplate").content.cloneNode(true);
    const btn = node.querySelector(".song-row");
    const img = node.querySelector(".cover");
    img.src = song.cover || FALLBACK_COVER; img.alt = `${song.title} cover`; img.onerror = () => img.src = FALLBACK_COVER;
    node.querySelector(".song-title").textContent = song.title;
    node.querySelector(".song-artist").textContent = song.artist;
    btn.addEventListener("click", () => openLyrics(song));
    container.appendChild(node);
  });
}
function setStatus(msg = "") {
  $("#status").textContent = msg;
  $("#status").classList.toggle("hidden", !msg);
}
async function searchSongs(query) {
  setStatus("Searching…");
  $("#resultsSection").classList.add("hidden");
  try {
    const res = await fetch(`${API}/suggest/${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const songs = (data.data || []).slice(0, 15).map(normalizeSong);
    renderSongs($("#results"), songs, "No songs found. Try another search.");
    $("#resultCount").textContent = `${songs.length} found`;
    $("#resultsSection").classList.remove("hidden");
    setStatus("");
  } catch {
    setStatus("Search could not connect. Check your internet connection and try again.");
  }
}
async function openLyrics(song) {
  currentSong = song;
  previousView = document.querySelector(".view.active")?.id || "homeView";
  $("#lyricsTitle").textContent = song.title;
  $("#lyricsArtist").textContent = song.artist;
  $("#lyricsCover").src = song.cover || FALLBACK_COVER;
  $("#lyricsText").textContent = "Loading lyrics…";
  updateHeart();
  addRecent(song);
  showView("lyricsView");
  try {
    const res = await fetch(`${API}/v1/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.title)}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    $("#lyricsText").textContent = data.lyrics?.trim() || "Lyrics were not found for this song.";
  } catch {
    $("#lyricsText").textContent = "Lyrics were not found for this song. Try another version or spelling.";
  }
}
function addRecent(song) {
  const items = getStore("lyricly_recent").filter(x => x.id !== song.id);
  items.unshift(song); setStore("lyricly_recent", items.slice(0,8)); renderRecent();
}
function renderRecent() {
  renderSongs($("#recentList"), getStore("lyricly_recent"), "Your recent songs will appear here.");
}
function renderFavorites() {
  renderSongs($("#favoritesList"), getStore("lyricly_favorites"), "Tap ♡ on a song to save it here.");
}
function isFavorite(song) { return getStore("lyricly_favorites").some(x => x.id === song?.id); }
function updateHeart() { $("#favoriteButton").textContent = isFavorite(currentSong) ? "♥" : "♡"; }
function toggleFavorite() {
  if (!currentSong) return;
  let favs = getStore("lyricly_favorites");
  favs = isFavorite(currentSong) ? favs.filter(x => x.id !== currentSong.id) : [currentSong, ...favs];
  setStore("lyricly_favorites", favs); updateHeart();
}
$("#searchForm").addEventListener("submit", e => {
  e.preventDefault(); const q = $("#searchInput").value.trim(); if (q) searchSongs(q);
});
$("#clearSearch").onclick = () => { $("#searchInput").value=""; $("#resultsSection").classList.add("hidden"); setStatus(""); $("#searchInput").focus(); };
$("#clearRecent").onclick = () => { setStore("lyricly_recent", []); renderRecent(); };
$("#favoriteButton").onclick = toggleFavorite;
$("#favoritesShortcut").onclick = () => showView("favoritesView");
$("#lyricsBack").onclick = () => showView(previousView === "lyricsView" ? "homeView" : previousView);
document.querySelectorAll("[data-back]").forEach(b => b.onclick = () => showView(b.dataset.back));
document.querySelectorAll(".nav-item[data-view]").forEach(b => b.onclick = () => showView(b.dataset.view));
$("#focusSearch").onclick = () => { showView("homeView"); setTimeout(() => $("#searchInput").focus(), 50); };
$("#copyLyrics").onclick = async () => {
  const text = $("#lyricsText").textContent;
  try { await navigator.clipboard.writeText(text); $("#copyLyrics").textContent="Copied"; setTimeout(()=>$("#copyLyrics").textContent="Copy",1200); } catch {}
};
renderRecent();

const donateModal = $("#donateModal");
$("#donateButton").onclick = () => donateModal.classList.remove("hidden");
$("#closeDonate").onclick = () => donateModal.classList.add("hidden");
donateModal.addEventListener("click", e => { if (e.target === donateModal) donateModal.classList.add("hidden"); });
$("#copyZelle").onclick = async () => {
  const number = $("#zelleNumber").textContent.trim();
  try {
    await navigator.clipboard.writeText(number);
    $("#copyZelle").textContent = "Copied ✓";
    setTimeout(() => $("#copyZelle").textContent = "Copy Zelle number", 1500);
  } catch {
    $("#copyZelle").textContent = number;
  }
};
