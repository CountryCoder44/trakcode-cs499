// The Learn courses the client knows about. `id` matches `SeqTopic.course` on
// the API and the course folder in `Sequential Curriculum/` (COURSE_DIRS in
// server/src/seeds/seqCurriculum.import.ts; both must list a course for it to
// appear). Routing is generic on `:course`.

export type EditorLanguage = 'python' | 'typescript' | 'cpp' | 'java';

export interface CourseMeta {
  id: string;
  label: string;
  editorLanguage: EditorLanguage;
  /** Language logo in client/public/brand/lang/. */
  icon: string;
  /** What the language is, in a sentence or two. */
  description: string;
  /** Where it's used in the real world. */
  useCases: string[];
}

export const COURSES: CourseMeta[] = [
  {
    id: 'python_beginner',
    label: 'Python: Beginner',
    editorLanguage: 'python',
    icon: '/brand/lang/python.png',
    description:
      'A readable, general-purpose language and one of the most popular first languages. Its plain syntax lets you focus on solving the problem.',
    useCases: ['Automation and scripting', 'Data analysis', 'AI and machine learning', 'Web back ends', 'Science and engineering'],
  },
  {
    id: 'java_beginner',
    label: 'Java: Beginner',
    editorLanguage: 'java',
    icon: '/brand/lang/java.png',
    description:
      'A strongly typed, object-oriented language that runs anywhere the Java Virtual Machine does. Built for large software that has to keep working for years.',
    useCases: ['Business and banking systems', 'Android apps', 'Large web back ends', 'Big-data tools'],
  },
  {
    id: 'cpp_beginner',
    label: 'C++: Beginner',
    editorLanguage: 'cpp',
    icon: '/brand/lang/cpp.png',
    description:
      'A fast, compiled language that gives you close control over memory and hardware. Used where speed matters most.',
    useCases: ['Game engines', 'Operating systems and drivers', 'Embedded devices', 'Finance and simulations', 'Browsers and desktop apps'],
  },
];

const FALLBACK: CourseMeta = {
  id: 'python_beginner',
  label: 'Python: Beginner',
  editorLanguage: 'python',
  icon: '/brand/lang/python.png',
  description: '',
  useCases: [],
};

export function courseMeta(id: string | undefined): CourseMeta {
  return COURSES.find((c) => c.id === id) ?? (id ? { ...FALLBACK, id, label: id } : FALLBACK);
}
