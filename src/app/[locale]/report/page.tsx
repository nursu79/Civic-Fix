"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Upload,
  X,
  Route,
  Droplets,
  Trash2,
  Lightbulb,
  ShieldAlert,
  Trees,
  ChevronRight,
} from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { Category, categories, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

import { LocationPicker } from "@/components/map/LocationPicker";

const steps = [
  { key: "category", icon: Route },
  { key: "location", icon: MapPin },
  { key: "details", icon: Upload },
  { key: "review", icon: Check },
];

const iconMap = {
  roads: Route,
  water: Droplets,
  sanitation: Trash2,
  lighting: Lightbulb,
  safety: ShieldAlert,
  parks: Trees,
};

interface FormData {
  category: Category | null;
  location: { lat: number; lng: number } | null;
  address: string;
  title: string;
  description: string;
  images: File[];
}

const fadeIn = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export default function ReportPage() {
  const t = useTranslations('report');
  const common = useTranslations('common');
  const locale = useLocale();
  const isAmharic = locale === "am";

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    category: null,
    location: null,
    address: "",
    title: "",
    description: "",
    images: [],
  });

  const supabase = createClient();

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.category !== null;
      case 1:
        return formData.location !== null;
      case 2:
        return formData.title.length > 0 && formData.description.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<unknown[] | null>(null);

  const handleSubmit = async () => {
    setSubmitError(null);
    setDuplicates(null);
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setSubmitError(t('signInRequired'));
        setIsSubmitting(false);
        return;
      }

      let imageUrls: string[] = [];
      if (formData.images.length > 0) {
        const bucket = "issue-attachments";
        const prefix = `${session.user.id}/${Date.now()}`;
        for (let i = 0; i < formData.images.length; i++) {
          const file = formData.images[i];
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${prefix}/${i}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true });
          if (uploadError) {
            setSubmitError(`${t('uploadFailed')}: ${uploadError.message}`);
            setIsSubmitting(false);
            return;
          }
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        }
      }

      const body = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category!,
        lat: formData.location?.lat ?? null,
        lng: formData.location?.lng ?? null,
        address: formData.address.trim() || null,
        images: imageUrls,
      };

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(data?.error || `Request failed (${res.status})`);
        setIsSubmitting(false);
        return;
      }

      if (
        data.warning &&
        Array.isArray(data.duplicates) &&
        data.duplicates.length > 0
      ) {
        setDuplicates(data.duplicates);
        setIsSubmitting(false);
        return;
      }

      if (data.issue) {
        setIsSuccess(true);
      } else {
        setSubmitError(t('noIssueReturned'));
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t('genericError'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...files].slice(0, 5), // Max 5 images
    }));
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20"
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>
          <h1
            className={cn(
              "text-3xl sm:text-4xl font-extrabold text-deep-navy mb-4 tracking-tight",
              isAmharic && "font-ethiopic",
            )}
          >
            {t("success")}
          </h1>
          <p
            className={cn(
              "text-slate-500 text-lg mb-10 max-w-md mx-auto",
              isAmharic && "font-ethiopic",
            )}
          >
            {t("successDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/${locale}/issues`}>
              <Button variant="ghost" className="rounded-full px-8">
                {common("browseIssues")}
              </Button>
            </Link>
            <Link href={`/${locale}/dashboard`}>
              <Button className="rounded-full px-8 bg-teal-primary hover:bg-teal-600 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                {t('viewDashboard')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32 relative">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-zinc-200/50 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={currentStep > 0 ? "#" : `/${locale}/dashboard`}
              onClick={(e) => {
                if (currentStep > 0) {
                  e.preventDefault();
                  handleBack();
                }
              }}
              className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-slate-600 hover:bg-zinc-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1
                className={cn(
                  "text-xl sm:text-2xl font-black text-deep-navy tracking-tight",
                  isAmharic && "font-ethiopic",
                )}
              >
                {t("title")}
              </h1>
              <p
                className={cn(
                  "text-xs font-bold uppercase tracking-widest text-slate-400",
                  isAmharic && "font-ethiopic",
                )}
              >
                {t('step')} {currentStep + 1} {common('of')} {steps.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar (Subtle) */}
      <div className="h-1 bg-zinc-100 w-full sticky top-[88px] z-30">
        <motion.div
          className="h-full bg-gradient-to-r from-teal-400 to-teal-600"
          initial={{ width: "0%" }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "circOut" }}
        />
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Category Selection (Masonry Pinterest Style) */}
          {currentStep === 0 && (
            <motion.div
              key="category"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-8"
            >
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2
                  className={cn(
                    "text-3xl md:text-4xl font-black text-deep-navy mb-4 tracking-tight",
                    isAmharic && "font-ethiopic",
                  )}
                >
                  {t("selectCategory")}
                </h2>
                <p className="text-slate-500 text-lg">
                  {t('selectCategoryDesc')}
                </p>
              </div>

              <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                {(
                  Object.entries(categories) as [
                    Category,
                    (typeof categories)[Category],
                  ][]
                ).map(([key, config], index) => {
                  const Icon = iconMap[key];
                  const isSelected = formData.category === key;

                  // Simulate staggered heights based on content or random for "Pinterest" feel
                  // We'll use specific heights for specific categories to create the rhythm
                  const heightClass =
                    key === "roads"
                      ? "h-80"
                      : key === "water"
                        ? "h-64"
                        : key === "sanitation"
                          ? "h-72"
                          : key === "lighting"
                            ? "h-64"
                            : key === "safety"
                              ? "h-80"
                              : "h-72";

                  // Dynamic colors based on category
                  const color = config.color;
                  const bgStyle = isSelected
                    ? { backgroundColor: color, borderColor: color }
                    : {};
                  const shadowStyle = isSelected
                    ? { boxShadow: `0 20px 40px -10px ${color}80` }
                    : {}; // 80 = 50% opacity
                  const ringStyle = isSelected
                    ? { boxShadow: `0 0 0 4px ${color}30` }
                    : {}; // Alternative to ring class for dynamic color

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="break-inside-avoid"
                    >
                      <button
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, category: key }))
                        }
                        className={cn(
                          "w-full rounded-[2.5rem] p-8 text-left transition-all duration-300 relative overflow-hidden group border",
                          heightClass,
                          isSelected
                            ? "text-white"
                            : "bg-white/80 backdrop-blur-sm border-zinc-100 hover:scale-[1.02]",
                        )}
                        style={{
                          ...bgStyle,
                          ...shadowStyle,
                          ...ringStyle,
                          borderColor: isSelected ? color : undefined,
                        }}
                      >
                        <div className="h-full flex flex-col justify-between relative z-10">
                          <div
                            className={cn(
                              "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors",
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-zinc-50",
                            )}
                            style={!isSelected ? { color: color } : {}}
                          >
                            <Icon className="w-8 h-8" />
                          </div>

                          <div>
                            <h3
                              className={cn(
                                "text-2xl font-bold mb-2",
                                isSelected ? "text-white" : "text-deep-navy",
                                isAmharic && "font-ethiopic",
                              )}
                            >
                              {config.label[locale as "en" | "am"]}
                            </h3>
                            <p
                              className={cn(
                                "text-sm font-medium leading-relaxed opacity-80",
                                isSelected ? "text-white/90" : "text-slate-500",
                              )}
                            >
                              {t('categoryContext')} {config.label[locale as 'en' | 'am'].toLowerCase()} {t('categoryMaintenance')}
                            </p>
                          </div>
                        </div>

                        {/* Decorative Background Blob for Active State */}
                        {isSelected && (
                          <motion.div
                            layoutId="activeBlob"
                            className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-50 pointer-events-none"
                          />
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Location */}
          {currentStep === 1 && (
            <motion.div
              key="location"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <h2
                  className={cn(
                    "text-2xl font-black text-deep-navy mb-2",
                    isAmharic && "font-ethiopic",
                  )}
                >
                  {t("pinLocation")}
                </h2>
                <p className="text-slate-500">
                  {t('pinLocationDesc')}
                </p>
              </div>

              {/* Map picker */}
              <div className="mb-8 rounded-3xl overflow-hidden shadow-xl shadow-teal-900/10 border border-zinc-200">
                <LocationPicker
                  onLocationSelect={(location) => {
                    setFormData((prev) => ({
                      ...prev,
                      location: { lat: location.lat, lng: location.lng },
                      address: location.address,
                    }));
                  }}
                  initialLocation={formData.location || undefined}
                />
              </div>

              {/* Address input */}
              <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                <Input
                  label={t("addressLabel")}
                  placeholder={
                    t('addressPlaceholder')
                  }
                  leftIcon={<MapPin className="w-5 h-5" />}
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="bg-zinc-50 border-zinc-200 focus:bg-white transition-all"
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Details */}
          {currentStep === 2 && (
            <motion.div
              key="details"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center mb-8">
                <h2
                  className={cn(
                    "text-2xl font-black text-deep-navy mb-2",
                    isAmharic && "font-ethiopic",
                  )}
                >
                  {t("addDetails")}
                </h2>
                <p className="text-slate-500">
                  {t('addDetailsDesc')}
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-teal-900/5 space-y-6">
                <Input
                  label={t("titleLabel")}
                  placeholder={t("titlePlaceholder")}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="bg-zinc-50 border-zinc-200"
                />

                <Textarea
                  label={t("descriptionLabel")}
                  placeholder={t("descriptionPlaceholder")}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="bg-zinc-50 border-zinc-200 min-h-[150px]"
                />

                {/* Image upload */}
                <div>
                  <label
                    className={cn(
                      "block text-sm font-bold text-slate-700 uppercase tracking-wide mb-3",
                      isAmharic && "font-ethiopic",
                    )}
                  >
                    {t("photosLabel")}
                  </label>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                    {formData.images.map((file, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-2xl overflow-hidden shadow-md"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500/80 text-white hover:bg-red-600 backdrop-blur-sm transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {formData.images.length < 5 && (
                      <label className="aspect-square rounded-2xl border-2 border-dashed border-zinc-300 hover:border-teal-primary hover:bg-teal-50 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 group-hover:bg-white flex items-center justify-center mb-2 transition-colors">
                          <Upload className="w-5 h-5 text-slate-400 group-hover:text-teal-primary" />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-teal-primary">
                          {t('addPhoto')}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <motion.div
              key="review"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-2xl mx-auto"
            >
              {(submitError || (duplicates && duplicates.length > 0)) && (
                <div className="mb-6 p-4 rounded-2xl border bg-red-50 border-red-200 text-red-700 text-sm">
                  {duplicates && duplicates.length > 0 ? (
                    <>
                      <p className="font-bold mb-2">
                        {t('similarIssuesFound')}
                      </p>
                      <p className="mb-2">
                        {t('similarIssuesDesc')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDuplicates(null);
                          setSubmitError(null);
                        }}
                        className="text-xs font-bold underline"
                      >
                        {common('dismiss')}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="font-bold">{submitError}</p>
                      <button
                        type="button"
                        onClick={() => setSubmitError(null)}
                        className="text-xs font-bold underline mt-1"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="text-center mb-8">
                <h2
                  className={cn(
                    "text-2xl font-black text-deep-navy mb-2",
                    isAmharic && "font-ethiopic",
                  )}
                >
                  {t("reviewTitle")}
                </h2>
                <p className="text-slate-500">
                  {t('reviewDesc')}
                </p>
              </div>

              <Card className="rounded-[2.5rem] border-zinc-100 shadow-2xl shadow-teal-900/5 overflow-hidden p-0">
                {/* Map Preview Header */}
                <div className="h-48 bg-zinc-100 w-full relative overflow-hidden">
                  {/* Placeholder Pattern since static maps require token/setup */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)",
                      backgroundSize: "20px 20px",
                    }}
                  ></div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center mb-3">
                      <MapPin className="text-teal-500 w-8 h-8" />
                    </div>
                    <div className="text-center px-4">
                      <span className="text-deep-navy font-bold text-sm block">
                        Location Pinned
                      </span>
                      <span className="text-slate-500 text-xs">
                        {formData.location
                          ? `${formData.location.lat.toFixed(4)}, ${formData.location.lng.toFixed(4)}`
                          : t('noCoordinates')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  {/* Category */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-teal-50 text-teal-600">
                      {formData.category &&
                        (() => {
                          const Icon = iconMap[formData.category];
                          return <Icon className="w-8 h-8" />;
                        })()}
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                        {t('categoryLabel')}
                      </div>
                      <div className="text-xl font-bold text-deep-navy">
                        {formData.category &&
                          categories[formData.category].label[
                            locale as "en" | "am"
                          ]}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 w-full" />

                  {/* Location */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                      {t('locationLabel')}
                    </div>
                    <p className="text-lg font-medium text-deep-navy flex items-start">
                      <MapPin className="w-5 h-5 text-teal-500 mr-2 shrink-0 mt-0.5" />
                      {formData.address}
                    </p>
                  </div>

                  <div className="h-px bg-zinc-100 w-full" />

                  {/* Description */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                      {t('issueDetailsLabel')}
                    </div>
                    <h4 className="text-lg font-bold text-deep-navy mb-2">
                      {formData.title}
                    </h4>
                    <p className="text-slate-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl">
                      {formData.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Navigation Pill */}
        <AnimatePresence>
          {canProceed() && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-8 right-8 z-50 pointer-events-auto"
            >
              <div className="bg-deep-navy/90 backdrop-blur-xl text-white p-2 pl-6 pr-2 rounded-full shadow-2xl flex items-center gap-6 border border-white/10 ring-1 ring-white/10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                    {common('nextStep')}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {currentStep === 0
                      ? t('stepPinLocation')
                      : currentStep === 1
                        ? t('stepAddDetails')
                        : currentStep === 2
                          ? t('stepReviewReport')
                          : t('stepSubmit')}
                  </span>
                </div>

                {currentStep === steps.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    isLoading={isSubmitting}
                    className="rounded-full h-12 px-8 bg-teal-primary text-white hover:bg-teal-500 border-none shadow-lg"
                  >
                    {t("submitReport")}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="w-12 h-12 rounded-full bg-white text-deep-navy hover:bg-teal-50 p-0 flex items-center justify-center transition-transform hover:scale-105"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
