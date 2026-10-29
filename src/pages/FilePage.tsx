import { useNavigate, useParams } from 'react-router-dom';
import { useContentPreview, useCourse } from '../api/hooks';
import { FileViewerPage, type ViewerTarget } from '../components/FileViewer';
import { Skeleton } from '../components/ui';

/** Segunda vista de un archivo: ocupa toda la pantalla, sin menús. Se abre desde el visor con "Abrir en una pestaña nueva". */
export function FilePage() {
  const { courseId = '', contentId = '' } = useParams();
  const navigate = useNavigate();
  const preview = useContentPreview(courseId, contentId);
  const course = useCourse(courseId);
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(`/courses/${courseId}?tab=content`, { replace: true }));
  const data = preview.data;
  if (!data) {
    return <div style={{ padding: 24 }}><Skeleton height={80} radius={24} />{preview.error && <p style={{ padding: 16 }}>No pudimos abrir este archivo. <button type="button" onClick={back}>Volver</button></p>}</div>;
  }
  const target: ViewerTarget = {
    courseId, id: contentId, title: data.title, handler: data.handler,
    file: data.fileName && data.mimeType ? { name: data.fileName, mimeType: data.mimeType, size: data.size ?? 0 } : null,
    externalUrl: data.preview.kind === 'link' ? data.preview.url : null,
    lmsUrl: course.data?.lmsUrl ?? null,
  };
  return <FileViewerPage target={target} onClose={back} />;
}
