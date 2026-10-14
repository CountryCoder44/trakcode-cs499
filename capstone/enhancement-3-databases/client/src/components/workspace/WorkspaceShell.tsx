import type { ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useMatchMedia, WORKSPACE_NARROW_BREAKPOINT_PX } from '../../hooks/useMatchMedia';
import ErrorPanel from './ErrorPanel';
import ExecutionConsolePopup from './ExecutionConsolePopup';
import type { StructuredError, ExecutionConsoleData } from '../../utils/errorParsing';

// Shared dockable shell: AI chat | editor (top), a persistent bottom error
// panel, and a separately-rendered transient execution console popup — see
// the dockable-layout plan. Used by Practice Workspace, Learn Lesson, and
// Flash Card (Flash Card's own panel arrangement is a placeholder pending a
// bespoke redesign later, per direction — it just gets these defaults).
export type WorkspaceLayoutId = 'practice-workspace' | 'learn-lesson' | 'flash-card';

interface WorkspaceShellProps {
  layoutId: WorkspaceLayoutId;
  chatPanel: ReactNode;
  editorPanel: ReactNode;
  errorPanelData: StructuredError[];
  onJumpToLine: (line: number) => void;
  consoleOutput: ExecutionConsoleData | null;
  onCloseConsole: () => void;
  defaultChatSize?: number;
}

export default function WorkspaceShell({
  layoutId,
  chatPanel,
  editorPanel,
  errorPanelData,
  onJumpToLine,
  consoleOutput,
  onCloseConsole,
  defaultChatSize = 32,
}: WorkspaceShellProps) {
  // A 3-way docked split needs more room than a simple 2-column grid before
  // side-by-side stays usable — see WORKSPACE_NARROW_BREAKPOINT_PX's own
  // comment for why this is a second, wider breakpoint than the app's
  // existing 720px one.
  const isNarrow = useMatchMedia(`(max-width: ${WORKSPACE_NARROW_BREAKPOINT_PX}px)`);
  // layoutId currently only distinguishes CSS-persisted concerns elsewhere;
  // kept as a prop for that and for a future cross-reload persisted-layout
  // feature (dropped for now — see the dockable-layout debugging notes).
  void layoutId;

  return (
    <div className="workspace-shell">
      <Group orientation="vertical">
        <Panel id="workspace-content" defaultSize="78%" minSize="50%">
          <Group orientation={isNarrow ? 'vertical' : 'horizontal'}>
            <Panel id="workspace-chat" defaultSize={`${defaultChatSize}%`} minSize="20%">
              {chatPanel}
            </Panel>
            <Separator
              className={isNarrow ? 'resize-handle resize-handle-vertical' : 'resize-handle resize-handle-horizontal'}
            />
            <Panel id="workspace-editor" defaultSize={`${100 - defaultChatSize}%`} minSize="30%">
              <div className="workspace-editor-panel">{editorPanel}</div>
            </Panel>
          </Group>
        </Panel>
        <Separator className="resize-handle resize-handle-vertical" />
        {/* Never collapsible — errors stay visible, satisfying "persistent" literally. */}
        <Panel id="workspace-errors" defaultSize="22%" minSize={72}>
          <ErrorPanel errors={errorPanelData} onJumpToLine={onJumpToLine} />
        </Panel>
      </Group>

      {consoleOutput && <ExecutionConsolePopup data={consoleOutput} onClose={onCloseConsole} />}
    </div>
  );
}
