import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Command } from 'cmdk';
import {
  Search,
  Radio,
  FileText,
  Users,
  Compass,
  CornerDownLeft,
  X,
  Sparkles,
  Calendar,
  Image,
  Mail,
  Home,
  MessageSquare,
} from 'lucide-react';
import gsap from 'gsap';

interface SearchItem {
  id: string;
  title: string;
  description: string;
  slug: string;
  type: 'Episodio' | 'Artículo' | 'Equipo' | 'Navegación';
  date?: string | null;
  image?: string | null;
  tags?: string[];
  participants?: string[];
}

interface TranscriptMatch {
  time: string;
  snippet: string;
  speaker?: string;
}

interface DeepResult {
  id: string;
  slug: string;
  title: string;
  image?: string | null;
  matches: TranscriptMatch[];
}

const STATIC_NAVIGATION = [
  { title: 'Inicio', description: 'Página principal de Veredillas FM', slug: '/', icon: Home },
  { title: 'Episodios', description: 'Todos los programas y podcasts', slug: '/ep', icon: Radio },
  { title: 'Blog', description: 'Artículos, noticias y reflexiones', slug: '/blog', icon: FileText },
  { title: 'Equipo', description: 'Conoce al equipo detrás de la radio', slug: '/equipo', icon: Users },
  { title: 'Calendario', description: 'Próximos eventos y emisiones', slug: '/calendario', icon: Calendar },
  { title: 'Galería', description: 'Fotos y momentos de las grabaciones', slug: '/galeria', icon: Image },
  { title: 'Newsletter', description: 'Suscríbete para novedades semanales', slug: '/newsletter', icon: Mail },
  { title: 'Contacto', description: 'Escríbenos dudas o propuestas', slug: '/contacto', icon: MessageSquare },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [deepResults, setDeepResults] = useState<DeepResult[]>([]);
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const [isSearchingDeep, setIsSearchingDeep] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const indexLoadedRef = useRef(false);

  // Carga del índice ligero bajo demanda
  const loadIndex = useCallback(async () => {
    if (indexLoadedRef.current) return;
    setIsLoadingIndex(true);
    try {
      const res = await fetch('/api/search.json');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        indexLoadedRef.current = true;
      }
    } catch (err) {
      console.error('Error fetching search index:', err);
    } finally {
      setIsLoadingIndex(false);
    }
  }, []);

  const openPalette = useCallback(() => {
    setOpen(true);
    loadIndex();
  }, [loadIndex]);

  const closePalette = useCallback(() => {
    if (!dialogRef.current || !overlayRef.current) {
      setOpen(false);
      return;
    }
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.15 });
    gsap.to(dialogRef.current, {
      scale: 0.96,
      y: 10,
      opacity: 0,
      filter: 'blur(6px)',
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setOpen(false);
        setQuery('');
        setDeepResults([]);
      },
    });
  }, []);

  // Animación de entrada GSAP
  useEffect(() => {
    if (open && dialogRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(
        dialogRef.current,
        { scale: 0.95, y: 15, opacity: 0, filter: 'blur(8px)' },
        { scale: 1, y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.28, ease: 'back.out(1.3)' }
      );
    }
  }, [open]);

  // Listener global: Cmd+K / Ctrl+K y evento custom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            closePalette();
            return false;
          }
          openPalette();
          return true;
        });
      }
    };

    const handleCustomOpen = () => {
      openPalette();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('veredillas:open-cmd-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('veredillas:open-cmd-palette', handleCustomOpen);
    };
  }, [openPalette, closePalette]);

  // Búsqueda profunda en transcripciones (debounced con AbortController)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setDeepResults([]);
      setIsSearchingDeep(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearchingDeep(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-transcriptions.json?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setDeepResults(data);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Transcription search error:', err);
        }
      } finally {
        setIsSearchingDeep(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const navigate = (url: string) => {
    closePalette();
    if (url.startsWith('#')) {
      const el = document.querySelector(url);
      if (el) (el as HTMLElement).click();
      return;
    }
    window.location.href = url;
  };

  if (!open) return null;

  const episodes = items.filter((it) => it.type === 'Episodio');
  const articles = items.filter((it) => it.type === 'Artículo');
  const team = items.filter((it) => it.type === 'Equipo');

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-[10vh] max-sm:pt-0 p-4 max-sm:p-0 bg-black/65 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === overlayRef.current) closePalette();
      }}
    >
      <div
        ref={dialogRef}
        className="w-[660px] max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_rgba(139,92,246,0.15)] overflow-hidden flex flex-col"
      >
        {/* Barra de acento animada superior */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-secondary)] opacity-80" />

        <Command
          label="Buscador global Veredillas FM"
          shouldFilter={true}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Header con Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <Search className="w-5 h-5 text-[var(--color-primary)] shrink-0 opacity-90" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="Buscar episodios, posts, equipo, transcripciones..."
              className="flex-1 bg-transparent text-[var(--color-text-main)] font-body text-base outline-none placeholder:text-[var(--color-text-dim)]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-[var(--color-text-dim)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-1.5 max-sm:hidden text-xs text-[var(--color-text-dim)]">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)] border border-[var(--color-border)] font-mono text-[10px]">
                Esc
              </kbd>
            </div>
          </div>

          {/* Lista de Resultados */}
          <Command.List className="max-h-[440px] max-sm:max-h-none flex-1 overflow-y-auto p-2 scrollbar-thin">
            {isLoadingIndex && items.length === 0 && (
              <div className="p-4 space-y-2.5">
                <div className="shimmer-skeleton h-12 w-full rounded-xl" />
                <div className="shimmer-skeleton h-12 w-full rounded-xl" />
                <div className="shimmer-skeleton h-12 w-full rounded-xl" />
              </div>
            )}

            <Command.Empty className="py-10 px-4 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] opacity-60">
                <Search className="w-7 h-7" />
              </div>
              <p className="font-display font-semibold text-base text-[var(--color-text-main)]">
                Sin resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-[var(--color-text-dim)] mt-1 max-w-xs mx-auto">
                Prueba con términos más generales o navega por las secciones disponibles.
              </p>
            </Command.Empty>

            {/* Grupo Navegación Rápida (cuando no hay query) */}
            {query.trim().length === 0 && (
              <Command.Group
                heading="Navegación Rápida"
                className="px-2 py-1.5 text-[0.7rem] uppercase tracking-wider font-mono font-semibold text-[var(--color-text-dim)]"
              >
                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-1.5 mt-1">
                  {STATIC_NAVIGATION.map((nav) => {
                    const Icon = nav.icon;
                    return (
                      <Command.Item
                        key={nav.slug}
                        value={`${nav.title} ${nav.description}`}
                        onSelect={() => navigate(nav.slug)}
                        className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer text-[var(--color-text-main)] bg-[var(--color-surface)] border border-transparent aria-selected:border-[var(--color-primary)] aria-selected:bg-[var(--color-surface-hover)] transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center shrink-0 group-aria-selected:text-[var(--color-primary)] transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm block truncate group-aria-selected:text-[var(--color-primary)]">
                            {nav.title}
                          </span>
                          <span className="text-[11px] text-[var(--color-text-dim)] block truncate">
                            {nav.description}
                          </span>
                        </div>
                      </Command.Item>
                    );
                  })}
                </div>
              </Command.Group>
            )}

            {/* Grupo Episodios */}
            {episodes.length > 0 && (
              <Command.Group
                heading="Episodios"
                className="px-2 py-1.5 text-[0.7rem] uppercase tracking-wider font-mono font-semibold text-[var(--color-text-dim)]"
              >
                {episodes.map((ep) => (
                  <Command.Item
                    key={ep.id}
                    value={`${ep.title} ${ep.description} ${(ep.tags || []).join(' ')} ${(ep.participants || []).join(' ')}`}
                    onSelect={() => navigate(ep.slug)}
                    className="flex items-center gap-3 px-3 py-2.5 my-1 rounded-xl cursor-pointer text-[var(--color-text-main)] aria-selected:bg-[var(--color-surface-hover)] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center">
                      {ep.image ? (
                        <img src={ep.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Radio className="w-4 h-4 text-[var(--color-primary)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate group-aria-selected:text-[var(--color-primary)] transition-colors">
                          {ep.title}
                        </span>
                        {ep.date && (
                          <span className="text-[10px] text-[var(--color-text-dim)] font-mono shrink-0">
                            {new Date(ep.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] truncate block">
                        {ep.description || 'Episodio de Veredillas FM'}
                      </span>
                    </div>
                    <CornerDownLeft className="w-4 h-4 opacity-0 group-aria-selected:opacity-100 text-[var(--color-primary)] shrink-0 transition-opacity" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Grupo Blog */}
            {articles.length > 0 && (
              <Command.Group
                heading="Artículos del Blog"
                className="px-2 py-1.5 text-[0.7rem] uppercase tracking-wider font-mono font-semibold text-[var(--color-text-dim)]"
              >
                {articles.map((art) => (
                  <Command.Item
                    key={art.id}
                    value={`${art.title} ${art.description} ${(art.tags || []).join(' ')}`}
                    onSelect={() => navigate(art.slug)}
                    className="flex items-center gap-3 px-3 py-2.5 my-1 rounded-xl cursor-pointer text-[var(--color-text-main)] aria-selected:bg-[var(--color-surface-hover)] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center">
                      {art.image ? (
                        <img src={art.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-4 h-4 text-[var(--color-secondary)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block group-aria-selected:text-[var(--color-secondary)] transition-colors">
                        {art.title}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] truncate block">
                        {art.description}
                      </span>
                    </div>
                    <CornerDownLeft className="w-4 h-4 opacity-0 group-aria-selected:opacity-100 text-[var(--color-secondary)] shrink-0 transition-opacity" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Grupo Equipo */}
            {team.length > 0 && (
              <Command.Group
                heading="Equipo"
                className="px-2 py-1.5 text-[0.7rem] uppercase tracking-wider font-mono font-semibold text-[var(--color-text-dim)]"
              >
                {team.map((mem) => (
                  <Command.Item
                    key={mem.id}
                    value={`${mem.title} ${mem.description}`}
                    onSelect={() => navigate(mem.slug)}
                    className="flex items-center gap-3 px-3 py-2 my-1 rounded-xl cursor-pointer text-[var(--color-text-main)] aria-selected:bg-[var(--color-surface-hover)] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center">
                      {mem.image ? (
                        <img src={mem.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-4 h-4 text-[var(--color-accent)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block group-aria-selected:text-[var(--color-accent)] transition-colors">
                        {mem.title}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] truncate block">
                        {mem.description}
                      </span>
                    </div>
                    <CornerDownLeft className="w-4 h-4 opacity-0 group-aria-selected:opacity-100 text-[var(--color-accent)] shrink-0 transition-opacity" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Indicador de búsqueda en transcripciones */}
            {isSearchingDeep && (
              <div className="px-4 py-2 flex items-center gap-2 text-xs text-[var(--color-text-dim)]">
                <div className="shimmer-skeleton w-3.5 h-3.5 rounded-full" />
                <span>Buscando coincidencias en el audio de los programas…</span>
              </div>
            )}

            {/* Grupo Transcripciones / Menciones en Audio */}
            {deepResults.length > 0 && (
              <Command.Group
                heading="Menciones en Audio & Transcripciones"
                className="px-2 py-1.5 text-[0.7rem] uppercase tracking-wider font-mono font-semibold text-[var(--color-text-dim)]"
              >
                {deepResults.map((res) => (
                  <Command.Item
                    key={res.id}
                    value={`transcripcion ${res.title} ${res.matches.map((m) => m.snippet).join(' ')}`}
                    onSelect={() => navigate(res.slug)}
                    className="p-3 my-1.5 rounded-xl cursor-pointer text-[var(--color-text-main)] bg-[var(--color-surface)] border border-[var(--color-border)] aria-selected:border-[var(--color-primary)] aria-selected:bg-[var(--color-surface-hover)] transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                      <span className="font-semibold text-sm truncate">{res.title}</span>
                    </div>
                    {res.matches.map((m, i) => (
                      <div
                        key={i}
                        className="mt-1.5 pl-3 border-l-2 border-[var(--color-primary)] text-xs text-[var(--color-text-muted)] italic"
                      >
                        &ldquo;{m.snippet}&rdquo;{' '}
                        <span className="font-mono not-italic font-bold text-[var(--color-primary)] text-[10px] ml-1 bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded">
                          {m.time}
                        </span>
                      </div>
                    ))}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-dim)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)] border border-[var(--color-border)] font-mono text-[10px]">
                  ↑↓
                </kbd>{' '}
                Navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)] border border-[var(--color-border)] font-mono text-[10px]">
                  ↵
                </kbd>{' '}
                Abrir
              </span>
            </div>
            <span className="font-mono text-[10px] text-[var(--color-primary)] font-semibold">
              Veredillas FM
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
