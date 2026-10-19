import logoUrl from "@/assets/gjergji-canco-logo.png";

export function SchoolLogo({
  className = "h-9 w-9",
}: {
  className?: string;
}) {
  return (
    <img
      src={logoUrl}
      alt='Shkolla Teknike Elektrike "Gjergj Canco"'
      className={`${className} shrink-0 rounded-full object-contain`}
    />
  );
}