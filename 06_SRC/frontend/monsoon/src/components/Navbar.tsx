import { motion } from 'framer-motion';

const INK = '#1f1f1f';
const navLinks = ["Product", "Solutions", "Pricing", "Resources", "About", "Contact"];

export default function Navbar() {
  return (
    <div style={{ position: 'fixed', top: '18px', left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
      <motion.nav
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          display: 'flex', alignItems: 'center', gap: '36px',
          padding: '11px 22px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(255,255,255,0.65)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        }}
      >
        <span style={{ fontSize: '17px', fontWeight: 700, color: INK, letterSpacing: '-0.01em' }}>Monsoon</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(40,40,40,0.72)', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color 0.2s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = INK; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(40,40,40,0.72)'; }}
            >
              {link}
            </a>
          ))}
        </div>
      </motion.nav>
    </div>
  );
}
