(() => {
  'use strict';
  const programs = window.OUTCOMMS_WORKSHOP;
  const $ = (id) => document.getElementById(id);
  const compact = window.matchMedia('(max-width: 760px)');
  const positions = programs.map(() => 0);
  let selected = 0;
  let menuOpen = !compact.matches;
  const positionKey = 'outcomms-chatgpt-workshop.position.v1';

  function restorePosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(positionKey));
      if (!saved || typeof saved !== 'object') return;
      const programIndex = programs.findIndex(program => program.id === saved.program);
      if (programIndex >= 0) selected = programIndex;
      programs.forEach((program, index) => {
        const slide = saved.positions?.[program.id];
        if (Number.isInteger(slide) && slide >= 0) {
          positions[index] = Math.min(slide, program.slides.length - 1);
        }
      });
    } catch {
      // A blocked store or damaged saved value must not prevent opening the deck.
    }
  }

  function savePosition() {
    try {
      localStorage.setItem(positionKey, JSON.stringify({
        program: programs[selected].id,
        positions: Object.fromEntries(programs.map((program, index) => [program.id, positions[index]])),
      }));
    } catch {
      // Navigation remains available if the browser cannot save local data.
    }
  }

  function setMenu(open, restoreFocus = false) {
    menuOpen = open;
    if (!open && $('program-sidebar').contains(document.activeElement)) restoreFocus = true;
    $('program-sidebar').hidden = !open;
    $('app').classList.toggle('menu-hidden', !open);
    $('menu-toggle').setAttribute('aria-expanded', String(open));
    $('menu-toggle').setAttribute('aria-label', open ? 'Скрыть части' : 'Показать части');
    $('backdrop').hidden = !(open && compact.matches);
    if (restoreFocus) $('menu-toggle').focus();
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function render(direction = 0) {
    const program = programs[selected];
    const index = positions[selected];
    const slide = program.slides[index];
    $('program-number').textContent = `Часть ${String(selected + 1).padStart(2, '0')} / ${String(programs.length).padStart(2, '0')}`;
    $('program-title').textContent = program.title;
    document.title = `${program.title} — OUTCOMMS AI`;
    document.querySelectorAll('.program-button').forEach((button, i) => button.setAttribute('aria-current', String(i === selected)));
    const article = element('article', `deck-slide${slide.theme === 'light' ? ' deck-slide--light' : ''}${direction ? direction > 0 ? ' enter-right' : ' enter-left' : ''}`);
    if (slide.html) article.classList.add('deck-slide--lesson');
    if (slide.eyebrow) article.append(element('p', 'slide-kicker', slide.eyebrow));
    const heading = element('h2', 'deck-title', slide.title);
    if (slide.highlight && slide.title.endsWith(slide.highlight)) {
      heading.textContent = slide.title.slice(0, -slide.highlight.length);
      heading.append(element('span', 'title-highlight', slide.highlight));
    }
    heading.id = 'slide-title';
    article.append(heading);
    if (slide.lead) article.append(element('p', 'deck-lead', slide.lead));
    if (slide.tags?.length) {
      const tags = element('div', 'deck-tags');
      slide.tags.forEach((tag, i) => tags.append(element('span', ['tag', 'tag tag--blue', 'tag tag--mauve'][i % 3], tag)));
      article.append(tags);
    }
    if (slide.html) {
      const content = element('div', 'slide-content');
      content.innerHTML = slide.html;
      article.append(content);
    }
    $('stage').replaceChildren(article);
    $('stage').setAttribute('aria-labelledby', 'slide-title');
    $('stage').scrollTop = 0;
    $('slide-picker').replaceChildren(...program.slides.map((item, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = String(i + 1).padStart(2, '0');
      option.title = item.title;
      return option;
    }));
    $('slide-picker').value = String(index);
    $('slide-total').textContent = `из ${program.slides.length}`;
    $('previous').disabled = index === 0;
    $('next').disabled = index === program.slides.length - 1;
    $('announcement').textContent = `${program.title}. Слайд ${index + 1} из ${program.slides.length}: ${slide.title}`;
    savePosition();
  }

  function goTo(index) {
    const current = positions[selected];
    const next = Math.max(0, Math.min(programs[selected].slides.length - 1, index));
    if (current === next) return;
    positions[selected] = next;
    render(Math.sign(next - current));
  }

  programs.forEach((program, index) => {
    const button = element('button', 'program-button');
    button.type = 'button';
    button.append(element('span', 'program-index', String(index + 1).padStart(2, '0')), element('span', '', program.title));
    button.addEventListener('click', () => {
      selected = index;
      render();
      if (compact.matches) setMenu(false, true);
    });
    $('program-list').append(button);
  });

  $('menu-toggle').addEventListener('click', () => setMenu(!menuOpen));
  $('backdrop').addEventListener('click', () => setMenu(false, true));
  $('previous').addEventListener('click', () => goTo(positions[selected] - 1));
  $('next').addEventListener('click', () => goTo(positions[selected] + 1));
  $('slide-picker').addEventListener('change', (event) => goTo(Number(event.target.value)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuOpen) { setMenu(false, true); return; }
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable], audio, video, [role="slider"]')) return;
    if (compact.matches && menuOpen) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(positions[selected] + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  compact.addEventListener('change', () => setMenu(!compact.matches));
  restorePosition();
  // An explicit lecture link takes precedence over the last viewed program.
  const requested = /^#([a-z-]+)\/(\d+)$/.exec(location.hash);
  if (requested) {
    const index = programs.findIndex(program => program.id === requested[1]);
    if (index >= 0) {
      selected = index;
      positions[index] = Math.max(0, Math.min(programs[index].slides.length - 1, Number(requested[2]) - 1));
    }
  }
  setMenu(menuOpen);
  render();
})();
