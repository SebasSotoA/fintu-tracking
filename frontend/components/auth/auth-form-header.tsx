interface AuthFormHeaderProps {
  title: string
  description: string
  size: "split" | "compact"
}

export function AuthFormHeader({
  title,
  description,
  size,
}: AuthFormHeaderProps): React.ReactElement {
  const headingClass =
    size === "split"
      ? "!text-4xl font-semibold leading-snug tracking-tight text-foreground"
      : "!text-2xl font-semibold leading-snug tracking-tight text-foreground"

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className={headingClass}>{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
