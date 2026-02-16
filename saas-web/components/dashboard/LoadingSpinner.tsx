'use client';

const sizes = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div
        className={`${sizes[size]} rounded-full border-brand/30 border-t-brand animate-spin`}
      />
    </div>
  );
}
