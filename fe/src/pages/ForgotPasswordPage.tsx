import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/ToastContext";
import { authApi } from "@/api/auth";
import logo from "@/assets/syncra-logo.png";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ size = 12, maxDistance = 5, pupilColor = "black", forceLookX, forceLookY }: PupilProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  const calc = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = pupilRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = Math.min(Math.sqrt((mouseX - cx) ** 2 + (mouseY - cy) ** 2), maxDistance);
    const a = Math.atan2(mouseY - cy, mouseX - cx);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  };

  const p = calc();
  return <div ref={pupilRef} className="rounded-full" style={{ width: size, height: size, backgroundColor: pupilColor, transform: `translate(${p.x}px,${p.y}px)`, transition: 'transform 0.1s ease-out' }} />;
};

interface EyeBallProps {
  size?: number; pupilSize?: number; maxDistance?: number; eyeColor?: string; pupilColor?: string;
  isBlinking?: boolean; forceLookX?: number; forceLookY?: number;
}

const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "black", isBlinking = false, forceLookX, forceLookY }: EyeBallProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  const calc = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = eyeRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = Math.min(Math.sqrt((mouseX - cx) ** 2 + (mouseY - cy) ** 2), maxDistance);
    const a = Math.atan2(mouseY - cy, mouseX - cx);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  };

  const p = calc();
  return (
    <div ref={eyeRef} className="rounded-full flex items-center justify-center transition-all duration-150" style={{ width: size, height: isBlinking ? 2 : size, backgroundColor: eyeColor, overflow: 'hidden' }}>
      {!isBlinking && <div className="rounded-full" style={{ width: pupilSize, height: pupilSize, backgroundColor: pupilColor, transform: `translate(${p.x}px,${p.y}px)`, transition: 'transform 0.1s ease-out' }} />}
    </div>
  );
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  useEffect(() => {
    document.body.classList.add('bg-brand-canvas', 'text-brand-ink');
    document.body.style.backgroundColor = '#fffefb';
    document.body.style.color = '#201515';
    document.body.style.backgroundImage = 'none';
    return () => {
      document.body.classList.remove('bg-brand-canvas', 'text-brand-ink');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.body.style.backgroundImage = '';
    };
  }, []);

  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => { setIsPurpleBlinking(true); setTimeout(() => { setIsPurpleBlinking(false); schedule(); }, 150); }, Math.random() * 4000 + 3000);
      return t;
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => { setIsBlackBlinking(true); setTimeout(() => { setIsBlackBlinking(false); schedule(); }, 150); }, Math.random() * 4000 + 3000);
      return t;
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 3;
    const dx = mouseX - cx, dy = mouseY - cy;
    return { faceX: Math.max(-15, Math.min(15, dx / 20)), faceY: Math.max(-10, Math.min(10, dy / 30)), bodySkew: Math.max(-6, Math.min(6, -dx / 120)) };
  };

  const purplePos = calcPos(purpleRef);
  const blackPos = calcPos(blackRef);
  const yellowPos = calcPos(yellowRef);
  const orangePos = calcPos(orangeRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Something went wrong. Please try again.';
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <button onClick={() => navigate('/')} className="fixed top-4 right-4 z-50 size-10 flex items-center justify-center rounded-full bg-brand-canvas border border-brand-border text-brand-body-mid hover:text-brand-ink hover:bg-brand-canvas-soft transition-colors" aria-label="Back to homepage"><X className="size-5" /></button>
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-primary/90 via-brand-primary to-brand-primary/80 p-12 text-brand-on-primary">
          <div className="relative z-20">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <img src={logo} alt="Syncra" className="h-8 w-8 object-contain" />
              <span>Syncra</span>
            </div>
          </div>
          <div className="relative z-20 flex items-end justify-center h-[500px]">
            <div className="relative" style={{ width: '550px', height: '400px' }}>
              <div className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: '70px', width: '180px', height: '400px', backgroundColor: '#6C3FF5', borderRadius: '10px 10px 0 0', zIndex: 1, transform: `skewX(${purplePos.bodySkew}deg)`, transformOrigin: 'bottom center' }} />
              <div className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: '240px', width: '120px', height: '310px', backgroundColor: '#2D2D2D', borderRadius: '8px 8px 0 0', zIndex: 2, transform: `skewX(${blackPos.bodySkew}deg)`, transformOrigin: 'bottom center' }} />
              <div className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: '0px', width: '240px', height: '200px', zIndex: 3, backgroundColor: '#FF9B6B', borderRadius: '120px 120px 0 0', transform: `skewX(${orangePos.bodySkew}deg)`, transformOrigin: 'bottom center' }} />
              <div className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: '310px', width: '140px', height: '230px', backgroundColor: '#E8D754', borderRadius: '70px 70px 0 0', zIndex: 4, transform: `skewX(${yellowPos.bodySkew}deg)`, transformOrigin: 'bottom center' }} />
            </div>
          </div>
          <div className="relative z-20 flex items-center gap-8 text-sm text-brand-on-primary/60">
            <a href="#" className="hover:text-brand-on-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-on-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-brand-on-primary transition-colors">Contact</a>
          </div>
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute top-1/4 right-1/4 size-64 bg-brand-on-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 size-96 bg-brand-on-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="flex items-center justify-center p-8 bg-brand-canvas">
          <div className="w-full max-w-[420px]">
            <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
              <img src={logo} alt="Syncra" className="h-8 w-8 object-contain" />
              <span className="text-brand-ink">Syncra</span>
            </div>
            <div className="bg-brand-canvas rounded-brand-md w-full flex flex-col gap-6 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-brand-ink mb-2">Check your email</h1>
              <p className="text-brand-body-mid text-sm leading-relaxed">
                If an account with that email exists, a password reset link has been sent.
              </p>
              <button onClick={() => navigate('/login')} className="w-full h-12 text-base font-semibold bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary rounded-brand-md transition-colors">Back to sign in</button>
            </div>
            <div className="text-center text-sm text-brand-body-mid mt-8">
              Remember your password?{" "}
              <Link to="/login" className="text-brand-ink font-medium hover:underline">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Back to homepage */}
      <button onClick={() => navigate('/')} className="fixed top-4 right-4 z-50 size-10 flex items-center justify-center rounded-full bg-brand-canvas border border-brand-border text-brand-body-mid hover:text-brand-ink hover:bg-brand-canvas-soft transition-colors" aria-label="Back to homepage"><X className="size-5" /></button>

      {/* Left Content Section */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-primary/90 via-brand-primary to-brand-primary/80 p-12 text-brand-on-primary">
        <div className="relative z-20">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <img src={logo} alt="Syncra" className="h-8 w-8 object-contain" />
            <span>Syncra</span>
          </div>
        </div>

        <div className="relative z-20 flex items-end justify-center h-[500px]">
          <div className="relative" style={{ width: '550px', height: '400px' }}>
            <div ref={purpleRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: '70px', width: '180px', height: '400px', backgroundColor: '#6C3FF5', borderRadius: '10px 10px 0 0', zIndex: 1, transform: `skewX(${purplePos.bodySkew}deg)`, transformOrigin: 'bottom center' }}>
              <div className="absolute flex gap-8 transition-all duration-700 ease-in-out" style={{ left: `${45 + purplePos.faceX}px`, top: `${40 + purplePos.faceY}px` }}>
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking} />
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking} />
              </div>
            </div>
            <div ref={blackRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: '240px', width: '120px', height: '310px', backgroundColor: '#2D2D2D', borderRadius: '8px 8px 0 0', zIndex: 2, transform: `skewX(${blackPos.bodySkew}deg)`, transformOrigin: 'bottom center' }}>
              <div className="absolute flex gap-6 transition-all duration-700 ease-in-out" style={{ left: `${26 + blackPos.faceX}px`, top: `${32 + blackPos.faceY}px` }}>
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking} />
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking} />
              </div>
            </div>
            <div ref={orangeRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: '0px', width: '240px', height: '200px', zIndex: 3, backgroundColor: '#FF9B6B', borderRadius: '120px 120px 0 0', transform: `skewX(${orangePos.bodySkew}deg)`, transformOrigin: 'bottom center' }}>
              <div className="absolute flex gap-8 transition-all duration-200 ease-out" style={{ left: `${82 + (orangePos.faceX || 0)}px`, top: `${90 + (orangePos.faceY || 0)}px` }}>
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
              </div>
            </div>
            <div ref={yellowRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: '310px', width: '140px', height: '230px', backgroundColor: '#E8D754', borderRadius: '70px 70px 0 0', zIndex: 4, transform: `skewX(${yellowPos.bodySkew}deg)`, transformOrigin: 'bottom center' }}>
              <div className="absolute flex gap-6 transition-all duration-200 ease-out" style={{ left: `${52 + (yellowPos.faceX || 0)}px`, top: `${40 + (yellowPos.faceY || 0)}px` }}>
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" />
              </div>
              <div className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out" style={{ left: `${40 + (yellowPos.faceX || 0)}px`, top: `${88 + (yellowPos.faceY || 0)}px` }} />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-brand-on-primary/60">
          <a href="#" className="hover:text-brand-on-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-brand-on-primary transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-brand-on-primary transition-colors">Contact</a>
        </div>

        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-brand-on-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-brand-on-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Right Forgot Password Section */}
      <div className="flex items-center justify-center p-8 bg-brand-canvas">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
            <img src={logo} alt="Syncra" className="h-8 w-8 object-contain" />
            <span className="text-brand-ink">Syncra</span>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-brand-ink mb-2">Forgot password?</h1>
            <p className="text-brand-body-mid text-sm">Enter your email and we'll send you a reset link.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="anna@gmail.com"
                value={email}
                autoComplete="off"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
            </div>

            <button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary rounded-brand-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className="text-center text-sm text-brand-body-mid mt-8">
            Remember your password?{" "}
            <Link to="/login" className="text-brand-ink font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
