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
}

export interface EvaluationCycles {
  cycles: EvaluationCycle[];
  items: Array<{ cycleId: string; activityId: string; weightWithinCycle: string | null; source: string; confirmedAt: string | null }>;
}

export interface SaveCyclesInput {
  activeNumber: number | null;
  cycles: Array<{ number: number; label: string | null; weightPercent: number | null; items: Array<{ activityId: string; weightWithinCycle: number | null }> }>;
}
