export default function Card({ children, className = '', soft = false, as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={`${soft ? 'card-soft' : 'card'} animate-slide-up ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
