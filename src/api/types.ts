// Tipos de las respuestas reales de la API Fastify (academic-hub-backend/src/modules/academic).

export interface PublicUser {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  mustChangePassword: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface SessionResponse {
  user: PublicUser;
  expiresAt: string;
}

export interface UniversityAccount {
  id: string;
  institutionCode: string;
  institutionName: string;
  lmsUsername: string | null;
  givenName: string | null;
  familyName: string | null;
  preferredDisplayName: string | null;
  institutionalEmail: string | null;
  locale: string | null;
  linkStatus: 'pending' | 'active' | 'needs_reauth' | 'revoked' | 'error';
  linkedAt: string | null;
  lastVerifiedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  activeEnrollments: number;
}

export interface Term {
  id: string;
  name: string;
  startAt: string | null;
  endAt: string | null;
  isAvailable: boolean | null;
  isCurrentByDate: boolean;
  isPreferredCurrent: boolean;
  courseCount: number;
}

export interface Course {
  id: string;
  name: string;
  displayName: string | null;
  courseCode: string | null;
  displayId: string | null;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  isAvailable: boolean | null;
  isClosed: boolean | null;
  lmsUrl: string | null;
  lastSeenAt: string;
  /** Docente de la materia (nombre completo); null si aún no se ha registrado. */
  instructorName: string | null;
  /** Lo que Blackboard dice que no has visto (solo contadores); null si aún no se ha capturado. */
  signals: CourseSignals | null;
  term: { id: string; name: string; startAt: string | null; endAt: string | null } | null;
  enrollment: { id: string; role: string | null; isAvailable: boolean | null; enrolledAt: string | null; lastAccessAt: string | null };
  activityCount: number;
  nextDueAt: string | null;
}

export interface Activity {
  id: string;
  name: string;
  effectiveName: string | null;
  courseId: string;
  courseName: string;
  pointsPossible: string | null;
  dueAt: string | null;
  dueSource: 'column' | 'exception' | 'todo' | null;
  categoryKey: string | null;
  categoryTitle: string | null;
  kind: string | null;
  isCalculated: boolean;
  position: number | null;
  gradesReleased: boolean | null;
  status: string | null;
  submissionStatus: string | null;
  isSubmitted: boolean | null;
  score: string | null;
  displayGrade: { score?: number; text?: string } | null;
  isExempt: boolean | null;
  hasFeedback: boolean | null;
  isAutoZero: boolean;
  content: { id: string; title: string; handler: string; description: string | null; externalUrl: string | null } | null;
  feedbackText: string | null;
  lmsUrl: string | null;
  termId: string | null;
  termName: string | null;
  attemptCount: number;
  submittedAt: string | null;
  gradedAt: string | null;
  lastSeenAt: string;
}

export interface Attempt {
  id: string;
  status: string;
  attemptedAt: string | null;
  submittedAt: string | null;
  firstGradedAt: string | null;
  lastGradedAt: string | null;
  score: string | null;
  isExempt: boolean | null;
  hasReceipt: boolean;
  isFinal: boolean;
}

export interface ContentItem {
  id: string;
  parentId: string | null;
  rootKind: 'outline' | 'interactive';
  handler: string;
  title: string;
  description: string | null;
  bodyText: string | null;
  position: number | null;
  depth: number;
  externalUrl: string | null;
  hasGradeColumn: boolean | null;
  dueAt: string | null;
  modifiedAt: string | null;
  visibility: string | null;
  completion: { total?: number; completed?: number; started?: number } | null;
  /** Archivo subido por el docente (solo en recursos de tipo archivo). */
  file: { name: string; mimeType: string; size: number } | null;
  /** Marca de "revisado" pedida por el estudiante y su estado de envío a Blackboard. */
  review: ReviewMark | null;
}

export interface ReviewMark {
  state: 'pending' | 'sent' | 'failed';
  markedAt: string;
  sentAt: string | null;
  alreadyCompleted: boolean;
  /** Solo en la respuesta al marcar: el envío inmediato a UTEC no se pudo y quedó pendiente. */
  sendFailed?: boolean;
}

export type Preview =
  | { kind: 'docx'; html: string; text: string; images: number }
  | { kind: 'pptx'; slides: Array<{ n: number; title: string; lines: string[] }>; text: string }
  | { kind: 'xlsx'; sheets: Array<{ name: string; rows: string[][]; truncated: boolean }>; text: string }
  | { kind: 'pdf'; pages: number; text: string; scanned: boolean }
  | { kind: 'text'; text: string }
  | { kind: 'document'; html: string; text: string }
  | { kind: 'link'; url: string }
  | { kind: 'none'; reason: 'empty' | 'too_large' | 'unsupported' | 'unreadable' };

export interface ContentPreview {
  title: string;
  handler: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  completion: ContentItem['completion'];
  review: ReviewMark | null;
  /** Cómo se puede ver tal cual: 'pdf' (visor del navegador), 'office' (convertido a PDF con Office en el servidor) o null (solo la vista de texto). */
  render: 'pdf' | 'office' | null;
  preview: Preview;
}

/** Archivo que comparte carpeta con una actividad (su guía). */
export interface ActivityGuide {
  id: string;
  courseId: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface SyncRun {
  id: string;
  universityAccountId: string;
  trigger: string;
  status: 'running' | 'succeeded' | 'partial' | 'failed' | 'needs_reauth' | 'cancelled';
  startedAt: string;
  finishedAt: string | null;
  adapterVersion: string;
  errorCode: string | null;
}

export interface Dashboard {
  universityAccounts: UniversityAccount[];
  terms: { all: Term[]; current: Term[] };
  summary: { courses: number; activities: number; pending: number; dueSoon: number; graded: number };
  courses: Course[];
  upcoming: Activity[];
  recentGrades: Activity[];
  lastSync: SyncRun | null;
  recentChanges: Change[];
  weekAhead: CalendarItem[];
}

export interface CalendarItem {
  type: 'activity' | 'event';
  id: string;
  title: string;
  courseId: string | null;
  courseName: string | null;
  startAt: string;
  endAt: string | null;
  status: string | null;
  isSubmitted: boolean | null;
  submissionStatus: string | null;
  isAutoZero: boolean | null;
  kind: string | null;
  categoryKey: string | null;
  score: string | null;
  pointsPossible: string | null;
}

export type ChangeKind =
  | 'term_new' | 'course_new' | 'activity_new' | 'due_changed' | 'activity_renamed' | 'points_changed'
  | 'grade_new' | 'grade_changed' | 'submission_changed' | 'announcement_new';

export interface Change {
  id: string;
  kind: ChangeKind;
  changeType: 'created' | 'updated';
  entityType: string;
  changedFields: string[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  detectedAt: string;
  courseId: string | null;
  courseName: string | null;
  activityId: string | null;
  termId: string | null;
}

export interface EvaluationCycle {
  id: string;
  number: number;
  label: string | null;
  weightPercent: string | null;
  isActive: boolean;
  source: string;
  confirmedAt: string | null;
  /** Fechas oficiales de la evaluación (calendario institucional); null si el ciclo no tiene calendario cargado. */
  examStart: string | null;
  examEnd: string | null;
  deferredStart: string | null;
  deferredEnd: string | null;
  gradesCorrectionDeadline: string | null;
}

export interface EvaluationCycles {
  cycles: EvaluationCycle[];
  items: Array<{ cycleId: string; activityId: string; weightWithinCycle: string | null; source: string; confirmedAt: string | null }>;
}

export interface SaveCyclesInput {
  activeNumber: number | null;
  cycles: Array<{ number: number; label: string | null; weightPercent: number | null; items: Array<{ activityId: string; weightWithinCycle: number | null }> }>;
}

export interface OverviewEvaluation { number: number; examStart: string; examEnd: string; deferredStart: string | null; deferredEnd: string | null; status: 'closed' | 'current' | 'upcoming' }
export interface OverviewCourseEvaluation { number: number; total: number; graded: number; percent: number | null; points: number | null }
export interface OverviewCourse {
  courseId: string; name: string; evaluations: OverviewCourseEvaluation[];
  pointsEarned: number; pointsAvailable: number; missingToPass: number; reachable: boolean;
}
export interface EvaluationOverviewTerm {
  term: { name: string; passingGrade: number; evaluationWeightPercent: number; classesStart: string | null; classesEnd: string | null; today: string; currentEvaluation: number | null };
  evaluations: OverviewEvaluation[];
  courses: OverviewCourse[];
}

export interface CourseSignals {
  unreadGrades: number | null; announcementsUnread: number | null; announcementsPosted: number | null;
  conversationsTotal: number | null; conversationsUnread: number | null; forumUnread: number | null; contentWithNews: number | null; capturedAt: string;
}

export interface StudyGuideContent {
  summary: string;
  sections: Array<{ heading: string; body: string; bullets?: string[] }>;
  sources: Array<{ file: string; note?: string }>;
}
export interface StudyGuide {
  id: string; status: 'requested' | 'generating' | 'ready' | 'failed'; trigger: 'manual' | 'routine';
  content: StudyGuideContent | null; model: string | null; errorCode: string | null; requestedAt: string; finishedAt: string | null;
  /** Herramientas que la actividad pide usar (p. ej. 'geogebra'). */
  tools: string[];
}
export interface StudyGuideState { activityId: string; courseEnabled: boolean; guide: StudyGuide | null; canRequest: boolean }
export interface StudyGuideCourse { courseId: string; name: string; termName: string | null; enabled: boolean; ready: number; queued: number }

/** Tareas resueltas con IA (agente con herramientas). */
export interface HomeworkDeliverable { name: string; kind: 'pdf' | 'docx' | 'xlsx' | 'ggb'; bytes: number }
export interface HomeworkReport { turns: number; tools: Record<string, number>; assumptions: string[]; pending: string[]; placeholders: string[]; warnings: string[]; materialDocs: string[] }
export interface Homework {
  id: string; status: 'requested' | 'generating' | 'ready' | 'failed' | 'skipped'; trigger: 'manual' | 'routine';
  deliverables: HomeworkDeliverable[]; summary: string | null; report: HomeworkReport | null; model: string | null; errorCode: string | null;
  costUsd: number | null; requestedAt: string; finishedAt: string | null;
}
export interface HomeworkState { activityId: string; courseEnabled: boolean; eligible: boolean; pending: boolean; homework: Homework | null }
