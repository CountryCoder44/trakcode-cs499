// The Sequential Curriculum courses the client knows about. `id` matches
// `SeqTopic.course` on the API and the topic-file id prefix's course
// (`Sequential Curriculum/<dir>/<prefix>-topic-*.md`). Adding a course here +
// its `.md` files is all the frontend needs — routing is generic on `:course`.

export type EditorLanguage = 'python' | 'typescript' | 'cpp';

export interface CourseMeta {
  id: string;
  label: string;
  editorLanguage: EditorLanguage;
  blurb: string;
}

export const COURSES: CourseMeta[] = [
  {
    id: 'python',
    label: 'Python',
    editorLanguage: 'python',
    blurb: 'Foundations through a final project — 15 topics, each a fixed run of reading checks and live-coding tasks.',
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    editorLanguage: 'typescript',
    blurb: 'Strict TypeScript from the first lesson. Every practical is type-checked under --strict before it runs. Part I — Foundations is live.',
  },
];

const FALLBACK: CourseMeta = { id: 'python', label: 'Python', editorLanguage: 'python', blurb: '' };

export function courseMeta(id: string | undefined): CourseMeta {
  return COURSES.find((c) => c.id === id) ?? (id ? { ...FALLBACK, id, label: id } : FALLBACK);
}
