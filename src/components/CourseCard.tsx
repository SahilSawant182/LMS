import React, { useState } from 'react';
import { Star, Users, BookOpen, ArrowRight, Edit2, CheckCircle, Globe, Lock, Play, PlayCircle, X, Award } from 'lucide-react';

function getYouTubeVideoId(input?: string | null): string | null {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();
  const urlMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

export interface CourseCardProps {
  image?: string;
  providerLogo?: string;
  providerName?: string;
  title: string;
  rating?: string | number;
  enrollments?: number;
  category?: string;
  lessons?: number;
  status?: string;
  price?: string;
  cardGradient?: string;
  description?: string;
  isEnrolled?: boolean;
  isCompleted?: boolean;
  hasCertificate?: boolean;
  certificateAchieved?: boolean;
  certificate_achieved?: boolean | number | string;
  enable_certification?: number | boolean | string;
  progress?: number | null;
  published?: boolean | number;
  video_link?: string;
  onEdit?: (e: React.MouseEvent) => void;
  onPublish?: (e: React.MouseEvent) => void;
}

export default function CourseCard({
  image,
  providerLogo,
  providerName,
  title,
  rating,
  enrollments,
  category,
  lessons,
  status,
  price,
  cardGradient,
  description,
  isEnrolled = false,
  isCompleted = false,
  hasCertificate = false,
  certificateAchieved = false,
  certificate_achieved,
  enable_certification,
  progress,
  published,
  video_link,
  onEdit,
  onPublish
}: CourseCardProps) {
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isCertificateAchieved = Boolean(
    certificateAchieved ||
    certificate_achieved === 1 ||
    certificate_achieved === true ||
    certificate_achieved === '1'
  );

  const includesCertificate = Boolean(
    isCertificateAchieved ||
    hasCertificate ||
    enable_certification === 1 ||
    enable_certification === true ||
    enable_certification === '1'
  );

  const youtubeId = getYouTubeVideoId(video_link);
  const videoThumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;
  const hasCustomImage = Boolean(image && image.trim());
  const effectiveImage = hasCustomImage && image ? image.trim() : (videoThumbnail || null);

  const enrolled = Boolean(isEnrolled || (price && price.trim().toLowerCase() === 'enrolled'));

  const getGradientClass = (color: string) => {
    const c = (color || '').toLowerCase();
    if (c === 'red') return 'from-red-500/80 to-transparent';
    if (c === 'blue') return 'from-blue-500/80 to-transparent';
    if (c === 'green' || c === 'emerald') return 'from-green-500/80 to-transparent';
    if (c === 'amber') return 'from-amber-500/80 to-transparent';
    if (c === 'cyan') return 'from-cyan-500/80 to-transparent';
    if (c === 'orange') return 'from-orange-500/80 to-transparent';
    if (c === 'pink') return 'from-pink-500/80 to-transparent';
    if (c === 'purple') return 'from-purple-500/80 to-transparent';
    if (c === 'teal') return 'from-teal-500/80 to-transparent';
    if (c === 'violet' || c === 'indigo') return 'from-violet-500/80 to-transparent';
    if (c === 'yellow') return 'from-yellow-500/80 to-transparent';
    if (c === 'gray') return 'from-gray-500/80 to-transparent';
    return 'from-gray-900/60 to-transparent';
  };

  return (
    <div className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full relative">
      {/* Course Image */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-950 flex items-center justify-center">
        <div className={`absolute inset-0 bg-gradient-to-t ${getGradientClass(cardGradient || '')} z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>
        {effectiveImage && !imageError ? (
          <>
            <img
              src={effectiveImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-110 pointer-events-none"
            />
            <img
              src={effectiveImage}
              alt={title}
              onError={() => setImageError(true)}
              className="relative z-10 max-h-full max-w-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-500 ease-in-out"
            />
            {/* Play Button Overlay if video_link is present */}
            {video_link && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setVideoModalOpen(true);
                }}
                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-xl backdrop-blur-md hover:scale-110 transition-all border border-white/20 z-30 cursor-pointer"
                title="Play Preview Video"
              >
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </button>
            )}
          </>
        ) : (
          <div className="text-gray-400 font-medium bg-gray-200 w-full h-full flex flex-col items-center justify-center gap-2">
            <BookOpen className="w-8 h-8 text-gray-400" />
            <span className="text-xs">No Image</span>
          </div>
        )}

        {/* Floating actions for Edit/Publish */}
        {(onEdit || onPublish) && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {onPublish && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPublish(e); }}
                className="bg-emerald-600 p-1.5 rounded-full text-white hover:bg-emerald-700 shadow-md transition-colors"
                title="Publish Course Directly"
              >
                <Globe className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(e); }}
                className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-indigo-700 hover:bg-indigo-600 hover:text-white shadow-sm transition-colors"
                title="Edit Course"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Draft Badge over Image */}
        {(published === false || published === 0) && (
          <div className="absolute top-3 left-3 group-hover:opacity-0 transition-opacity bg-amber-500/90 text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md z-20 flex items-center gap-1 backdrop-blur-sm">
            <Lock className="w-3 h-3" />
            <span>Draft</span>
          </div>
        )}

        {/* Completed / Enrolled Badge over Image */}
        {isCompleted && !(onEdit || onPublish) && (published !== false && published !== 0) ? (
          <div className="absolute top-3 left-3 bg-teal-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md z-20 flex items-center gap-1 backdrop-blur-sm">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Completed</span>
          </div>
        ) : enrolled && !(onEdit || onPublish) && (published !== false && published !== 0) ? (
          <div className="absolute top-3 left-3 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md z-20 flex items-center gap-1 backdrop-blur-sm">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Enrolled</span>
          </div>
        ) : null}

        {/* Floating category badge over image */}
        {category && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-indigo-700 shadow-sm border border-slate-100 z-20">
            {category}
          </div>
        )}

        {providerLogo && (
          <div className="absolute bottom-4 left-4 bg-white p-2 rounded-lg shadow-lg z-20 transform group-hover:-translate-y-1 transition-transform duration-300">
            <img src={providerLogo} alt={providerName} className="h-6 w-auto object-contain" />
          </div>
        )}
      </div>

      {/* Course Info */}
      <div className="p-6 flex flex-col flex-grow relative z-20 bg-white">
        {!providerLogo && providerName && (
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">{providerName}</p>
        )}
        <h3 className="font-extrabold text-gray-900 text-lg leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {title}
        </h3>

        {/* Description Snippet */}
        {description && (
          <div
            className="text-sm text-gray-500 mb-4 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}

        {/* Additional Details */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4 text-xs text-gray-500 font-medium">
          {status && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded">
              <span>{status}</span>
            </div>
          )}
          {lessons !== undefined && (
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>{lessons} Lessons</span>
            </div>
          )}
          {enrollments !== undefined && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>{enrollments} Enrolled</span>
            </div>
          )}
          {includesCertificate && !enrolled && !isCertificateAchieved && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded font-bold text-[11px]" title="Includes Certificate of Completion">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Certificate</span>
            </div>
          )}
        </div>

        {/* Progress Bar (for enrolled students) */}
        {progress !== undefined && progress !== null && (
          <div className="mt-auto mb-3 pt-2">
            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
              <span className="text-slate-600 text-[11px] font-medium">Course Progress</span>
              <span className={`text-xs font-bold ${Number(progress) >= 100 ? 'text-teal-600' : 'text-indigo-600'}`}>
                {Math.round(Number(progress))}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  Number(progress) >= 100
                    ? 'bg-teal-500'
                    : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                }`}
                style={{ width: `${Math.min(Math.max(Number(progress), 0), 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center text-sm">
            <div className="flex items-center text-amber-500 font-bold mr-1.5 bg-amber-50 px-2 py-0.5 rounded">
              <span className="mr-1">{Number(rating || 0).toFixed(1)}</span>
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
          {isCertificateAchieved ? (
            <span className="font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full text-xs border border-emerald-200 group-hover:bg-emerald-100 transition-colors flex items-center gap-1 shadow-2xs">
              Certificate Achieved <Award className="w-3.5 h-3.5 ml-0.5 text-emerald-600" />
            </span>
          ) : isCompleted ? (
            <span className="font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full text-xs border border-teal-200 group-hover:bg-teal-100 transition-colors flex items-center gap-1">
              Completed <CheckCircle className="w-3.5 h-3.5 ml-0.5 text-teal-600" />
            </span>
          ) : enrolled ? (
            <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs border border-emerald-200 group-hover:bg-emerald-100 transition-colors flex items-center gap-1">
              Continue Learning <ArrowRight className="w-3.5 h-3.5 ml-0.5 transform group-hover:translate-x-0.5 transition-transform" />
            </span>
          ) : price ? (
            <span className="font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-full text-sm border border-gray-100 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">{price}</span>
          ) : (
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors transform group-hover:translate-x-1" />
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {videoModalOpen && video_link && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in cursor-default"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVideoModalOpen(false);
          }}
        >
          <div 
            className="relative w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-indigo-400" /> {title} &bull; Preview Video
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setVideoModalOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              {youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&rel=0`}
                  title={`${title} Preview Video`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <video
                  src={video_link}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
