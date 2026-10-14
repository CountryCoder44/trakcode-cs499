import { useTheme } from '../context/ThemeContext';
import { Emoji } from './Emoji';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Emoji>{theme === 'dark' ? '☀️' : '🌙'}</Emoji>
    </button>
  );
}
