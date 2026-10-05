import React from 'react';
import { Star, Users, BookOpen, ArrowRight, Edit2, Trash2 } from 'lucide-react';

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
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
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
  onEdit,
  onDelete
}: CourseCardProps) {

  // Map backend gradient names to Tailwind classes if needed
  const getGradientClass = (color: string) => {
    const c = (color || '').toLowerCase();
    if (c === 'red') return 'from-red-500/80 to-transparent';
    if (c === 'blue') return 'from-blue-500/80 to-transparent';
    if (c === 'green') return 'from-green-500/80 to-transparent';
    if (c === 'purple') return 'from-purple-500/80 to-transparent';
    if (c === 'orange') return 'from-orange-500/80 to-transparent';
    return 'from-gray-900/60 to-transparent';
  };

  return (
    <div className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full relative">
      {/* Course Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100 flex items-center justify-center">
        <div className={`absolute inset-0 bg-gradient-to-t ${getGradientClass(cardGradient || '')} z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
        {image ? (
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
          />
        ) : (
          <div className="text-gray-400 font-medium bg-gray-200 w-full h-full flex items-center justify-center">No Image</div>
        )}
        
        {/* Floating actions for Edit/Delete */}
        {(onEdit || onDelete) && (
          <div className="absolute top-3 left-3 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {onEdit && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(e); }}
                className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-indigo-700 hover:bg-indigo-600 hover:text-white shadow-sm transition-colors"
                title="Edit Course"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(e); }}
                className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-red-600 hover:bg-red-600 hover:text-white shadow-sm transition-colors"
                title="Delete Course"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Floating badge over image */}
        {category && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-indigo-700 shadow-sm z-20">
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
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500 font-medium">
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
        </div>
        
        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center text-sm">
            <div className="flex items-center text-amber-500 font-bold mr-1.5 bg-amber-50 px-2 py-0.5 rounded">
              <span className="mr-1">{Number(rating || 0).toFixed(1)}</span>
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
          {price ? (
            <span className="font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-full text-sm border border-gray-100 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">{price}</span>
          ) : (
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors transform group-hover:translate-x-1" />
          )}
        </div>
      </div>
    </div>
  );
}
