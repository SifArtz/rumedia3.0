const cardsEl = document.getElementById('cards');
const loaderEl = document.getElementById('loader');
const errorEl = document.getElementById('error');
const detailPane = document.getElementById('details');
const detailTitle = document.getElementById('details-title');
const detailBody = document.getElementById('details-body');
const filterButtons = document.querySelectorAll('.chip');

let currentType = 'premium';

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentType = btn.dataset.type;
    loadSongs();
  });
});

function extractText(node) {
  if (!node) return '';
  return node.textContent.trim().replace(/\s+/g, ' ');
}

function parseUserStats(text) {
  const sent = Number((text.match(/Отправлено:\s*(\d+)/i) || [])[1] || 0);
  const declined = Number((text.match(/Отклонено:\s*(\d+)/i) || [])[1] || 0);
  const removed = Number((text.match(/Снят\s*с\s*площадок:\s*(\d+)/i) || [])[1] || 0);
  return { sent, declined, removed };
}

function parseSongs(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = Array.from(doc.querySelectorAll('table tbody tr[id]'));

  return rows.map((row) => {
    const cells = row.querySelectorAll('td');
    const songId = row.getAttribute('id');
    const cover = row.querySelector('td:nth-child(2) img')?.src || '';
    const artistCell = cells[2];
    const artist = extractText(artistCell?.querySelector('a'));
    const artistBadge = /Премиум/i.test(artistCell?.textContent || '');
    const userStats = parseUserStats(artistCell?.textContent || '');
    const titleCell = cells[3];
    const titleText = titleCell ? extractText(titleCell.childNodes[0]) : '';
    const audioSrc = titleCell?.querySelector('audio source')?.src || '';
    const genre = extractText(cells[4]);
    const uploaded = extractText(cells[7]);
    const editHref = row.querySelector('a[href*="edit-track"]')?.href || '';
    const queueLabel = extractText(row.querySelector('input[type="submit"][name="add_queue"]')) || 'Добавить в очередь';

    const trackIdMatch = editHref.match(/edit-track\/([^/?#]+)/);
    const trackId = trackIdMatch ? trackIdMatch[1] : '';

    return {
      songId,
      cover,
      artist,
      artistBadge,
      title: titleText,
      genre,
      uploaded,
      audioSrc,
      editHref,
      trackId,
      queueLabel,
      userStats,
    };
  });
}

async function fetchSongs() {
  const res = await fetch(`proxy.php?type=${currentType}`);
  if (!res.ok) throw new Error('Не удалось загрузить список');
  return res.text();
}

function createCard(song) {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <span class="badge">${song.artistBadge ? 'Премиум' : 'Сингл'}</span>
    <img class="cover" src="${song.cover}" alt="${song.title}" />
    <div class="meta">
      <div>
        <p class="micro">ID ${song.songId}</p>
        <h3>${song.title}</h3>
        <p class="artist">${song.artist}</p>
      </div>
      <div class="actions">
        <span class="tag">${song.genre || 'Без жанра'}</span>
        <span class="tag">${song.uploaded}</span>
        <span class="tag primary">${song.queueLabel}</span>
      </div>
      ${song.audioSrc ? `<audio class="audio" controls src="${song.audioSrc}"></audio>` : ''}
    </div>
  `;
  card.addEventListener('click', () => showDetails(song));
  return card;
}

function field(label, value) {
  const row = document.createElement('div');
  row.className = 'field';
  row.innerHTML = `<span class="label">${label}</span><span class="value">${value || '—'}</span>`;
  return row;
}

async function fetchTrackDetails(trackId) {
  if (!trackId) return null;
  const res = await fetch(`proxy.php?type=track&track=${trackId}`);
  if (!res.ok) throw new Error('Не удалось загрузить детали трека');
  return res.text();
}

function parseTrackDetails(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const artistName = extractText(doc.querySelector('#artists_list h4'));
  const releaseDate = doc.querySelector('#tags')?.value || '';
  const language = doc.querySelector('#language')?.value || '';
  const ageRestriction = doc.querySelector('#age_restriction option:checked')?.textContent.trim() || '';
  const author = doc.querySelector('#written')?.value || '';
  const producer = doc.querySelector('#producer')?.value || '';
  const vocal = doc.querySelector('#vocal option:checked')?.textContent.trim() || '';

  return { artistName, releaseDate, language, ageRestriction, author, producer, vocal };
}

async function showDetails(song) {
  detailPane.hidden = false;
  detailTitle.textContent = song.title;
  detailBody.innerHTML = '<p class="muted">Загрузка сведений...</p>';

  try {
    const html = await fetchTrackDetails(song.trackId);
    if (!html) throw new Error('Нет ID трека для запроса');
    const data = parseTrackDetails(html);

    detailBody.innerHTML = '';

    const releaseSection = document.createElement('div');
    releaseSection.className = 'section';
    releaseSection.innerHTML = `
      <h4>Релиз</h4>
      <div class="field"><span class="label">Исполнитель</span><span class="value">${data.artistName || song.artist}</span></div>
      <div class="field"><span class="label">Дата</span><span class="value">${data.releaseDate}</span></div>
      <div class="field"><span class="label">Жанр</span><span class="value">${song.genre || '—'}</span></div>
      <div class="field"><span class="label">Статус</span><span class="value">${song.artistBadge ? 'Премиум' : 'Сингл'}</span></div>
    `;

    const vocalSection = document.createElement('div');
    vocalSection.className = 'section';
    vocalSection.innerHTML = `
      <h4>Вокал и язык</h4>
      <div class="field"><span class="label">Вокал</span><span class="value">${data.vocal}</span></div>
      <div class="field"><span class="label">Язык</span><span class="value">${data.language}</span></div>
      <div class="field"><span class="label">Возраст</span><span class="value">${data.ageRestriction}</span></div>
    `;

    const authorSection = document.createElement('div');
    authorSection.className = 'section';
    authorSection.innerHTML = `
      <h4>Авторы</h4>
      <div class="field"><span class="label">Автор текста</span><span class="value">${data.author}</span></div>
      <div class="field"><span class="label">Автор инструментала</span><span class="value">${data.producer}</span></div>
    `;

    const userSection = document.createElement('div');
    userSection.className = 'section';
    userSection.innerHTML = `
      <h4>Пользователь</h4>
      <div class="field"><span class="label">Ник</span><span class="value">${song.artist}</span></div>
      <div class="user-block">
        <div class="stat"><span>отправлено</span><strong>${song.userStats.sent}</strong></div>
        <div class="stat"><span>отклонено</span><strong>${song.userStats.declined}</strong></div>
        <div class="stat"><span>снят с площадок</span><strong>${song.userStats.removed}</strong></div>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'btn-row';
    actions.innerHTML = `
      <a class="btn" href="${song.editHref}" target="_blank">Редактировать</a>
      <button class="btn secondary" type="button" onclick="event.stopPropagation(); window.open('${song.audioSrc}', '_blank');">Аудио</button>
    `;

    detailBody.appendChild(releaseSection);
    detailBody.appendChild(vocalSection);
    detailBody.appendChild(authorSection);
    detailBody.appendChild(userSection);
    detailBody.appendChild(actions);
  } catch (err) {
    detailBody.innerHTML = `<p class="notice error">${err.message}</p>`;
  }
}

async function loadSongs() {
  loaderEl.hidden = false;
  cardsEl.hidden = true;
  errorEl.hidden = true;
  cardsEl.innerHTML = '';

  try {
    const html = await fetchSongs();
    const songs = parseSongs(html);
    renderCards(songs);
    if (songs.length === 0) {
      errorEl.hidden = false;
      errorEl.textContent = 'Пустой список.';
    }
  } catch (err) {
    errorEl.hidden = false;
    errorEl.textContent = err.message;
  } finally {
    loaderEl.hidden = true;
  }
}

function renderCards(songs) {
  cardsEl.innerHTML = '';
  songs.forEach((song) => cardsEl.appendChild(createCard(song)));
  cardsEl.hidden = false;
}

loadSongs();
