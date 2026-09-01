/**
 * PhotoBannerSlideshow — full-width, edge-to-edge photo banner.
 */
export class PhotoBannerSlideshow {
  constructor(els, slides, options = {}) {
    this.els = els;
    this.slides = slides || [];
    this.intervalMs = options.intervalMs ?? 4500;
    this.index = 0;
    this.isPlaying = true;
    this.timer = null;

    if (!this.els?.slidesEl || this.slides.length === 0) return;

    this._build();
    this._wireEvents();
    if (this.slides.length > 1) {
      this._startTimer();
    }
  }

  _build() {
    this.els.slidesEl.innerHTML = this.slides
      .map((s, i) => `<img class="pb-slide${i === 0 ? ' active' : ''}" data-i="${i}" src="${s.image_url}" alt="${s.title || 'Banner'}">`)
      .join('');

    if (this.els.dotsEl) {
      this.els.dotsEl.innerHTML = this.slides
        .map((_, i) => `<button type="button" class="pb-dot${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Go to banner ${i + 1}" aria-selected="${i === 0}"></button>`)
        .join('');
    }

    this.slideEls = [...this.els.slidesEl.querySelectorAll('.pb-slide')];
    this.dotEls = this.els.dotsEl ? [...this.els.dotsEl.querySelectorAll('.pb-dot')] : [];
    
    if (this.slides.length > 1) {
      this._prefetch((this.index + 1) % this.slides.length);
    }
  }

  _wireEvents() {
    if (this.els.prevEl) {
      this.els.prevEl.addEventListener('click', () => { this.prev(); this._resetTimerIfPlaying(); });
    }
    if (this.els.nextEl) {
      this.els.nextEl.addEventListener('click', () => { this.next(); this._resetTimerIfPlaying(); });
    }
    this.dotEls.forEach(dot => {
      dot.addEventListener('click', () => { this.goTo(parseInt(dot.dataset.i, 10)); this._resetTimerIfPlaying(); });
    });
    
    if (this.els.playPauseEl) {
      this.els.playPauseEl.addEventListener('click', () => this._togglePlayPause());
    }

    const root = this.els.slidesEl.closest('.photo-banner');
    if (root) {
      root.tabIndex = 0;
      root.setAttribute('role', 'region');
      root.setAttribute('aria-roledescription', 'carousel');
      root.setAttribute('aria-label', 'Featured banners');
      root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { this.prev(); this._resetTimerIfPlaying(); }
        if (e.key === 'ArrowRight') { this.next(); this._resetTimerIfPlaying(); }
      });

      root.addEventListener('mouseenter', () => this._stopTimer());
      root.addEventListener('mouseleave', () => { if (this.isPlaying) this._startTimer(); });
      root.addEventListener('focusin', () => this._stopTimer());
      root.addEventListener('focusout', () => { if (this.isPlaying) this._startTimer(); });
    }
  }

  _togglePlayPause() {
    if (!this.els.playPauseEl) return;
    this.isPlaying = !this.isPlaying;
    this.els.playPauseEl.innerHTML = this.isPlaying ? '&#10073;&#10073;' : '&#9654;';
    this.els.playPauseEl.setAttribute('aria-label', this.isPlaying ? 'Pause slideshow' : 'Play slideshow');
    this.els.playPauseEl.setAttribute('aria-pressed', String(this.isPlaying));
    if (this.isPlaying) this._startTimer(); else this._stopTimer();
  }

  _startTimer() {
    this._stopTimer();
    if (this.slides.length > 1) this.timer = setInterval(() => this.next(), this.intervalMs);
  }

  _stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  _resetTimerIfPlaying() { if (this.isPlaying) this._startTimer(); }

  _prefetch(i) {
    if (!this.slides[i]?.image_url) return;
    const img = new Image();
    img.src = this.slides[i].image_url;
  }

  goTo(i) {
    if (!this.slideEls.length) return;
    this.slideEls[this.index]?.classList.remove('active');
    if (this.dotEls[this.index]) {
      this.dotEls[this.index].classList.remove('active');
      this.dotEls[this.index].setAttribute('aria-selected', 'false');
    }

    this.index = ((i % this.slides.length) + this.slides.length) % this.slides.length;

    this.slideEls[this.index]?.classList.add('active');
    if (this.dotEls[this.index]) {
      this.dotEls[this.index].classList.add('active');
      this.dotEls[this.index].setAttribute('aria-selected', 'true');
    }

    if (this.slides.length > 1) {
      this._prefetch((this.index + 1) % this.slides.length);
    }
  }

  next() { this.goTo(this.index + 1); }
  prev() { this.goTo(this.index - 1); }
}