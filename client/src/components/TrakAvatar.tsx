export type TrakAvatarState = 'resting' | 'talking' | 'passed' | 'wrong';

// Prototype placeholder for a Trak avatar — an emoji standing in for a future
// pre-rendered character image per state. Swap EMOJI for an <img> src later;
// the state prop and its meaning stay the same.
const EMOJI: Record<TrakAvatarState, string> = {
  resting: '\u{1F642}', // 🙂
  talking: '\u{1F600}', // 😀
  passed: '\u{1F929}', // 🤩
  wrong: '\u{1FAE0}', // 🫠
};

const LABEL: Record<TrakAvatarState, string> = {
  resting: 'Trak is resting',
  talking: 'Trak is talking',
  passed: 'Trak: this one passed',
  wrong: 'Trak: not quite',
};

interface Props {
  state: TrakAvatarState;
  // 'hero' = the large, centered portrait on the onboarding intro.
  size?: 'default' | 'hero';
}

export default function TrakAvatar({ state, size = 'default' }: Props) {
  return (
    <div className={size === 'hero' ? 'trak-avatar trak-avatar-hero' : 'trak-avatar'} role="img" aria-label={LABEL[state]} title={LABEL[state]}>
      <span aria-hidden="true">{EMOJI[state]}</span>
    </div>
  );
}
