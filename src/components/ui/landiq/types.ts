import type React from "react";
import type { CSSProperties, ReactNode } from "react";

export interface LandIQComponentProps {
  className?: string;
  variant?: string;
  size?: "small" | "medium" | "large" | "default";
}

export type ButtonVariant =
  | "primary"
  | "outline"
  | "text"
  | "danger"
  | "dangerText"
  | "destructiveOutline"
  | "success";

export type ButtonSize = "small" | "default" | "large";

export interface ButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  href?: string;
}

export type MiniButtonSize = "small" | "default" | "large";

export interface MiniButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: MiniButtonSize;
  icon?: ReactNode;
}

export type HamburgerButtonVariant = "default" | "hover" | "pressed";

export interface HamburgerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: HamburgerButtonVariant;
  icon?: ReactNode;
  notificationCount?: number;
}

export type InPageAlertType =
  | "info"
  | "error"
  | "warning"
  | "success"
  | "document";

export type ViewportSize = "large" | "small" | "desktop" | "mobile";

export interface InPageAlertProps extends LandIQComponentProps {
  type?: InPageAlertType;
  compact?: boolean;
  viewport?: ViewportSize;
  showClose?: boolean;
  onClose?: () => void;
  children: ReactNode;
}

export type StatusLabelVariant =
  | "information"
  | "success"
  | "warning"
  | "error"
  | "neutral";

export interface StatusLabelProps extends LandIQComponentProps {
  variant?: StatusLabelVariant;
  children: ReactNode;
}

export type StatusBadgeVariant =
  | "draft"
  | "building"
  | "preview"
  | "built"
  | "published"
  | "error"
  | "cancelled"
  | "retired";

export interface StatusBadgeProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "style" | "className">,
    LandIQComponentProps {
  variant?: StatusBadgeVariant;
  active?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "secondary"
  | "outline";

export interface BadgeProps
  extends
    LandIQComponentProps,
    Omit<React.HTMLAttributes<HTMLSpanElement>, "className"> {
  variant?: BadgeVariant;
  children: ReactNode;
  style?: CSSProperties;
}

export type TooltipVariant = "dark" | "light";

export type TooltipPosition = "top" | "bottom";

export interface TooltipProps extends LandIQComponentProps {
  variant?: TooltipVariant;
  viewport?: ViewportSize;
  position?: TooltipPosition;
  content: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  persistent?: boolean;
}

export type CardTheme = "white" | "dark" | "light";

export interface CardProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "style" | "className">,
    LandIQComponentProps {
  heading?: string;
  copy?: string;
  img?: string;
  tag?: string;
  dateDisplay?: string;
  dateMachine?: string;
  href?: string;
  theme?: CardTheme;
  horizontal?: boolean;
  border?: boolean;
  children?: ReactNode;
  showIcon?: boolean;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T = string> extends LandIQComponentProps {
  value?: T | null;
  onValueChange?: (value: T) => void;
  children: ReactNode;
  disabled?: boolean;
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: ReactNode;
  open?: boolean;
}

export interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  placeholder?: string;
  children?: ReactNode;
}

export interface SelectContentProps<
  T = string | number,
> extends React.HTMLAttributes<HTMLUListElement> {
  className?: string;
  children: ReactNode;
  open?: boolean;
  onClose?: () => void;
  value?: T | null;
  onValueChange?: (value: T) => void;
}

export interface SelectItemProps<
  T = string | number,
> extends React.HTMLAttributes<HTMLLIElement> {
  className?: string;
  value: T;
  children: ReactNode;
  onSelect?: (
    e: React.MouseEvent<HTMLLIElement> | React.KeyboardEvent<HTMLLIElement>,
  ) => void;
  selected?: boolean;
  disabled?: boolean;
}

export interface SelectGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

export interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

export type CheckboxSize =
  | "small"
  | "medium"
  | "large"
  | "16px"
  | "24px"
  | "32px";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  error?: boolean;
  size?: CheckboxSize;
  showInfo?: boolean;
  className?: string;
}

export interface CheckboxOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface CheckboxGroupProps<T = string> {
  legend?: string;
  options?: CheckboxOption<T>[];
  value?: T[];
  onChange?: (value: T[]) => void;
  error?: boolean;
  errorMessage?: string;
  showInfo?: boolean;
  className?: string;
}

export type RadioSize = "small" | "medium" | "large" | "16px" | "24px" | "32px";

export interface RadioButtonProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  name?: string;
  value?: string | number;
  showInfo?: boolean;
  size?: RadioSize;
  className?: string;
}

export interface RadioOption<T = string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps<T = string | number> {
  legend?: string;
  options?: RadioOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  error?: boolean;
  errorMessage?: string;
  showInfo?: boolean;
  name?: string;
  className?: string;
}

export type ToggleSize = "small" | "large";

export interface ToggleSwitchProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  className?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: ToggleSize;
  style?: React.CSSProperties;
}

export type ToggleButtonValue = "left" | "right";

export interface ToggleButtonProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  className?: string;
  leftLabel?: ReactNode;
  rightLabel?: ReactNode;
  value?: ToggleButtonValue;
  onChange?: (value: ToggleButtonValue) => void;
  size?: ToggleSize;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export interface TextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size"
> {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  helperText?: string;
  error?: boolean;
  valid?: boolean;
  errorMessage?: string;
  validMessage?: string;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export type DialogMaxWidth = "small" | "medium" | "large";

export interface DialogProps extends Omit<
  React.HTMLAttributes<HTMLDialogElement>,
  "onClick"
> {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  zIndex?: number;
  className?: string;
}

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  title?: string;
  icon?: ReactNode;
  dismissable?: boolean;
  onClose?: () => void;
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: ReactNode;
}

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children: ReactNode;
}

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export type TableColumnAlign = "left" | "center" | "right";
export type TableCellSize = "small" | "medium";
export type TableCellType = "text" | "datetime";

export interface ColumnDef<T = unknown> {
  key: string;
  title: string;
  render?: (value: unknown, row: T, rowIndex: number) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  align?: TableColumnAlign;
  width?: string | number;
  size?: TableCellSize;
  type?: TableCellType;
  onSort?: () => void;
  onFilter?: () => void;
}

export interface TableProps<T = unknown> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onClick"
> {
  columns: ColumnDef<T>[];
  data: T[];
  selectable?: boolean;
  hoverable?: boolean;
  alternateRows?: boolean;
  actions?: ReactNode;
  onRowClick?: (row: T, rowIndex: number) => void;
  onSelectionChange?: (selectedIndices: number[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface TableHeaderRowProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
  selectable?: boolean;
  allSelected?: boolean;
  onSelectAll?: (checked: boolean) => void;
  style?: React.CSSProperties;
}

export interface TableColumnHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
  filterable?: boolean;
  onFilter?: () => void;
  align?: TableColumnAlign;
  width?: string | number;
  sortable?: boolean;
  onSort?: () => void;
  style?: React.CSSProperties;
}

export interface TableRowProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onSelect" | "onClick"
> {
  className?: string;
  children?: ReactNode;
  selected?: boolean;
  hoverable?: boolean;
  selectable?: boolean;
  alternate?: boolean;
  onSelect?: (checked: boolean) => void;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export interface TableCellProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
  size?: TableCellSize;
  align?: TableColumnAlign;
  type?: TableCellType;
  width?: string | number;
  style?: React.CSSProperties;
}

export interface TableActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export type LoaderSize = "sm" | "md" | "lg";

export interface LoaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "style" | "className"
> {
  size?: LoaderSize;
  label?: string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface TabItem {
  label: string;
  content?: ReactNode;
  title?: string;
  disabled?: boolean;
}

export interface TabsProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "style" | "className"
> {
  tabs?: TabItem[];
  defaultTab?: number;
  activeTab?: number;
  onTabChange?: (index: number) => void;
  viewport?: ViewportSize;
  renderContent?: (activeTab: number) => ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export interface TabItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onClick"
> {
  className?: string;
  active?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  value?: string | number;
  style?: React.CSSProperties;
}

export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  viewport?: ViewportSize;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export interface TabContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  title?: string;
  children?: ReactNode;
  value?: string | number;
  style?: React.CSSProperties;
}

export interface TabsContextValue {
  value: string | number | null;
  setValue: (value: string | number) => void;
}

export interface TabsProviderProps {
  children: ReactNode;
  defaultValue?: string | number;
  value?: string | number;
  onValueChange?: (value: string | number) => void;
}

export interface CompositionTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  defaultValue?: string | number;
  value?: string | number;
  onValueChange?: (value: string | number) => void;
}

export interface BreadcrumbItem {
  text: string;
  url: string;
}

export interface BreadcrumbsProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "style" | "className"
> {
  items?: BreadcrumbItem[];
  label?: string;
  showAll?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface PaginationProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "style" | "className"
> {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  maxVisiblePages?: number;
  className?: string;
}

export interface CarouselIndicatorsProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "style" | "className"
> {
  className?: string;
  total?: number;
  activeIndex?: number;
  onIndicatorClick?: (index: number) => void;
}

export interface NavigationControlsProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "style" | "className"
> {
  className?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

export interface BrowseFieldProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onClick"
> {
  className?: string;
  label?: string;
  value?: string;
  buttonLabel?: string;
  onBrowse?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  showInfo?: boolean;
}

export interface CriteriaCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onClick"
> {
  className?: string;
  children?: ReactNode;
  onRemove?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface DatasetCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onClick" | "onSelect" | "onExpand"
> {
  className?: string;
  title?: string;
  details?: string[];
  status?: "Draft" | "Built" | "Published";
  isSelected?: boolean;
  isHighlighted?: boolean;
  onSelect?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onExpand?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface DateRangeInputProps extends Omit<
  React.HTMLAttributes<HTMLFieldSetElement>,
  "onChange"
> {
  className?: string;
  label?: string;
  startValue?: string;
  endValue?: string;
  onStartChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEndChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showInfo?: boolean;
}

export interface SelectionFieldOption {
  value: string;
  label: string;
}

export interface SelectionFieldProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  className?: string;
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: SelectionFieldOption[];
  showCheckbox?: boolean;
  checked?: boolean;
  onCheckedChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showInfo?: boolean;
}
