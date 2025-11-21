const cardsEl = document.getElementById('cards');
const loaderEl = document.getElementById('loader');
const errorEl = document.getElementById('error');
const detailPane = document.getElementById('details');
const detailTitle = document.getElementById('details-title');
const detailBody = document.getElementById('details-body');
const filterButtons = document.querySelectorAll('.pill');

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
        <p class="eyebrow">${song.songId}</p>
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

function renderCards(songs) {
  cardsEl.innerHTML = '';
  songs.forEach((song) => cardsEl.appendChild(createCard(song)));
  cardsEl.hidden = false;
}

function renderDetailField(label, value) {
  const row = document.createElement('div');
  row.className = 'detail-row';
  row.innerHTML = `<span class="detail-label">${label}</span><span class="detail-value">${value || '—'}</span>`;
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

  return { artistName, releaseDate, language, ageRestriction, author, producer };
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
    detailBody.appendChild(renderDetailField('Исполнитель', data.artistName || song.artist));
    detailBody.appendChild(renderDetailField('Дата релиза', data.releaseDate));
    detailBody.appendChild(renderDetailField('Язык', data.language));
    detailBody.appendChild(renderDetailField('Возраст', data.ageRestriction));
    detailBody.appendChild(renderDetailField('Автор', data.author));
    detailBody.appendChild(renderDetailField('Автор инструментала', data.producer));
    detailBody.appendChild(renderDetailField('Страница редактирования', `<a href="${song.editHref}" target="_blank">Открыть</a>`));
  } catch (err) {
    detailBody.innerHTML = `<p class="error">${err.message}</p>`;
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

loadSongs();
