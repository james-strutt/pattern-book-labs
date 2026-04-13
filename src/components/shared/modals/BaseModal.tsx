import { X } from 'lucide-react';
import React from 'react';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'default' | 'large' | 'xl';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'default',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = ''
}) => {
  const sizeClasses: Record<string, string> = {
    small: 'max-w-md',
    default: 'max-w-2xl',
    large: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  React.useEffect(() => {
    if (!closeOnEscape) return;
    
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return (): void => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  const handleBackdropKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        {...(closeOnBackdrop && {
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Close modal',
          onClick: onClose,
          onKeyDown: handleBackdropKeyDown
        })}
      />
      
      <div className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col ${className}`}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #CDD3D6' }}>
          <h2 className="text-xl font-bold" style={{ color: '#22272B' }}>
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#22272B' }} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BaseModal;

