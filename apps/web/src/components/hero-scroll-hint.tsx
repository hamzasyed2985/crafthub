'use client';

export function HeroScrollHint() {
  function scrollToContent() {
    document.getElementById('home-content')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      onClick={scrollToContent}
      className="group absolute bottom-6 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-2 border-0 bg-transparent p-2 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="Scroll to explore products and makers"
    >
      <span className="text-xs tracking-wide">New pieces · Makers · Crafts</span>
      <span className="hero-scroll-chevron" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
