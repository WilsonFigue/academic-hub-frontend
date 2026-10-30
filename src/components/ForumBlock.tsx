import { CalendarClock, Check, Copy, Loader2, MessagesSquare, Sparkles, TriangleAlert, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import { useForum, useForumSuggestion } from '../api/hooks';
import { useReducedMotion } from '../lib/motion';
import styles from './ForumBlock.module.css';

const STATUS_NOTE: Record<string, string> = {
  forbidden: 'Blackboard no me deja leer la consigna de este foro: la sugerencia se basó en el título y el material de la materia. Si pegas la consigna, sale mejor.',
  empty: 'El docente no dejó la consigna como texto en el foro: la sugerencia se basó en el título y el material. Si la pegas, sale mejor.',
  no_session: 'No pude entrar a Blackboard para leer la consigna: la sugerencia se basó en el título y el material.',
  error: 'No pude leer la consigna del foro: la sugerencia se basó en el título y el material.',
};

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); window.setTimeout(() => setDone(false), 1800); } catch { /* sin permiso de portapapeles */ }
  };
  return (
    <button type="button" className={styles.copy} onClick={copy} aria-label={label}>
      {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{done ? 'Copiado' : 'Copiar'}
    </button>
  );
}

/** Aparece suave y escalonado. */
function Reveal({ children, order = 0, className }: { children: ReactNode; order?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: Math.min(order, 8) * 0.07, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/El_Salvador' }) : null);
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');

/**
 * Foro: botón «Generar sugerencia de respuesta». Solo trabaja cuando el estudiante lo pulsa; nada se publica por él.
 * Si pide respuestas a compañeros, a la IA se le envía el texto de algunas participaciones SIN nombres, y no se guarda.
 */
export function ForumBlock({ base, expanded = false }: { base: string; expanded?: boolean }) {
  const { data, isPending, isError, refetch } = useForum(base);
  const suggest = useForumSuggestion(base);
  const [includeReplies, setIncludeReplies] = useState(false);
  const [prompt, setPrompt] = useState('');
  if (isPending) return (
    <div className={styles.loading} role="status" aria-live="polite">
      <Loader2 size={22} className={styles.spin} aria-hidden="true" />
      <span><b>Leyendo el foro en Blackboard…</b><small>Estoy trayendo lo que pide el docente y sus fechas. Puede tardar unos segundos.</small></span>
    </div>
  );
  if (isError) return (
    <div className={styles.loading} role="alert">
      <TriangleAlert size={22} aria-hidden="true" />
      <span><b>No pude abrir el foro</b><small>Revisa tu conexión e inténtalo otra vez.</small></span>
      <button type="button" className={styles.copy} onClick={() => { void refetch(); }}>Reintentar</button>
    </div>
  );
  if (!data || !data.isForum) return null;
  const suggestion = suggest.data?.suggestion ?? data.suggestion;
  const note = suggest.data && suggest.data.suggestion.promptSource === 'title_only' ? STATUS_NOTE[suggest.data.promptStatus] : null;
  const error = suggest.error instanceof ApiError ? suggest.error.message : suggest.error ? 'No se pudo generar la sugerencia. Inténtalo de nuevo.' : null;

  // Fuera de la ventana de fechas Blackboard no deja participar: no tiene sentido sugerir una respuesta.
  const windows = data.availability?.windows ?? [];
  const now = Date.now();
  const closed = windows.length > 0 && !data.availability?.available && windows.every((w) => w.end && Date.parse(w.end) < now);
  const notOpen = windows.length > 0 && !data.availability?.available && !closed;
  const done = data.participated === true;
  const locked = closed || notOpen || done;
  const state = closed ? 'closed' : notOpen ? 'soon' : 'open';

  return (
    <div className={cx(styles.block, expanded && styles.flat)}>
      {!expanded && (
        <div className={styles.head}>
          <span className={styles.icon} aria-hidden="true"><MessagesSquare size={20} /></span>
          <span className={styles.text}>
            <b>{done ? 'Ya participaste' : closed ? 'Foro cerrado' : notOpen ? 'Foro aún no abre' : 'Responder este foro'}</b>
            <small>{done ? 'Ya hay una respuesta tuya en este foro.' : closed ? 'Ya pasó su fecha: ya no se puede participar.' : notOpen ? 'Todavía no está disponible para participar.' : 'La IA te sugiere qué escribir; tú lo revisas y lo publicas.'}</small>
          </span>
        </div>
      )}

      {done && (
        <Reveal order={0}>
          <p className={styles.doneBanner} role="status"><Check size={16} strokeWidth={3} aria-hidden="true" />Ya participaste en este foro: no hace falta sugerencia.</p>
        </Reveal>
      )}

      {windows.length > 0 && !done && (
        <Reveal order={0} className={styles.when}>
          <span className={styles.pill} data-state={state}><CalendarClock size={14} aria-hidden="true" />{closed ? 'Cerrado' : notOpen ? 'Aún no abre' : 'Abierto'}</span>
          <span className={styles.dates}>{windows.map((w) => `del ${day(w.start) ?? 'siempre'} al ${day(w.end) ?? 'sin fecha final'}`).join(' · ')}</span>
          <small>{closed ? 'Blackboard ya lo bloqueó («condicionado»): ya no se puede participar.' : notOpen ? 'Todavía no abre.' : '«Condicionado» = solo se abre en esas fechas.'}</small>
        </Reveal>
      )}

      {!data.prompt && expanded && (data.promptStatus === 'forbidden' || data.promptStatus === 'empty' || data.promptStatus === 'error') && (
        <Reveal order={1}>
          <p className={styles.note} role="status"><TriangleAlert size={14} aria-hidden="true" />{data.promptStatus === 'empty' ? 'El docente no dejó la consigna como texto dentro del foro.' : 'Blackboard no me deja leer lo que pide este foro.'} Si lo ves allá, pégalo abajo y la sugerencia saldrá mejor.</p>
        </Reveal>
      )}

      {data.prompt && (expanded ? (
        <Reveal order={1} className={styles.quote}>
          <h3>Lo que pide el docente</h3>
          <p>{data.prompt}</p>
        </Reveal>
      ) : (
        <details className={styles.prompt}>
          <summary>Lo que pide el foro</summary>
          <p>{data.prompt}</p>
        </details>
      ))}

      {!locked && (
        <Reveal order={2}>
          <label className={styles.option} data-on={includeReplies}>
            <span className={styles.optionIcon} aria-hidden="true"><Users size={20} /></span>
            <span className={styles.optionText}>
              <b>Responder también a compañeros</b>
              <small>Si el foro lo pide, la IA redacta la respuesta a la participación de otro estudiante y te indica a quién va dirigida.</small>
              <em>Privado: la IA solo lee el texto, sin nombres, y no se guarda.</em>
            </span>
            <input type="checkbox" role="switch" className={styles.switch} checked={includeReplies} onChange={(event) => setIncludeReplies(event.target.checked)} />
          </label>
        </Reveal>
      )}

      {!locked && (
        <Reveal order={3}>
          <details className={styles.paste}>
            <summary>¿La consigna no se ve? Pégala aquí (opcional)</summary>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} maxLength={8000} placeholder="Copia el texto del foro tal como lo ves en Blackboard" />
          </details>
        </Reveal>
      )}

      {error && <p className={styles.error} role="alert"><TriangleAlert size={14} aria-hidden="true" />{error}</p>}
      {note && <p className={styles.note} role="status"><TriangleAlert size={14} aria-hidden="true" />{note}</p>}

      {suggest.isPending && (
        <div className={styles.working} role="status" aria-live="polite">
          <Loader2 size={20} className={styles.spin} aria-hidden="true" />
          <span><b>Redactando tu participación…</b><small>{includeReplies ? 'Leyendo participaciones de tus compañeros y escribiendo las respuestas. ' : ''}Tarda unos segundos.</small></span>
          <i className={styles.shimmer} aria-hidden="true" />
        </div>
      )}

      {suggestion && !suggest.isPending && !done && (
        <div className={styles.result}>
          <Reveal order={0}>
            <section className={styles.card} aria-label="Sugerencia de la IA para tu participación">
              <header>
                <span className={styles.avatar} data-me="true" aria-hidden="true"><Sparkles size={15} /></span>
                <h4><small className={styles.to}>Borrador de la IA · aún no publicado</small>Sugerencia para tu participación</h4><small>{words(suggestion.postText)} palabras</small>
                <CopyButton text={suggestion.postText} label="Copiar tu participación" />
              </header>
              <p>{suggestion.postText}</p>
            </section>
          </Reveal>
          {suggestion.replies.map((reply, i) => (
            <Reveal key={`${reply.to}-${reply.text.slice(0, 20)}`} order={i + 1}>
              <section className={styles.card} aria-label={`Respuesta para ${reply.full ?? reply.to}`}>
                <header>
                  <span className={styles.avatar} aria-hidden="true">{initials(reply.full ?? reply.to)}</span>
                  <h4><small className={styles.to}>Responde a</small>{reply.full ?? reply.to}</h4>
                  <small>{words(reply.text)} palabras</small>
                  <CopyButton text={reply.text} label={`Copiar la respuesta para ${reply.to}`} />
                </header>
                <p>{reply.text}</p>
              </section>
            </Reveal>
          ))}
          {includeReplies && suggest.data && suggest.data.repliesRead === 0 && <p className={styles.hint}>No encontré participaciones de compañeros para responder.</p>}
          <p className={styles.hint}>Revísala y escríbela con tus palabras antes de publicar. Nada se publica por ti.</p>
        </div>
      )}

      {!locked && (
        <div className={styles.actionBar}>
          {!data.aiConfigured && <p className={styles.hint}>La IA no está conectada en este momento.</p>}
          <button type="button" className={styles.primary} disabled={suggest.isPending || !data.aiConfigured} onClick={() => suggest.mutate({ includeReplies, ...(prompt.trim() ? { prompt: prompt.trim() } : {}) })}>
            {suggest.isPending ? <Loader2 size={16} className={styles.spin} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            {suggest.isPending ? 'Generando…' : suggestion ? 'Generar otra sugerencia' : 'Generar sugerencia de respuesta'}
          </button>
        </div>
      )}
    </div>
  );
}
