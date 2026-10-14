// The TrakCode logo (Trak's head + "TrakCode.com"). Two images, one per theme:
// the original render for dark backgrounds, and a copy with dark "Trak" letters
// for light ones. CSS shows the one that matches [data-theme]. Source art:
// 3D-Trak/TrakCode Logo Glow Transparent.png.
export default function TrakLogo({ height = 48 }: { height?: number }) {
  return (
    <span className="trak-logo" style={{ height }}>
      <img src="/brand/logo-on-light.png" alt="TrakCode" className="logo-for-light" height={height} />
      <img src="/brand/logo-on-dark.png" alt="" aria-hidden="true" className="logo-for-dark" height={height} />
    </span>
  );
}
