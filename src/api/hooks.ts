import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from './client';
import type {
  Activity, ActivityGuide, Attempt, ContentPreview, CalendarItem, Change, ContentItem, Course, Dashboard, EvaluationCycles, PublicUser, SaveCyclesInput, SessionResponse, Term, UniversityAccount,
} from './types';

export const keys = {
  session: ['session'] as const,
  dashboard: ['dashboard'] as const,
  courses: ['courses'] as const,
  course: (id: string) => ['course', id] as const,
  courseContent: (id: string) => ['course', id, 'content'] as const,
  courseGrades: (id: string) => ['course', id, 'grades'] as const,
  activities: (status?: string) => ['activities', status ?? 'all'] as const,
  activity: (id: string) => ['activity', id] as const,
  me: ['me'] as const,
};

/** Sesión actual; null cuando no hay sesión (401). */
export function useSession() {
  return useQuery({
    queryKey: keys.session,
    queryFn: async () => {
      try {
        return await api<SessionResponse>('/auth/session', { silentAuth: true });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { identifier: string; password: string }) =>
      api<{ user: PublicUser; expiresAt: string }>('/auth/login', { method: 'POST', body: input, silentAuth: true }),
    onSuccess: (data) => {
      client.clear();
      client.setQueryData(keys.session, { user: data.user, expiresAt: data.expiresAt });
    },
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST', silentAuth: true }).catch(() => undefined),
    onSettled: () => {
      client.clear();
      client.setQueryData(keys.session, null);
    },
  });
}

export function useChangePassword() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api<void>('/auth/password', { method: 'POST', body: input, silentAuth: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.session }),
  });
}

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => api<Dashboard>('/dashboard') });
export const useCourses = () => useQuery({ queryKey: keys.courses, queryFn: async () => (await api<{ courses: Course[] }>('/courses')).courses });
export const useCourse = (id: string) => useQuery({ queryKey: keys.course(id), queryFn: async () => (await api<{ course: Course }>(`/courses/${id}`)).course });
export const useCourseContent = (id: string) =>
  useQuery({ queryKey: keys.courseContent(id), queryFn: async () => (await api<{ items: ContentItem[] }>(`/courses/${id}/content`)).items });
export const useCourseGrades = (id: string) =>
  useQuery({ queryKey: keys.courseGrades(id), queryFn: async () => (await api<{ grades: Activity[] }>(`/courses/${id}/grades`)).grades });
export const useActivities = (status?: 'pending' | 'submitted' | 'graded') =>
  useQuery({
    queryKey: keys.activities(status),
    queryFn: async () => (await api<{ activities: Activity[] }>(`/activities${status ? `?status=${status}` : ''}`)).activities,
  });
export const useActivity = (id: string | null) =>
  useQuery({
    queryKey: keys.activity(id ?? ''),
    queryFn: () => api<{ activity: Activity; attempts: Attempt[]; guides: ActivityGuide[] }>(`/activities/${id}`),
    enabled: Boolean(id),
  });
export const useGrades = () =>
  useQuery({ queryKey: ['grades'], queryFn: async () => (await api<{ grades: Activity[] }>('/grades')).grades });

export const useCalendar = (from: string, to: string) =>
  useQuery({
    queryKey: ['calendar', from, to],
    enabled: Boolean(from && to),
    queryFn: async () => (await api<{ items: CalendarItem[] }>(`/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)).items,
    placeholderData: (previous) => previous,
  });

export const useChanges = () =>
  useInfiniteQuery({
    queryKey: ['changes'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api<{ changes: Change[]; nextCursor: string | null }>(`/changes?limit=30${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`),
    getNextPageParam: (last) => last.nextCursor,
  });

export const useCycles = (courseId: string) =>
  useQuery({ queryKey: ['cycles', courseId], queryFn: () => api<EvaluationCycles>(`/courses/${courseId}/evaluation-cycles`) });

export function useSaveCycles(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveCyclesInput) => api<EvaluationCycles>(`/courses/${courseId}/evaluation-cycles`, { method: 'PUT', body: input }),
    onSuccess: (data) => client.setQueryData(['cycles', courseId], data),
  });
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api<{ user: PublicUser; universityAccounts: UniversityAccount[] }>('/me') });

export const useTerms = () =>
  useQuery({ queryKey: ['terms'], queryFn: async () => (await api<{ terms: Term[] }>('/terms')).terms });

/** Distribución guardada del tablero de actividades: orden de columnas, minimizadas y cerradas (null si nunca se guardó). */
export type BoardLayout = { order: string[]; minimized: string[]; hidden: string[] };
export const useBoardLayout = () =>
  useQuery({
    queryKey: ['preferences', 'activities_board'] as const,
    queryFn: async () => (await api<{ value: BoardLayout | null }>('/me/preferences/activities_board')).value,
    staleTime: Infinity,
  });
export function useSaveBoardLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: BoardLayout) => (await api<{ value: BoardLayout }>('/me/preferences/activities_board', { method: 'PUT', body: { value } })).value,
    onSuccess: (value) => queryClient.setQueryData(['preferences', 'activities_board'], value),
  });
}

/** Dirección del archivo de un contenido (se sirve desde la API con la sesión de Academic Hub). */
export const fileUrl = (courseId: string, contentId: string, download = false) => `/api/v1/courses/${courseId}/content/${contentId}/file${download ? '?download=1' : ''}`;

/** El documento tal cual: PDF tal como está; Word, PowerPoint y Excel convertidos a PDF (la primera vez tarda unos segundos). */
export const renderUrl = (courseId: string, contentId: string) => `/api/v1/courses/${courseId}/content/${contentId}/render`;

/** Vista previa (texto y estructura) de un contenido, más su estado de revisado. La primera vez puede tardar: descarga el archivo de Blackboard. */
export const useContentPreview = (courseId: string, contentId: string, enabled = true) =>
  useQuery({
    queryKey: ['content-preview', contentId] as const,
    queryFn: () => api<ContentPreview>(`/courses/${courseId}/content/${contentId}/preview`),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

/** Marca o desmarca un contenido como revisado (se envía a Blackboard en la siguiente actualización). */
export function useSetReviewed(courseId: string, contentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (reviewed: boolean) => api<{ review: ContentPreview['review'] }>(`/courses/${courseId}/content/${contentId}/reviewed`, { method: 'PUT', body: { reviewed } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['content-preview', contentId] });
      void client.invalidateQueries({ queryKey: keys.courseContent(courseId) });
    },
  });
}
