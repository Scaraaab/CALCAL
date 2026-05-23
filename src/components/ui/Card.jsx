import { motion } from 'framer-motion';

export default function Card({ children, className = '', soft = false, as = 'div', ...rest }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`${soft ? 'card-soft' : 'card'} ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  );
}
