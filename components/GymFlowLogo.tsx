import Image from 'next/image';

type Props = {
  size?: number;
  className?: string;
};

export default function GymFlowLogo({ size = 32, className }: Props) {
  return (
    <Image
      src="/gymflow-logo.png"
      alt="GymFlow logo"
      width={size}
      height={size}
      className={className}
    />
  );
}
