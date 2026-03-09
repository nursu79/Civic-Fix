'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion, useScroll, useTransform, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  ArrowRight, 
  Search, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2,
  FileText,
  ThumbsUp,
  Wrench,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Magnetic } from '@/components/ui';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// Luxury Animation Variants - Snappy Spring
const fadeInUp: any = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export default function HomePage() {
  const t = useTranslations();
  const heroT = useTranslations('hero');
  const statsT = useTranslations('stats');
  const common = useTranslations('common');
  const howItWorksT = useTranslations('howItWorks');
  const locale = useLocale();
  const isAmharic = locale === 'am';
  const supabase = createClient();
  
  const [counts, setCounts] = useState({ reported: 0, resolved: 0, users: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: issuesCount }, { count: resolvedCount }, { count: usersCount }] = await Promise.all([
        supabase.from('issues').select('*', { count: 'exact', head: true }),
        supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ]);
      
      setCounts({
        reported: issuesCount || 2847,
        resolved: resolvedCount || 1923,
        users: usersCount || 12450
      });
    };
    fetchStats();
  }, [supabase]);

  const stats = [
    { 
      value: counts.reported.toLocaleString(), 
      label: t('stats.issuesReported'), 
      icon: FileText
    },
    { 
      value: counts.resolved.toLocaleString(), 
      label: t('stats.issuesResolved'), 
      icon: CheckCircle2
    },
    { 
      value: counts.users.toLocaleString(), 
      label: t('stats.activeUsers'), 
      icon: Users
    },
    { 
      value: '3.2', 
      label: t('stats.avgResponseTime'), 
      suffix: t('stats.days'),
      icon: Clock
    },
  ];

  // Scroll Hook
  const { scrollY } = useScroll();
  const prefersReducedMotion = useReducedMotion();

  // Hero Scroll Transforms
  const heroTextY = useTransform(scrollY, [0, 300], [0, -50]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const parallaxY = useTransform(scrollY, [0, 1000], [0, 150]); // Speed 0.15

  // Impact Reveal Variant
  const impactReveal = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  // Snappy Reveal Logic (Restored)
  const revealProps = {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, amount: 0.1 },
    variants: fadeInUp
  };

  return (
    <div className="relative overflow-hidden selection:bg-teal-primary/30 bg-[#F8F9FA]">
      {/* Hero Depth - Layered Mesh Gradient */}
      <div className="hero-depth-glow" />
      
      {/* Architectural Grid Overlay */}
      <div className="absolute inset-0 bg-[var(--blueprint-grid)] bg-[length:var(--blueprint-size)] opacity-100 pointer-events-none z-1" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-32 pb-20 px-6 lg:px-8 overflow-hidden bg-transparent">
        <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Left Content: Typography Stack */}
          <motion.div
            style={!prefersReducedMotion ? { y: heroTextY, opacity: heroOpacity } : {}}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-left space-y-8 relative z-20"
          >
            <motion.div variants={fadeInUp}>
              <div className="tag-instrument inline-flex">
                {isAmharic ? "የከተማዎ መሪ የቴክኖሎጂ መድረክ" : "The Nation's Leading Civic Platform"}
              </div>
            </motion.div>

            <div className="overflow-hidden">
              <motion.h1 
                variants={{
                  hidden: { y: 100, opacity: 0 },
                  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 20 } }
                }}
                className={cn(
                  "text-6xl md:text-7xl lg:text-8xl xl:text-8xl font-bold tracking-tighter text-deep-navy leading-[0.85] font-['Instrument_Sans']",
                  isAmharic && "font-['Menbere'] font-light text-6xl lg:text-7xl leading-[1.4]"
                )}
              >
                <div className="flex flex-col">
                  <span className={cn(isAmharic && "origin-left mb-2")}>
                    {isAmharic ? "አዲስ" : "TRANSFORM"}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className={cn(isAmharic && "origin-left")}>
                      {isAmharic ? "አበባን" : "YOUR"}
                    </span>
                    <span className="text-teal-primary font-light lowercase tracking-tighter">
                      {isAmharic ? "እናሳምር" : "city"}
                    </span>
                  </span>
                </div>
              </motion.h1>
            </div>

            <motion.p 
              variants={fadeInUp}
              className={cn(
                "text-lg sm:text-xl text-slate-gray max-w-xl font-medium leading-relaxed",
                isAmharic && 'font-ethiopic'
              )}
            >
              {t('hero.subtitle')}
            </motion.p>
            
            {/* ... Buttons ... */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-4">
              <Link href={`/${locale}/report`}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button size="xl" className="px-10 h-14 sm:px-12 sm:h-16 text-lg rounded-2xl shadow-xl shadow-teal-900/10 bg-teal-primary hover:bg-teal-primary/90 transition-all duration-300 font-bold tracking-tight">
                    {t('hero.cta')}
                  </Button>
                </motion.div>
              </Link>
              
              <Link href={`/${locale}/issues`}>
                <motion.div
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.98 }}
                >
                  <Button variant="outline" size="xl" className="px-10 h-14 sm:px-12 sm:h-16 text-lg rounded-2xl border-teal-primary/20 hover:bg-teal-primary/5 text-teal-primary font-bold tracking-tight">
                    {t('hero.ctaSecondary')}
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Content: Visual Anchor */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ 
              opacity: 1, 
              x: 0,
              y: [0, -20, 0] 
            }}
            transition={{ 
              opacity: { delay: 0.4, duration: 0.8 },
              x: { delay: 0.4, duration: 0.8 },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
            }}
            className="relative hidden lg:block z-10 pl-12"
          >
            <div className="relative w-full aspect-[4/5] max-w-lg ml-auto">
              {/* Geometric Shape Container */}
              <div className="absolute inset-0 bg-teal-primary/10 rounded-[3rem] rotate-3 -z-10" />
              <div className="absolute inset-0 border border-teal-primary/20 rounded-[3rem] -rotate-3 -z-10" />
              
              <div className="w-full h-full overflow-hidden rounded-[3rem] shadow-2xl relative group bg-white">
                <motion.img 
                  src="/Gemini_Generated_Image_kzs5gjkzs5gjkzs5.png" 
                  alt="Addis Ababa Commercial Bank Headquarters" 
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                  style={!prefersReducedMotion ? { y: parallaxY, willChange: "transform" } : {}}
                />
                <div className="absolute inset-0 bg-teal-900/20 mix-blend-multiply pointer-events-none transition-opacity duration-700 group-hover:opacity-40" />
              </div>

              {/* Float Card / Badge */}
              <Magnetic>
                <motion.div 
                  className="absolute -bottom-10 -left-10 p-6 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-zinc-200/50 z-20 max-w-[200px]"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-teal-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-teal-primary" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-teal-primary">
                      Locate Me
                    </div>
                  </div>
                  <div className="text-sm font-bold text-deep-navy leading-tight">
                    {isAmharic ? "የአዲስ አበባን የወደፊት እጣ ፈንታ በካርታ ለማዘጋጀት ያግዙ።" : "Help map the future of Addis Ababa."}
                  </div>
                </motion.div>
              </Magnetic>
            </div>
          </motion.div>

        </div>

        {/* Live Status Ticker - Re-positioned */}
        <div className="absolute bottom-12 left-8 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-zinc-200/50 shadow-sm animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-primary"></span>
          </span>
          <span className={cn(
            "text-[10px] font-bold tracking-widest uppercase text-slate-gray",
            isAmharic && "font-ethiopic"
          )}>
            {isAmharic ? `ቀጥታ፡ ${counts.resolved.toLocaleString()} ችግሮች ተፈተዋል` : `Live: ${counts.resolved.toLocaleString()} Issues Resolved`}
          </span>
        </div>
      </section>

      {/* Impact Section - Bento Grid */}
      <section className="py-32 px-6 lg:px-12 bg-[#F8F9FA] border-b border-zinc-100/50 relative z-20">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Card 1: Wide Visual (Top Left) */}
            <div className="lg:col-span-2 relative h-[400px] lg:h-[480px] rounded-[2rem] overflow-hidden group shadow-2xl shadow-teal-900/5">
              <img 
                src="/Gemini_Generated_Image_nkglkynkglkynkgl.png" 
                alt="Community Impact" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-deep-navy/40 to-deep-navy/90 opacity-70" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest text-white/90",
                    isAmharic && "font-['Menbere'] font-medium text-sm"
                  )}>
                    {isAmharic ? "ችግሮች ተፈተዋል" : "Fixed Issues"}
                  </span>
                </div>
                <h3 className={cn(
                  "text-3xl sm:text-4xl font-bold text-white leading-tight drop-shadow-sm",
                  isAmharic && "font-['Menbere'] font-medium text-[2.5rem] leading-normal"
                )}>
                  {isAmharic ? "የከተማችንን ገጽታ በጋራ እንለውጣለን።" : "Transforming our city, one report at a time."}
                </h3>
              </div>
            </div>

            {/* Card 2: Tall Data (Right Column) */}
            <div className="lg:col-span-1 lg:row-span-2 h-auto lg:h-full min-h-[500px] rounded-[2rem] bg-white p-8 lg:p-10 shadow-xl shadow-teal-900/5 border border-zinc-100/50 flex flex-col justify-between group hover:border-teal-primary/20 transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-primary/10 flex items-center justify-center mb-6 text-teal-primary">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className={cn(
                  "text-sm font-bold text-deep-navy mb-2 uppercase tracking-widest",
                  isAmharic && "font-['Menbere'] font-medium text-xl tracking-normal normal-case"
                )}>
                  {isAmharic ? "የቀጥታ ስታቲስቲክስ" : "Live Statistics"}
                </h3>
                <p className={cn(
                  "text-slate-gray font-medium mb-12 text-lg",
                  isAmharic && "font-['Menbere']"
                )}>
                  {isAmharic ? "የህዝብ ተሳትፎ እና ምላሽ" : "Community engagement metrics"}
                </p>

                <div className="space-y-8">
                  <div>
                    <div className="text-5xl font-extrabold text-deep-navy tracking-tighter mb-1">
                      {counts.reported.toLocaleString()}
                    </div>
                    <div className={cn("text-xs font-bold uppercase tracking-widest text-slate-400", isAmharic && "font-['Menbere'] text-sm")}>
                      {isAmharic ? "ሪፖርት የተደረጉ" : "Reported"}
                    </div>
                  </div>
                  <div>
                    <div className="text-5xl font-extrabold text-teal-primary tracking-tighter mb-1">
                      {counts.resolved.toLocaleString()}
                    </div>
                    <div className={cn("text-xs font-bold uppercase tracking-widest text-teal-600/60", isAmharic && "font-['Menbere'] text-sm")}>
                      {isAmharic ? "የተፈቱ" : "Resolved"}
                    </div>
                  </div>
                  <div>
                    <div className="text-5xl font-extrabold text-deep-navy tracking-tighter mb-1">
                      3.2<span className="text-2xl text-slate-gray/40 ml-1">days</span>
                    </div>
                    <div className={cn("text-xs font-bold uppercase tracking-widest text-slate-400", isAmharic && "font-['Menbere'] text-sm")}>
                      {isAmharic ? "አማካይ ምላሽ ጊዜ" : "Avg Response Time"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-8 mt-8 border-t border-zinc-100">
                <Button variant="ghost" className="w-full justify-between group-hover:bg-teal-50/50 transition-colors">
                  <span className={cn(isAmharic && "font-['Menbere'] font-medium text-lg")}>
                    {isAmharic ? "ሙሉ ሪፖርት ይመልከቱ" : "View Full Report"}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>

            {/* Card 3: Quote (Bottom Left) */}
            <div className="lg:col-span-2 h-[300px] rounded-[2rem] bg-[#E0F2F1] p-10 flex items-center justify-center shadow-lg shadow-teal-900/5 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-teal-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
               <div className="absolute bottom-0 right-0 w-48 h-48 bg-teal-primary/5 rounded-full translate-x-1/3 translate-y-1/3" />
               
               <div className="relative z-10 text-center max-w-2xl">
                 <div className="mb-6 opacity-20">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-teal-900 mx-auto">
                     <path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H9C9.55228 16 10 15.5523 10 15V9C10 8.44772 9.55228 8 9 8H5C4.44772 8 4 8.44772 4 9V18C4 19.6569 5.34315 21 7 21H14.017ZM21 21L21 18C21 16.8954 20.1046 16 19 16H15.9825C16.5348 16 16.9825 15.5523 16.9825 15V9C16.9825 8.44772 16.5348 8 15.9825 8H12.0175C11.4652 8 11.0175 8.44772 11.0175 9V18C11.0175 19.6569 12.3607 21 14.0175 21H21Z" />
                   </svg>
                 </div>
                 <blockquote className={cn(
                   "text-2xl md:text-3xl lg:text-4xl font-serif text-teal-900 leading-snug mb-6",
                   isAmharic && "font-['Menbere'] font-medium text-[2rem] not-italic"
                 )}>
                   &quot;{isAmharic ? "በመጨረሻም ችግራችንን የሚሰማ እና መፍትሄ የሚሰጥ ፕላትፎርም ተገኘ።" : "Finally, a platform that actually connects us to real solutions."}&quot;
                 </blockquote>
                 <div className="flex items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-200/50 flex items-center justify-center text-teal-800 font-bold text-xs">A</div>
                    <cite className={cn("not-italic font-bold text-teal-800 tracking-wide text-sm uppercase", isAmharic && "font-['Menbere']")}>
                      {isAmharic ? "አበበ ከቦሌ" : "Abebe from Bole"}
                    </cite>
                 </div>
               </div>
            </div>
            
          </div>
        </motion.div>
      </section>

      {/* How it Works - Editorial Staggered Layout */}
      <section className="py-32 px-6 lg:px-8 bg-[#F8F9FA] relative z-20 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-36">
          
          {/* Section Header */}
          <div className="text-center mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="tag-instrument inline-flex mb-6"
            >
              {isAmharic ? 'እንዴት እንደሚሰራ' : 'Deep Dive'}
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className={cn(
                "text-5xl md:text-7xl font-extrabold text-deep-navy tracking-tighter leading-tight",
                isAmharic && 'font-ethiopic heading-ethiopic'
              )}
            >
              {t('howItWorks.title')}
            </motion.h2>
          </div>

          {[
            { 
              id: 1,
              title: t('howItWorks.step1Title'),
              desc: t('howItWorks.step1Desc'),
              align: 'left',
              image: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&q=80&w=800",
              num: "01"
            },
            { 
              id: 2,
              title: t('howItWorks.step2Title'),
              desc: t('howItWorks.step2Desc'),
              align: 'right', // Overlap logic handled in mapping
              image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=800",
              num: "02"
            },
            { 
              id: 3,
              title: t('howItWorks.step3Title'),
              desc: t('howItWorks.step3Desc'),
              align: 'center',
              image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
              num: "03"
            }
          ].map((step, index) => {
            const isRight = step.align === 'right';
            const isCenter = step.align === 'center';
            
            return (
              <div 
                key={step.id} 
                className={cn(
                  "flex flex-col md:flex-row items-center gap-12 lg:gap-24 relative",
                  isRight && "md:flex-row-reverse -mt-0 md:-mt-12", // Overlap for Step 2
                  isCenter && "flex-col text-center mt-24"
                )}
              >
                {/* Image Side */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                  className={cn(
                    "w-full md:w-1/2 relative group",
                    isCenter && "w-full max-w-4xl mx-auto md:w-full"
                  )}
                >
                  <div className={cn(
                    "relative overflow-hidden rounded-[3rem] border border-teal-500/10 bg-white shadow-sm transition-all duration-700 ease-in-out",
                    // Alive Interaction: Default State
                    "filter grayscale sepia-[0.1] blur-[1px] scale-[0.98]",
                    // Alive Interaction: Focus/Hover State
                    "group-hover:filter-none group-hover:blur-0 group-hover:scale-100",
                    "in-view:filter-none in-view:blur-0 in-view:scale-100" // Custom class logic or just use Framer variants below for cleaner control
                  )}>
                      {/* "Waking Up" Image Effect */}
                     <motion.div
                       className="w-full h-full relative"
                       initial={{ filter: "grayscale(1) blur(4px)", scale: 0.98, opacity: 0 }}
                       whileInView={{ filter: "grayscale(0) blur(0px)", scale: 1, opacity: 1 }}
                       transition={{ duration: 0.8, ease: "easeOut" }}
                       viewport={{ once: false, amount: 0.3 }}
                     >
                        <img 
                          src={step.image} 
                          alt={step.title} 
                          className={cn(
                            "w-full object-cover",
                             isCenter ? "aspect-[21/9]" : "aspect-[4/5]"
                          )}
                        />
                     </motion.div>

                     {/* Number Badge */}
                     <div className="absolute top-8 left-8 text-8xl font-black text-white/20 mix-blend-overlay leading-none select-none pointer-events-none">
                       {step.num}
                     </div>
                  </div>
                </motion.div>

                {/* Text Side - Staggered Reveal */}
                <motion.div 
                  initial="hidden" 
                  whileInView="visible" 
                  viewport={{ once: true }}
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={cn(
                    "w-full md:w-1/2 z-10",
                    isCenter && "w-full max-w-2xl mx-auto text-center"
                  )}
                >
                  <div className={cn("inline-flex items-center gap-4 mb-6", isCenter && "justify-center")}>
                    <span className="w-12 h-px bg-teal-primary/30" />
                    <span className="text-sm font-bold uppercase tracking-widest text-teal-primary">{isAmharic ? `ደረጃ ${step.num}` : `Step ${step.num}`}</span>
                  </div>
                  
                  <h3 className={cn("text-4xl md:text-5xl font-bold text-deep-navy mb-6 leading-tight", isAmharic && "font-['Menbere'] font-medium text-[2.5rem]")}>
                    {step.title}
                  </h3>
                  
                  <p className={cn("text-xl leading-relaxed text-slate-gray font-medium", isAmharic && "font-['Menbere']")}>
                    {step.desc}
                  </p>
                </motion.div>
                
              </div>
            );
          })}

        </div>
      </section>

      {/* Final Action - Flush Layout, Parallax, White Text */}
      <section className="relative h-screen min-h-[800px] flex items-center justify-center overflow-hidden mt-0 pt-0">
        {/* Background Layer with Parallax */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div 
            style={{ y: parallaxY }} // Defined in component body
            className="w-full h-[120%] -top-[10%] relative" // Extra height for parallax movement
          >
            <img 
              src="/Gemini_Generated_Image_l1lso1l1lso1l1ls.png" 
              alt="Addis Ababa Teal Skyline" 
              className="w-full h-full object-cover blur-[2px] scale-105" 
            />
          </motion.div>
          <div className="absolute inset-0 bg-slate-950/80" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
          >
            <h2 className={cn(
              "font-black text-white mb-12 tracking-tighter leading-[0.9] uppercase drop-shadow-2xl",
              isAmharic 
                ? 'font-ethiopic heading-ethiopic text-5xl sm:text-6xl md:text-7xl' // Approx 85% visual weight
                : 'text-6xl sm:text-7xl md:text-8xl'
            )}>
              {isAmharic ? 'የማህበረሰብህን ለውጥ ዛሬውኑ ጀምር' : 'Empower. Report. Resolve. Your City. Your Voice.'}
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <Link href={`/${locale}/report`}>
                <Button 
                  size="xl" 
                  className="group px-12 h-20 text-xl rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-teal-primary hover:border-teal-primary transition-all duration-300 shadow-2xl"
                >
                  <span className="font-bold tracking-widest uppercase">{t('hero.cta')}</span>
                  <ArrowRight className="ml-4 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
