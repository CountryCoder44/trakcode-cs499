// Trak's face (the site icon, public/icon-192.png) at a small size: chat
// headers and anywhere else Trak is named. The 192px source keeps it sharp on
// high-density screens.
export default function TrakIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      src="/icon-192.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0 }}
    />
  );
}
