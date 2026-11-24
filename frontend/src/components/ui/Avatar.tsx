interface AvatarProps {
  name: string;
  url: string | null;
  size?: 'sm' | 'md';
}

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm' };

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function Avatar({ name, url, size = 'md' }: AvatarProps) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-accent text-white flex items-center justify-center font-medium`}>
      {initials(name)}
    </div>
  );
}
