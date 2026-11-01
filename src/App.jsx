import { useState, useCallback, useRef, useEffect } from 'react';
import { PAGE_DATA } from './pageData';
import GameWorld from './GameWorld';
import PixelTransition from './PixelTransition';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [transitioning, setTransitioning] = useState(false);
  const pendingTarget = useRef(null);

  const handleNavigate = useCallback((target) => {
    if (target === currentPage || transitioning) return;
    if (!PAGE_DATA[target]) return;
    pendingTarget.current = target;
    setTransitioning(true);
  }, [currentPage, transitioning]);

  const handleMidTransition = useCallback(() => {
    if (pendingTarget.current) {
      setCurrentPage(pendingTarget.current);
    }
  }, []);

  const handleEndTransition = useCallback(() => {
    pendingTarget.current = null;
    setTransitioning(false);
  }, []);

  const transitioningRef = useRef(transitioning);
  transitioningRef.current = transitioning;

  // Also handle escape key to force-reset stuck transitions
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && transitioningRef.current) {
        handleEndTransition();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleEndTransition]);

  const pageData = PAGE_DATA[currentPage];
  if (!pageData) return null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white">
      <GameWorld
        pageData={pageData}
        onNavigate={handleNavigate}
        transitioning={transitioning}
      >
        <PageContent page={currentPage} />
      </GameWorld>

      {transitioning && (
        <PixelTransition
          onHalfway={handleMidTransition}
          onComplete={handleEndTransition}
        />
      )}
    </div>
  );
}

function PageContent({ page }) {
  switch (page) {
    case 'home': return <HomePage />;
    case 'about': return <AboutPage />;
    case 'music': return <MusicPage />;
    case 'projects': return <ProjectsPage />;
    case 'gallery': return <GalleryPage />;
    case 'contact': return <ContactPage />;
    default: return <HomePage />;
  }
}

function HomePage() {
  return (
    <>
      {/* Hero section */}
      <div className="absolute inset-x-0 flex flex-col items-center px-4" style={{ top: 250 }}>
        <div className="text-label text-[0.6rem] opacity-35 mb-4">PORTFOLIO 2026</div>
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black heading-xl text-center">AYDEN YANG</h1>
        <div className="w-[200px] divider mt-6 mb-4"></div>
        <p className="text-[0.7rem] sm:text-sm md:text-base tracking-[0.15em] opacity-40 text-center">SINGER · DEVELOPER · CREATOR</p>
      </div>

      {/* Photo placeholder */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block" style={{ top: 500 }}>
        <div className="photo-placeholder w-[160px] h-[160px] rounded-full">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/>
          </svg>
          <span className="text-[0.55rem] mt-2 tracking-[0.15em]">PHOTO</span>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute dot-grid opacity-25" style={{ top: 180, left: 50, width: 90, height: 90 }}></div>
      <div className="absolute dot-grid opacity-15" style={{ top: 380, right: 70, width: 70, height: 70 }}></div>
      <div className="absolute v-line opacity-15" style={{ top: 80, left: 100, height: 130 }}></div>
      <div className="absolute v-line opacity-15" style={{ top: 80, right: 100, height: 130 }}></div>

      {/* Explore divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 750 }}></div>
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: 790 }}>
        <p className="text-label text-[0.6rem] opacity-25 mb-8">EXPLORE</p>
      </div>

      {/* Decorative SVGs */}
      <svg className="absolute opacity-[0.03]" style={{ top: 280, right: 180 }} width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="45" stroke="white" fill="none" strokeWidth="0.5"/>
        <circle cx="55" cy="55" r="25" stroke="white" fill="none" strokeWidth="0.5"/>
      </svg>
      <svg className="absolute opacity-[0.03]" style={{ top: 850, left: 130 }} width="70" height="70" viewBox="0 0 70 70">
        <rect x="8" y="8" width="54" height="54" stroke="white" fill="none" strokeWidth="0.5" transform="rotate(45 35 35)"/>
      </svg>
    </>
  );
}

function AboutPage() {
  return (
    <>
      {/* Header */}
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: 100 }}>
        <div className="text-label text-[0.55rem] opacity-30 mb-2">001</div>
        <h2 className="text-5xl font-bold heading-lg">ABOUT</h2>
        <div className="w-[120px] divider mt-4"></div>
      </div>

      {/* Headshot */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 260 }}>
        <div className="photo-placeholder w-[200px] h-[240px]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/>
          </svg>
          <span className="text-[0.55rem] mt-2 tracking-[0.15em]">HEADSHOT</span>
        </div>
      </div>

      {/* Bio */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 560, width: 'min(480px, 84vw)' }}>
        <div className="text-center">
          <p className="text-sm leading-relaxed opacity-50">
            Ayden Yang is an 8th grader at St. Mark's School of Texas in Dallas.
            An avid singer since age 6, he currently serves as Head Chorister
            of the St. Mark's Choir. His musical journey has taken him from
            the Dallas Opera to stages at the Sydney Opera House and Carnegie Hall.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 780 }}></div>

      {/* Achievements */}
      <div className="absolute" style={{ left: '8%', top: 840 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">ACHIEVEMENTS</p>
        <div className="space-y-4" style={{ width: 'min(380px, 84vw)' }}>
          <div className="timeline-item">
            <p className="text-sm font-medium">Texas Young Master</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">2026 — Statewide recognition for musical excellence</p>
          </div>
          <div className="timeline-item">
            <p className="text-sm font-medium">Protege First Place Winner</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">2025 — National competition</p>
          </div>
          <div className="timeline-item">
            <p className="text-sm font-medium">Head Chorister</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">St. Mark's School of Texas Choir</p>
          </div>
          <div className="timeline-item">
            <p className="text-sm font-medium">Dallas Opera — The Little Prince</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">Title role performance</p>
          </div>
          <div className="timeline-item">
            <p className="text-sm font-medium">Sydney Opera House</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">International performance venue</p>
          </div>
          <div className="timeline-item">
            <p className="text-sm font-medium">Carnegie Hall</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">New York performance venue</p>
          </div>
        </div>
      </div>

      {/* Performance photo */}
      <div className="absolute hidden md:block" style={{ right: '8%', top: 840 }}>
        <div className="photo-placeholder w-[220px] h-[160px]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
          <span className="text-[0.5rem] mt-1 tracking-[0.12em]">PERFORMANCE PHOTO</span>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 1300 }}></div>

      {/* Interests */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1360 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">INTERESTS</p>
        <div className="flex gap-3 flex-wrap" style={{ width: 'min(420px, 84vw)' }}>
          <div className="card px-4 py-2 text-[0.65rem] tracking-wider opacity-60">CLASSICAL VOICE</div>
          <div className="card px-4 py-2 text-[0.65rem] tracking-wider opacity-60">WEB DEVELOPMENT</div>
          <div className="card px-4 py-2 text-[0.65rem] tracking-wider opacity-60">REACT</div>
          <div className="card px-4 py-2 text-[0.65rem] tracking-wider opacity-60">MUSIC THEORY</div>
          <div className="card px-4 py-2 text-[0.65rem] tracking-wider opacity-60">PRODUCT DESIGN</div>
          <div className="card px-4 py-2 text-[0.65rem] tracking-wider opacity-60">LEADERSHIP</div>
        </div>
      </div>

      {/* Photos */}
      <div className="absolute" style={{ left: '8%', top: 1600 }}>
        <div className="photo-placeholder h-[140px]" style={{ width: 'min(200px, 40vw)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
          <span className="text-[0.5rem] mt-1 tracking-[0.12em]">SCHOOL PHOTO</span>
        </div>
      </div>
      <div className="absolute" style={{ right: '8%', top: 1600 }}>
        <div className="photo-placeholder h-[140px]" style={{ width: 'min(200px, 40vw)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
          <span className="text-[0.5rem] mt-1 tracking-[0.12em]">AWARDS PHOTO</span>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 1820 }}></div>

      {/* Education */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1880 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">EDUCATION</p>
        <div className="text-center" style={{ width: 'min(400px, 84vw)' }}>
          <p className="text-sm font-medium">St. Mark's School of Texas</p>
          <p className="text-[0.65rem] opacity-40 mt-1">Dallas, TX — 8th Grade</p>
          <div className="h-line w-[60px] mx-auto my-3"></div>
          <p className="text-[0.65rem] opacity-35">
            Active in choir, music programs, and technology clubs.
            Pursuing interests in both performing arts and software development.
          </p>
        </div>
      </div>

      {/* Decorative */}
      <svg className="absolute opacity-[0.03]" style={{ top: 200, left: 60 }} width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="25" stroke="white" fill="none" strokeWidth="0.5"/>
      </svg>
    </>
  );
}

function MusicPage() {
  return (
    <>
      {/* Header */}
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: 100 }}>
        <div className="text-label text-[0.55rem] opacity-30 mb-2">002</div>
        <h2 className="text-5xl font-bold heading-lg">MUSIC</h2>
        <div className="w-[120px] divider mt-4"></div>
      </div>

      {/* Featured performance photo */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 260 }}>
        <div className="photo-placeholder h-[200px]" style={{ width: 'min(320px, 84vw)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <span className="text-[0.6rem] mt-2 tracking-[0.15em]">FEATURED PERFORMANCE PHOTO</span>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 520 }}></div>

      {/* Voice & Training */}
      <div className="absolute" style={{ left: '8%', top: 580 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">VOICE &amp; TRAINING</p>
        <div className="space-y-3" style={{ width: 300 }}>
          <div className="card p-3">
            <p className="text-xs font-medium">Voice Type</p>
            <p className="text-[0.6rem] opacity-40 mt-1">Treble / Boy Soprano</p>
          </div>
          <div className="card p-3">
            <p className="text-xs font-medium">Training Since</p>
            <p className="text-[0.6rem] opacity-40 mt-1">Age 6 — Over 8 years of vocal training</p>
          </div>
          <div className="card p-3">
            <p className="text-xs font-medium">Current Role</p>
            <p className="text-[0.6rem] opacity-40 mt-1">Head Chorister, St. Mark's Choir</p>
          </div>
          <div className="card p-3">
            <p className="text-xs font-medium">Repertoire</p>
            <p className="text-[0.6rem] opacity-40 mt-1">Classical, Opera, Sacred Music, Contemporary</p>
          </div>
        </div>
      </div>

      {/* Choir photo */}
      <div className="absolute hidden md:block" style={{ right: '8%', top: 580 }}>
        <div className="photo-placeholder w-[200px] h-[180px]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
          <span className="text-[0.5rem] mt-1 tracking-[0.12em]">CHOIR PHOTO</span>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 900 }}></div>

      {/* Notable performances */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 960 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">NOTABLE PERFORMANCES</p>
      </div>

      {/* Performance cards */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col lg:flex-row lg:flex-wrap lg:justify-center gap-4"
        style={{ top: 1040, width: 'min(832px, calc(100vw - 2rem))' }}
      >
        {[
          { title: 'The Little Prince — Title Role', venue: 'Dallas Opera', desc: 'Performed the lead role in this operatic adaptation' },
          { title: 'Sydney Opera House', venue: 'International Performance', desc: "Performed at one of the world's most iconic venues" },
          { title: 'Carnegie Hall', venue: 'New York City', desc: 'Performance at the legendary concert hall' },
        ].map((perf, i) => (
          <div key={i} className="card p-3 sm:p-4 w-full lg:w-[400px]">
            <div className="flex items-start gap-3">
              <div className="photo-placeholder w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">{perf.title}</p>
                <p className="text-[0.6rem] opacity-40 mt-1">{perf.venue}</p>
                <p className="text-[0.6rem] opacity-30 mt-1">{perf.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 1420 }}></div>

      {/* Competitions & Awards */}
      <div className="absolute" style={{ left: '8%', top: 1480 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">COMPETITIONS &amp; AWARDS</p>
        <div className="space-y-4" style={{ width: 'min(380px, 84vw)' }}>
          <div className="timeline-item">
            <p className="text-sm font-medium">Texas Young Master</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">2026</p>
          </div>
          <div className="timeline-item">
            <p className="text-sm font-medium">Protege First Place Winner</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">2025 — National competition</p>
          </div>
          <div className="timeline-item">
            <p className="text-sm font-medium">Additional Competition</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">Placeholder for future achievements</p>
          </div>
          <div className="timeline-item">
            <p className="text-sm font-medium">Additional Competition</p>
            <p className="text-[0.65rem] opacity-40 mt-0.5">Placeholder for future achievements</p>
          </div>
        </div>
      </div>

      {/* Award ceremony photo */}
      <div className="absolute hidden md:block" style={{ right: '8%', top: 1480 }}>
        <div className="photo-placeholder w-[220px] h-[200px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
          <span className="text-[0.5rem] mt-2 tracking-[0.12em]">AWARD CEREMONY</span>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 1800 }}></div>

      {/* Gallery */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1860 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">GALLERY</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3" style={{ width: 'min(420px, 84vw)' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="photo-placeholder w-full h-[72px] sm:h-[100px]">
              <span className="text-[0.45rem] tracking-[0.1em]">PHOTO</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 2140 }}></div>

      {/* Upcoming performances */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 2180 }}>
        <div className="text-center" style={{ width: 'min(480px, 84vw)' }}>
          <p className="text-label text-[0.6rem] opacity-30 mb-3">UPCOMING PERFORMANCES</p>
          <div className="card p-4">
            <p className="text-sm opacity-50">Details about upcoming shows and performances will appear here.</p>
            <p className="text-[0.6rem] opacity-30 mt-2">Check back for updates.</p>
          </div>
        </div>
      </div>

      {/* Decorative */}
      <svg className="absolute opacity-[0.03]" style={{ top: 160, right: 100 }} width="80" height="80" viewBox="0 0 80 80">
        <path d="M40 5 L75 40 L40 75 L5 40 Z" stroke="white" fill="none" strokeWidth="0.5"/>
      </svg>
    </>
  );
}

function ProjectsPage() {
  return (
    <>
      {/* Header */}
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: 100 }}>
        <div className="text-label text-[0.55rem] opacity-30 mb-2">003</div>
        <h2 className="text-5xl font-bold heading-lg">PROJECTS</h2>
        <div className="w-[120px] divider mt-4"></div>
      </div>

      {/* Featured project */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 260 }}>
        <div className="card p-5" style={{ width: 'min(500px, 84vw)' }}>
          <div className="photo-placeholder w-full h-[110px] sm:h-[160px] mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
            <span className="text-[0.55rem] mt-2 tracking-[0.15em]">APP SCREENSHOT</span>
          </div>
          <p className="text-label text-[0.55rem] opacity-40 mb-1">FEATURED PROJECT</p>
          <h3 className="text-xl font-bold">Phermata</h3>
          <p className="text-[0.65rem] opacity-40 mt-1">Music Theory Application</p>
          <div className="divider-sm w-full my-3"></div>
          <p className="text-xs opacity-50 leading-relaxed">
            A music theory app built with React. Phermata helps users learn
            and practice music theory concepts through interactive exercises
            and visual tools. Founded and managed as project lead.
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <div className="card px-3 py-1 text-[0.55rem] tracking-wider opacity-50">REACT</div>
            <div className="card px-3 py-1 text-[0.55rem] tracking-wider opacity-50">MUSIC THEORY</div>
            <div className="card px-3 py-1 text-[0.55rem] tracking-wider opacity-50">UI/UX</div>
            <div className="card px-3 py-1 text-[0.55rem] tracking-wider opacity-50">PRODUCT MANAGEMENT</div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 660 }}></div>

      {/* More projects */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 720 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">MORE PROJECTS COMING SOON</p>
      </div>

      {/* Project cards */}
      <div
        className="absolute left-1/2 -translate-x-1/2 grid grid-cols-2 lg:flex lg:flex-wrap lg:justify-center gap-4"
        style={{ top: 800, width: 'min(760px, calc(100vw - 2rem))' }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 w-full lg:w-[280px]">
            <div className="photo-placeholder w-full h-[72px] sm:h-[100px] mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span className="text-[0.5rem] mt-1 tracking-[0.1em]">PROJECT IMAGE</span>
            </div>
            <h4 className="text-sm font-medium">Project Placeholder</h4>
            <p className="text-[0.6rem] opacity-40 mt-1">Description of future project will go here.</p>
            <div className="flex gap-1.5 mt-2">
              <div className="card px-2 py-0.5 text-[0.5rem] tracking-wider opacity-40">TECH</div>
              <div className="card px-2 py-0.5 text-[0.5rem] tracking-wider opacity-40">MORE</div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 1540 }}></div>

      {/* Tech stack */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1600 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">TECH STACK</p>
        <div className="grid grid-cols-3 gap-3" style={{ width: 'min(360px, 84vw)' }}>
          {[
            ['React', 'Frontend'],
            ['JavaScript', 'Language'],
            ['Tailwind', 'Styling'],
            ['Git', 'Version Control'],
            ['Node.js', 'Runtime'],
            ['Figma', 'Design'],
          ].map(([name, desc], i) => (
            <div key={i} className="card p-3 text-center">
              <p className="text-xs font-medium">{name}</p>
              <p className="text-[0.55rem] opacity-35 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 1860 }}></div>

      {/* Workspace photo */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1920 }}>
        <div className="photo-placeholder w-[260px] h-[180px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          <span className="text-[0.55rem] mt-2 tracking-[0.12em]">WORKSPACE / SETUP PHOTO</span>
        </div>
      </div>

      {/* Decorative */}
      <svg className="absolute opacity-[0.03]" style={{ top: 140, left: 80 }} width="60" height="60" viewBox="0 0 60 60">
        <polyline points="30,5 55,30 30,55 5,30" stroke="white" fill="none" strokeWidth="0.5"/>
      </svg>
    </>
  );
}

function GalleryPage() {
  return (
    <>
      {/* Header */}
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: 100 }}>
        <div className="text-label text-[0.55rem] opacity-30 mb-2">004</div>
        <h2 className="text-5xl font-bold heading-lg">GALLERY</h2>
        <div className="w-[120px] divider mt-4"></div>
      </div>

      {/* Performances */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 320 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">PERFORMANCES &amp; MOMENTS</p>
        <div className="grid grid-cols-3 gap-3" style={{ width: 'min(540px, 84vw)' }}>
          {[
            'OPERA PERFORMANCE', 'CARNEGIE HALL', 'SYDNEY OPERA HOUSE',
            'CHOIR PERFORMANCE', 'AWARD CEREMONY', 'BACKSTAGE',
          ].map((label, i) => (
            <div key={i} className="photo-placeholder w-full h-[110px] sm:h-[130px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
              </svg>
              <span className="text-[0.45rem] mt-1 tracking-[0.1em]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 640 }}></div>

      {/* Behind the scenes */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 660 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">BEHIND THE SCENES</p>
        <div className="grid grid-cols-4 gap-3" style={{ width: 'min(720px, 84vw)' }}>
          {[
            'REHEARSAL', 'SOUND CHECK', 'VOCAL COACH', 'TRAVEL',
            'WARM UP', 'WITH CAST', 'STAGE VIEW', 'POST SHOW',
          ].map((label, i) => (
            <div key={i} className="photo-placeholder w-full h-[90px] sm:h-[120px]">
              <span className="text-[0.45rem] tracking-[0.1em]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 980 }}></div>

      {/* Portraits */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1000 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">PORTRAITS</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-4" style={{ width: 'min(512px, 84vw)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="photo-placeholder w-full h-[160px] sm:h-[200px]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/>
              </svg>
              <span className="text-[0.5rem] mt-1 tracking-[0.1em]">PORTRAIT {String(i).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 1300 }}></div>

      {/* Development & Tech */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1360 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">DEVELOPMENT &amp; TECH</p>
        <div className="grid grid-cols-3 gap-3" style={{ width: 'min(540px, 84vw)' }}>
          {['PHERMATA SCREENSHOT', 'CODE WORKSPACE', 'DESIGN MOCKUP'].map((label, i) => (
            <div key={i} className="photo-placeholder w-full h-[110px] sm:h-[130px]">
              <span className="text-[0.45rem] tracking-[0.1em]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 1640 }}></div>

      {/* School & Life */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1700 }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">SCHOOL &amp; LIFE</p>
        <div className="grid grid-cols-2 gap-3" style={{ width: 'min(360px, 84vw)' }}>
          {['CAMPUS', 'WITH FRIENDS', 'EVENTS', 'EVERYDAY'].map((label, i) => (
            <div key={i} className="photo-placeholder w-full h-[120px] sm:h-[140px]">
              <span className="text-[0.45rem] tracking-[0.1em]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative */}
      <svg className="absolute opacity-[0.03]" style={{ top: 120, right: 60 }} width="70" height="70" viewBox="0 0 70 70">
        <rect x="5" y="5" width="60" height="60" stroke="white" fill="none" strokeWidth="0.5"/>
      </svg>
    </>
  );
}

const CONTACT_EMAIL = 'hello@aydenyang.com';

/** Opens the visitor's mail client with a pre-filled message to CONTACT_EMAIL. */
function MessageForm() {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const subject = `Message from ${name.trim() || 'your website'}`;
    const body = `${message.trim()}\n\n— ${name.trim()}${from.trim() ? ` (${from.trim()})` : ''}`;
    window.location.href =
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const field =
    'w-full bg-transparent border border-white/15 rounded px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-white/50';

  return (
    <form className="card p-5 w-full" onSubmit={submit} data-no-game-click>
      <div className="space-y-3">
        <label className="block">
          <span className="block text-[0.55rem] tracking-[0.12em] opacity-35 mb-1">NAME</span>
          <input className={field} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
        </label>
        <label className="block">
          <span className="block text-[0.55rem] tracking-[0.12em] opacity-35 mb-1">YOUR EMAIL</span>
          <input className={field} type="email" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label className="block">
          <span className="block text-[0.55rem] tracking-[0.12em] opacity-35 mb-1">MESSAGE</span>
          <textarea className={`${field} resize-none h-[100px]`} required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message..." />
        </label>
        <button type="submit" className="w-full border border-white/30 rounded py-2 text-[0.65rem] tracking-[0.2em] hover:bg-white/10">
          SEND TO {CONTACT_EMAIL.toUpperCase()}
        </button>
        {sent && <p className="text-[0.55rem] opacity-40 text-center">Opening your email app… or write to {CONTACT_EMAIL}.</p>}
      </div>
    </form>
  );
}

function ContactPage() {
  return (
    <>
      {/* Header */}
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: 100 }}>
        <div className="text-label text-[0.55rem] opacity-30 mb-2">005</div>
        <h2 className="text-5xl font-bold heading-lg">CONTACT</h2>
        <div className="w-[120px] divider mt-4"></div>
      </div>

      {/* Get in touch */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 280, width: 'min(400px, 84vw)' }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-6">GET IN TOUCH</p>
        <div className="w-full space-y-4">
          <div className="card p-4 flex items-center gap-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 flex-shrink-0">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            <div>
              <p className="text-[0.55rem] tracking-[0.15em] opacity-35">EMAIL</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm mt-0.5 block underline decoration-white/20 hover:decoration-white/60">{CONTACT_EMAIL}</a>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 flex-shrink-0">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <div>
              <p className="text-[0.55rem] tracking-[0.15em] opacity-35">PHONE</p>
              <p className="text-sm mt-0.5 opacity-50">Available upon request</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40 flex-shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <div>
              <p className="text-[0.55rem] tracking-[0.15em] opacity-35">LOCATION</p>
              <p className="text-sm mt-0.5">Dallas, Texas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 580 }}></div>

      {/* Social */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 640, width: 'min(436px, 84vw)' }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">SOCIAL</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'TWITTER', d: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
            { label: 'INSTAGRAM', d: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z', extra: [<rect key="r" x="2" y="2" width="20" height="20" rx="5"/>, <line key="l" x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>] },
            { label: 'GITHUB', d: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22' },
            { label: 'LINKEDIN', d: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z', extra: [<rect key="r" x="2" y="9" width="4" height="12"/>, <circle key="c" cx="4" cy="4" r="2"/>] },
          ].map((s, i) => (
            <div key={i} className="card p-3 w-full text-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-40">
                {s.extra}
                <path d={s.d}/>
              </svg>
              <p className="text-[0.5rem] mt-1 opacity-40 tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 820 }}></div>

      {/* Contact form */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 880, width: 'min(400px, 84vw)' }}>
        <p className="text-label text-[0.6rem] opacity-30 mb-4">MESSAGE ME</p>
        <MessageForm />
      </div>

      {/* Divider */}
      <div className="absolute inset-x-0 divider" style={{ top: 1320 }}></div>

      {/* Note */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1380 }}>
        <div className="text-center" style={{ width: 'min(400px, 84vw)' }}>
          <p className="text-xs opacity-40 leading-relaxed">
            For performance inquiries, collaborations, or just to say hello —
            feel free to reach out through any of the channels above.
          </p>
        </div>
      </div>

      {/* Contact card / QR */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1520 }}>
        <div className="photo-placeholder w-[240px] h-[160px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
          <span className="text-[0.5rem] mt-2 tracking-[0.1em]">CONTACT CARD / QR CODE</span>
        </div>
      </div>

      {/* Decorative */}
      <svg className="absolute opacity-[0.03]" style={{ top: 140, left: 100 }} width="50" height="50" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" stroke="white" fill="none" strokeWidth="0.5"/>
      </svg>
    </>
  );
}
