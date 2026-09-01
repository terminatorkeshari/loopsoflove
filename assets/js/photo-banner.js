/**
 * PhotoBannerSlideshow — full-width, edge-to-edge luxury photo banner.
 * Supports rich overlays (eyebrow, title, subtitle, CTA button), 
 * mobile touch swipe gestures, responsive aspect ratios, and auto-play.
 */
export class PhotoBannerSlideshow {
  constructor(els, slides, options = {}) {
    this.els = els;
    this.slides = slides || [];
    this.intervalMs = options.intervalMs ?? 5000;
    this.index = 0;
    this.isPlaying = true;
    this.timer = null;
    this.touchStartX = 0;
    this.touchEndX = 0;

    if (!this.els?.slidesEl || this.slides.length === 0) return;

    this._build();
    this._wireEvents();
    if (this.slides.length > 1) {
      this._startTimer();
    }
  }

  _build() {
    this.els.slidesEl.innerHTML = this.slides
      .map((s, i) => {
        const hasOverlay = s.eyebrow || s.title || s.subtitle || s.cta_text;
        const ctaUrl = s.cta_url || '#shop';
        const ctaText = s.cta_text || 'Shop Collection';
        const preset = s.preset || 'image';
        const textAlign = s.text_align || 'left';
        const overlayColor = s.overlay_color || '#000000';
        const overlayOpacity = s.overlay_opacity !== undefined ? s.overlay_opacity : 0.35;
        const minHeightStyle = s.height_vh ? `min-height:${s.height_vh}vh;` : '';

        // Media Element (Image, Video, or Gradient)
        let mediaHtml = '';
        if (preset === 'gradient') {
          mediaHtml = `<div class="pb-slide-img" style="background:${s.gradient_css || 'linear-gradient(135deg, #3B2432 0%, #1A1118 100%)'}; width:100%; height:100%;"></div>`;
        } else if (preset === 'video' && s.video_url) {
          mediaHtml = `<video class="pb-slide-img" autoplay muted loop playsinline poster="${s.image_url || ''}"><source src="${s.video_url}" type="video/mp4"></video>`;
        } else {
          mediaHtml = `<img class="pb-slide-img" src="${s.image_url || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1600'}" alt="${s.title ? s.title.replace(/<[^>]+>/g, '') : 'Loops of Love Banner'}" loading="${i === 0 ? 'eager' : 'lazy'}">`;
        }

        // Overlay Style
        const overlayStyle = `background: ${overlayColor}; opacity: ${overlayOpacity};`;
        const alignmentClass = textAlign === 'center' ? ' text-center' : (textAlign === 'right' ? ' text-right' : '');
        const fontClass = s.font_size_preset === 'xl' ? ' pb-font-xl' : (s.font_size_preset === 'sm' ? ' pb-font-sm' : '');

        return `
          <div class="pb-slide${i === 0 ? ' active' : ''}${fontClass}" data-i="${i}" style="${minHeightStyle}">
            ${mediaHtml}
            <div class="pb-slide-overlay" style="${overlayStyle}"></div>
            ${hasOverlay ? `
              <div class="pb-slide-content">
                <div class="wrap">
                  <div class="pb-slide-inner${alignmentClass}">
                    ${s.eyebrow ? `<span class="pb-eyebrow">${s.eyebrow}</span>` : ''}
                    ${s.title ? `<h2 class="pb-title">${s.title}</h2>` : ''}
                    ${s.subtitle ? `<p class="pb-subtitle">${s.subtitle}</p>` : ''}
                    ${s.cta_text !== false && s.cta_text !== 'false' ? `<a href="${ctaUrl}" class="btn btn-gold pb-btn">${ctaText} <span class="arrow">&rarr;</span></a>` : ''}
                  </div>
                </div>
              </div>` : ''}
          </div>
        `;
      })
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

    // Touch / Swipe support for mobile
    const slidesEl = this.els.slidesEl;
    slidesEl.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
      this._stopTimer();
    }, { passive: true });

    slidesEl.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this._handleSwipe();
      if (this.isPlaying) this._startTimer();
    }, { passive: true });

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

  _handleSwipe() {
    const diff = this.touchEndX - this.touchStartX;
    const threshold = 40; // minimum distance to trigger swipe
    if (diff > threshold) {
      this.prev();
    } else if (diff < -threshold) {
      this.next();
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