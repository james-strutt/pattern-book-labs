import { cn } from "@/lib/utils"
import * as React from "react"
import type { ButtonProps } from "@/components/ui/landiq/types"

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(({ 
  className,
  variant = "primary",
  size = "default",
  disabled = false,
  leftIcon,
  rightIcon,
  href,
  children,
  ...props 
}, ref) => {
  const baseStyles = [
    "inline-flex flex-row items-center justify-center",
    "font-['Public_Sans'] font-bold text-center rounded transition-all",
    "disabled:cursor-not-allowed"
  ].join(" ")

  const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
    small: "h-8 px-2 py-2 gap-1 text-[11px] leading-[13px]",
    default: "h-12 px-6 py-3 gap-2.5 text-base leading-6",
    large: "h-16 px-6 py-4 gap-4 text-xl leading-7"
  }

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: [
      "bg-[#002664] text-white",
      "hover:opacity-75",
      "active:bg-greys-grey03 active:text-[#002664]",
      "disabled:opacity-20"
    ].join(" "),
    outline: [
      "bg-white text-[#002664] border-2 border-[#002664]",
      "hover:bg-[#002664] hover:text-white",
      "active:bg-greys-grey03 active:border-[#002664]",
      "disabled:opacity-20"
    ].join(" "),
    text: [
      "bg-transparent text-[#002664] underline",
      "hover:opacity-75",
      "disabled:opacity-20"
    ].join(" "),
    danger: [
      "bg-[#B81237] text-white",
      "hover:opacity-75",
      "disabled:opacity-38"
    ].join(" "),
    dangerText: [
      "bg-transparent text-[#B81237] underline",
      "hover:opacity-75",
      "disabled:opacity-38"
    ].join(" "),
    destructiveOutline: [
      "bg-white text-destructive border-2 border-destructive",
      "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
      "active:bg-destructive-active active:border-destructive-active active:text-destructive-foreground",
      "disabled:opacity-20"
    ].join(" "),
    success: [
      "bg-[#008A07] text-white",
      "hover:opacity-75",
      "active:bg-greys-grey03 active:text-[#008A07]",
      "disabled:opacity-20"
    ].join(" "),
  }

  let iconSize: string
  if (size === "small") {
    iconSize = "w-4 h-4"
  } else if (size === "large") {
    iconSize = "w-8 h-8"
  } else {
    iconSize = "w-6 h-6"
  }

  const renderIcon = (icon: React.ReactNode): React.ReactElement | null => {
    if (!icon || !React.isValidElement(icon)) return null
    const element = icon as React.ReactElement<{ className?: string }>
    const existingClassName = element.props?.className
    return React.cloneElement(element, {
      className: cn(iconSize, "flex-shrink-0", existingClassName)
    })
  }

  const commonProps = {
    className: cn(
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      className
    ),
    children: (
      <>
        {leftIcon && renderIcon(leftIcon)}
        {children}
        {rightIcon && renderIcon(rightIcon)}
      </>
    ),
  }

  if (href) {
    const anchorClassName = disabled 
      ? cn(commonProps.className, "pointer-events-none opacity-20")
      : commonProps.className
    
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={disabled ? undefined : href}
        aria-disabled={disabled}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        className={anchorClassName}
        onClick={disabled ? (e: React.MouseEvent<HTMLAnchorElement>): void => e.preventDefault() : undefined}
      >
        {commonProps.children}
      </a>
    )
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      disabled={disabled}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      {...commonProps}
    />
  )
})

Button.displayName = "Button"

export { Button }

