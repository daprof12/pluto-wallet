interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  onClick?: () => void;
  className?: string;
  textClassName?: string;
  variant?: 'default' | 'gradient-text';
}

export default function Logo({ 
  size = 'md', 
  showText = true, 
  onClick, 
  className = '', 
  textClassName = '',
  variant = 'default' 
}: LogoProps) {
  const sizes = {
    sm: { box: 'w-8 h-8', svg: '20', text: 'text-xl' },
    md: { box: 'w-12 h-12', svg: '32', text: 'text-4xl' },
    lg: { box: 'w-16 h-16', svg: '42', text: 'text-5xl' },
    xl: { box: 'w-20 h-20', svg: '52', text: 'text-6xl' }
  };

  const sizeConfig = sizes[size];

  const textClass = variant === 'gradient-text' 
    ? 'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent'
    : 'text-white';

  return (
    <div 
      onClick={onClick} 
      className={`inline-flex items-center gap-3 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
    >
      <div className={`${sizeConfig.box} bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center`}>
        <svg width={sizeConfig.svg} height={sizeConfig.svg} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3L10 3L10 10L3 10L3 3Z" fill="white"/>
          <path d="M3 14L10 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      {showText && (
        <h1 className={`${sizeConfig.text} ${textClassName || textClass} tracking-tight`}>Pluto</h1>
      )}
    </div>
  );
}
