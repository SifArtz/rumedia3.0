const endpoints = {
    premium: 'https://rumedia.io/media/admin-cp/manage-songs?check_pro=1',
    single: 'https://rumedia.io/media/admin-cp/manage-songs?check=1',
};

const modeSelect = document.getElementById('mode');
const reloadBtn = document.getElementById('reload');
const grid = document.getElementById('grid');
const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');
const cardTemplate = document.getElementById('card-template');

const updateStatus = (text, tone = 'info') => {
    statusText.textContent = text;
    statusPill.textContent = tone === 'error' ? 'Ошибка' : tone === 'ready' ? 'Готово' : 'Загрузка…';
    statusPill.style.background = tone === 'error'
        ? 'rgba(255,91,112,0.18)'
        : tone === 'ready'
            ? 'rgba(105,255,194,0.2)'
            : 'rgba(249,143,29,0.15)';
    statusPill.style.color = tone === 'error' ? '#ff8ba0' : '#ffd8a6';
};

async function fetchThroughProxy(url, options = {}) {
    const target = encodeURIComponent(url);
    const response = await fetch(`proxy.php?target=${target}`, options);
    if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
    }
    return response.text();
}

function parseSongRows(html) {
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const rows = Array.from(dom.querySelectorAll('tbody tr[id]'));
    return rows.map((row) => {
        const cover = row.querySelector('td:nth-child(2) img')?.src || '';
        const artist = row.querySelector('td:nth-child(3) a')?.textContent.trim() || '—';
        const titleCell = row.querySelector('td:nth-child(4)');
        const rawTitle = titleCell?.childNodes?.[0]?.textContent?.trim() || 'Без названия';
        const genre = row.querySelector('td:nth-child(5) b')?.textContent.trim() || '—';
        const uploaded = row.querySelector('td:nth-child(8)')?.textContent.trim() || '';
        const audioSrc = row.querySelector('audio source')?.src || '';
        const editLink = row.querySelector('a[href*="edit-track"]')?.href || '';

        const queueForm = row.querySelector('form input[name="add_queue"]');
        const userId = row.querySelector('input[name="user_id"]')?.value;
        const audioId = row.querySelector('input[name="audio_id"]')?.value;
        const songId = row.querySelector('input[name="song_id"]')?.value || row.id;

        return {
            cover,
            artist,
            title: rawTitle,
            genre,
            uploaded,
            audioSrc,
            editLink,
            queuePayload: queueForm ? { user_id: userId, audio_id: audioId, song_id: songId, add_queue: '1' } : null,
        };
    });
}

function parseEditPage(html) {
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const artistNames = Array.from(dom.querySelectorAll('#artists_list h4'))
        .map((el) => el.textContent.trim())
        .filter(Boolean);

    return {
        artistsList: artistNames.join(', ') || '—',
        releaseDate: dom.querySelector('#tags')?.value || '—',
        language: dom.querySelector('#language')?.value || '—',
        age: dom.querySelector('#age_restriction option:checked')?.textContent.trim() || '—',
        author: dom.querySelector('#written')?.value || '—',
        producer: dom.querySelector('#producer')?.value || '—',
    };
}

async function addToQueue(payload) {
    if (!payload) return;
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
    await fetch(`proxy.php?target=${encodeURIComponent(endpoints[modeSelect.value])}`, {
        method: 'POST',
        body: formData,
    });
}

async function render() {
    const mode = modeSelect.value;
    grid.innerHTML = '';
    updateStatus('Получаем список релизов…');

    try {
        const songsHtml = await fetchThroughProxy(endpoints[mode]);
        const songs = parseSongRows(songsHtml);
        updateStatus(`Найдено ${songs.length} релизов, подтягиваем детали…`);

        const enriched = await Promise.all(songs.map(async (song) => {
            if (!song.editLink) return song;
            try {
                const editHtml = await fetchThroughProxy(song.editLink);
                return { ...song, ...parseEditPage(editHtml) };
            } catch (error) {
                console.error('Edit fetch failed', error);
                return { ...song, artistsList: '—', releaseDate: '—', language: '—', age: '—', author: '—', producer: '—' };
            }
        }));

        if (!enriched.length) {
            updateStatus('Нет данных для отображения', 'ready');
            grid.innerHTML = '<p class="muted">Нет релизов.</p>';
            return;
        }

        enriched.forEach((song) => {
            const node = cardTemplate.content.cloneNode(true);
            node.querySelector('.card__cover').src = song.cover;
            node.querySelector('[data-field="uploaded"]').textContent = song.uploaded;
            node.querySelector('[data-field="title"]').textContent = song.title;
            node.querySelector('[data-field="artist"]').textContent = song.artistsList || song.artist;
            node.querySelector('[data-field="genre"]').textContent = song.genre;
            node.querySelector('[data-field="releaseDate"]').textContent = song.releaseDate || '—';
            node.querySelector('[data-field="language"]').textContent = song.language || '—';
            node.querySelector('[data-field="age"]').textContent = song.age || '—';
            node.querySelector('[data-field="author"]').textContent = song.author || '—';
            node.querySelector('[data-field="producer"]').textContent = song.producer || '—';

            const audio = node.querySelector('[data-field="player"]');
            if (song.audioSrc) {
                audio.src = song.audioSrc;
            } else {
                audio.replaceWith(document.createTextNode('Нет аудио'));
            }

            const editBtn = node.querySelector('[data-action="edit"]');
            if (song.editLink) editBtn.href = song.editLink; else editBtn.remove();

            const queueBtn = node.querySelector('[data-action="queue"]');
            if (song.queuePayload) {
                queueBtn.addEventListener('click', async () => {
                    queueBtn.textContent = 'Добавляем…';
                    queueBtn.disabled = true;
                    try {
                        await addToQueue(song.queuePayload);
                        queueBtn.textContent = 'В очереди';
                    } catch (error) {
                        queueBtn.textContent = 'Ошибка';
                        console.error(error);
                    }
                    setTimeout(() => {
                        queueBtn.textContent = 'Добавить в очередь';
                        queueBtn.disabled = false;
                    }, 1200);
                });
            } else {
                queueBtn.remove();
            }

            grid.appendChild(node);
        });

        updateStatus('Карточки загружены', 'ready');
    } catch (error) {
        console.error(error);
        updateStatus('Не удалось загрузить данные', 'error');
        grid.innerHTML = '<p class="muted">Ошибка загрузки. Проверьте cookie в proxy.php</p>';
    }
}

modeSelect.addEventListener('change', render);
reloadBtn.addEventListener('click', render);

render();
