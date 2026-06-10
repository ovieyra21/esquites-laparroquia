import logo from "@/assets/logo.jpeg";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <img
      src={logo}
      alt="Esquites La Parroquia"
      width={size}
      height={size}
      className="rounded-xl object-cover"
      style={{ width: size, height: size }}
    />
  );
}
