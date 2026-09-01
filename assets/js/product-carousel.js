/**
 * ProductCarousel — one product visible at a time, fade transition.
 *
 * Behavior (per spec):
 *  - Static on load. No auto-advance until the user's first click
 *    anywhere in the carousel OR on an external "starter" element
 *    (e.g. the hero CTA — pass it as `externalStartEl`).
 *  - After that first click: autoplay begins, advancing every
 *    `intervalMs` (default 4000) with an opacity fade.
 *  - Controls: prev/next buttons, dot indicators, ←/→ keyboard nav,
 *    and a play/pause toggle button.
 *  - Autoplay pauses on hover or keyboard focus, resumes on
 *    mouseleave/blur (only if the user had started it).
 *  - Prefetches the next slide's image as soon as autoplay starts,
 *    and again after every advance.
 *  - All controls have aria-labels and are keyboard-focusable.
 */
export class ProductCarousel {
  /**
   * @param {HTMLElement} container - root element the carousel renders into
   * @param {Array<object>} slides - product objects
   * @param {(product: object) => string} renderSlide - returns inner HTML for one slide
   * @param {object} [options]
   * @param {number} [options.intervalMs=4000]
   * @param {number} [options.fadeMs=600]
   * @param {HTMLElement} [options.externalStartEl] - e.g. hero CTA; clicking it also starts autoplay
   * @param {(product: object) => string} [options.imageUrlOf] - used for prefetching
   */
  constructor(container, slides, renderSlide, options = {}) {
    this.container = container;
    this.slides = slides;
    this.renderSlide = renderSlide;
    this.intervalMs = options.intervalMs ?? 4000;
    this.fadeMs = options.fadeMs ?? 600;
    this.imageUrlOf = options.imageUrlOf ?? (() => null);

    this.index = 0;
    this.isPlaying = false;
    this.userInteracted = false;
    this.timer = null;
    this.hoverPaused = false;

    this._build();
    this._wireEvents();
    if (options.externalStartEl) {
      options.externalStartEl.addEventListener('click', () => this._startOnFirstInteraction());
    }
  }

  _build() {
    this.container.classList.add('pc-root');
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-roledescription', 'carousel');
    this.container.setAttribute('aria-label', 'Featured products');
    this.container.tabIndex = 0;

    this.container.innerHTML = `
      <div class="pc-track">
        ${this.slides.map((s, i) => `<div class="pc-slide${i === 0 ? ' active' : ''}" data-i="${i}">${this.renderSlide(s)}</div>`).join('')}
      </div>
      <button type="button" class="pc-arrow pc-prev" aria-label="Previous product">&#8249;</button>
      <button type="button" class="pc-arrow pc-next" aria-label="Next product">&#8250;</button>
      <button type="button" class="pc-playpause" aria-label="Pause autoplay" aria-pressed="false">&#10073;&#10073;</button>
      <div class="pc-dots" role="tablist" aria-label="Choose product slide">
        ${this.slides.map((_, i) => `<button type="button" class="pc-dot${i === 0 ? ' active' : ''}" data-i="${i}" role="tab" aria-label="Go to product ${i + 1}" aria-selected="${i === 0}"></button>`).join('')}
      </div>
    `;

    this.trackEl = this.container.querySelector('.pc-track');
    this.dotEls = [...this.container.querySelectorAll('.pc-dot')];
    this.playPauseEl = this.container.querySelector('.pc-playpause');
  }

  _wireEvents() {
    this.container.addEventListener('click', (e) => {
      // Dedicated controls handle their own logic below; a bare click
      // anywhere else in the carousel is the "first interaction" starter.
      if (e.target.closest('.pc-prev, .pc-next, .pc-dot, .pc-playpause')) return;
      this._startOnFirstInteraction();
    });

    this.container.querySelector('.pc-prev').addEventListener('click', () => {
      this._startOnFirstInteraction();
      this.prev();
    });
    this.container.querySelector('.pc-next').addEventListener('click', () => {
      this._startOnFirstInteraction();
      this.next();
    });
    this.dotEls.forEach(dot => {
      dot.addEventListener('click', () => {
        this._startOnFirstInteraction();
        this.goTo(parseInt(dot.dataset.i, 10));
      });
    });
    this.playPauseEl.addEventListener('click', () => this._togglePlayPause());

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { this._startOnFirstInteraction(); this.prev(); }
      if (e.key === 'ArrowRight') { this._startOnFirstInteraction(); this.next(); }
    });

    // Pause on hover / focus, resume on leave / blur
    this.container.addEventListener('mouseenter', () => { this.hoverPaused = true; this._stopTimer(); });
    this.container.addEventListener('mouseleave', () => { this.hoverPaused = false; if (this.isPlaying) this._startTimer(); });
    this.container.addEventListener('focusin', () => { this.hoverPaused = true; this._stopTimer(); });
    this.container.addEventListener('focusout', () => { this.hoverPaused = false; if (this.isPlaying) this._startTimer(); });
  }

  _startOnFirstInteraction() {
    if (this.userInteracted) return;
    this.userInteracted = true;
    this.isPlaying = true;
    this._setPlayPauseUI();
    this._prefetch((this.index + 1) % this.slides.length);
    if (!this.hoverPaused) this._startTimer();
  }

  _togglePlayPause() {
    this._startOnFirstInteraction(); // clicking pause before any other interaction still "starts" it, then immediately pauses
    this.isPlaying = !this.isPlaying;
    this._setPlayPauseUI();
    if (this.isPlaying && !this.hoverPaused) this._startTimer();
    else this._stopTimer();
  }

  _setPlayPauseUI() {
    this.playPauseEl.innerHTML = this.isPlaying ? '&#10073;&#10073;' : '&#9654;';
    this.playPauseEl.setAttribute('aria-label', this.isPlaying ? 'Pause autoplay' : 'Play autoplay');
    this.playPauseEl.setAttribute('aria-pressed', String(this.isPlaying));
  }

  _startTimer() {
    this._stopTimer();
    this.timer = setInterval(() => this.next(), this.intervalMs);
  }
  _stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  _prefetch(i) {
    const url = this.imageUrlOf(this.slides[i]);
    if (!url) return;
    const img = new Image();
    img.src = url;
  }

  goTo(i) {
    const prevSlideEl = this.trackEl.children[this.index];
    this.index = ((i % this.slides.length) + this.slides.length) % this.slides.length;
    const nextSlideEl = this.trackEl.children[this.index];

    prevSlideEl.classList.remove('active');
    nextSlideEl.classList.add('active');

    this.dotEls.forEach((d, idx) => {
      d.classList.toggle('active', idx === this.index);
      d.setAttribute('aria-selected', String(idx === this.index));
    });

    this._prefetch((this.index + 1) % this.slides.length);
  }

  next() { this.goTo(this.index + 1); }
  prev() { this.goTo(this.index - 1); }
}
