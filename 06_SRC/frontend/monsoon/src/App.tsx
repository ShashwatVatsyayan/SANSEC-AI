import Navbar from './components/Navbar';
import Hero from './components/Hero';
import './index.css';

export default function App() {
  return (
    <div className="w-full min-h-screen">
      <Navbar />
      <Hero />
    </div>
  );
}
