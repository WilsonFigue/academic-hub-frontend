import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from './client';
import type {
  Activity, Attempt, CalendarItem, Change, ContentItem, Course, Dashboard, EvaluationCycles, PublicUser, SaveCyclesInput, SessionResponse, Term, UniversityAccount,
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
    queryFn: () => api<{ activity: Activity; attempts: Attempt[] }>(`/activities/${id}`),
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
