/** 纸船皮肤图标（FR-12）：paper 纸船 / crane 千纸鹤 / star 星船 */

export type SkinVariant = "paper" | "crane" | "star";

export function SkinBoat({
  variant = "paper",
  className,
}: {
  variant?: SkinVariant;
  className?: string;
}) {
  if (variant === "crane") {
    // 千纸鹤：菱形折纸身体 + 头颈 + 翅膀
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 4 L17 12 L12 20 L7 12 Z" fill="currentColor" opacity=".92" />
        <path d="M12 4 Q8.5 2.2 6.8 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6.6 5.8 L8.8 5.1 L7.9 7.3 Z" fill="currentColor" />
        <path d="M7 12 Q3 9 3.4 5.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17 12 Q21 9 20.6 5.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
      </svg>
    );
  }
  if (variant === "star") {
    // 星船：五角星帆 + 船身
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M12 3.4 L13.3 6.3 L16.5 6.7 L14.2 8.9 L14.9 12.1 L12 10.5 L9.1 12.1 L9.8 8.9 L7.5 6.7 L10.7 6.3 Z"
          fill="currentColor"
        />
        <path d="M12 3.4 V13" stroke="currentColor" strokeWidth="1.1" />
        <path d="M3.5 14.2 Q12 18.6 20.5 14.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  // paper：三角帆 + 弧线船身（品牌同源）
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4.5 19 11h-7z" fill="currentColor" />
      <path d="M2.5 13.5Q12 17.5 21.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
