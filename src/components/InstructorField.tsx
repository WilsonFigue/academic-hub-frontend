import { Check, Pencil, UserRound, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useSetInstructor } from '../api/hooks';
import type { Course } from '../api/types';
import styles from './InstructorField.module.css';

/** Docente de la materia (nombre completo). Se usa en las portadas de las tareas; se puede corregir aquí. */
export function InstructorField({ course }: { course: Course }) {
  const save = useSetInstructor(course.id);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const name = course.instructorName;

  const open = () => { setValue(name ?? ''); setEditing(true); save.reset(); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(value.trim() === '' ? null : value.trim(), { onSuccess: () => setEditing(false) });
  };
  const error = save.error instanceof ApiError ? save.error.message : save.error ? 'No se pudo guardar. Inténtalo de nuevo.' : null;

  return (
    <section className={styles.card} aria-label="Docente de la materia">
      <span className={styles.icon} aria-hidden="true"><UserRound size={20} /></span>
      {editing ? (
        <form className={styles.form} onSubmit={submit}>
          <label htmlFor={`docente-${course.id}`}>Docente (nombre completo)</label>
          <div className={styles.row}>
            <input id={`docente-${course.id}`} value={value} onChange={(event) => setValue(event.target.value)} maxLength={200} autoFocus placeholder="Ej. Mtro. Lic. Nombre Apellido" />
            <button type="submit" className={styles.save} disabled={save.isPending}><Check size={15} aria-hidden="true" />Guardar</button>
            <button type="button" className={styles.cancel} onClick={() => setEditing(false)} aria-label="Cancelar"><X size={15} aria-hidden="true" /></button>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </form>
      ) : (
        <>
          <span className={styles.text}>
            <small>Docente</small>
            <b>{name ?? 'Sin docente registrado'}</b>
            <em>{name ? 'Sale en la portada de tus tareas.' : 'Agrégalo para que salga en la portada de tus tareas.'}</em>
          </span>
          <button type="button" className={styles.edit} onClick={open}><Pencil size={14} aria-hidden="true" />{name ? 'Corregir' : 'Agregar'}</button>
        </>
      )}
    </section>
  );
}
