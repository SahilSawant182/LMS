"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  GripVertical, 
  Type, 
  Heading as HeadingIcon, 
  List as ListIcon, 
  Upload as UploadIcon, 
  Table as TableIcon, 
  HelpCircle, 
  FileText, 
  Code, 
  Terminal,
  Search,
  ChevronDown,
  X,
  Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import AddPredefinedItemModal, { PredefinedItemType } from '@/components/admin/AddPredefinedItemModal';

type BlockType = 'text' | 'heading' | 'list' | 'upload' | 'table' | 'quiz' | 'assignment' | 'programming' | 'codebox';

interface Block {
  id: string;
  type: BlockType;
  content: any;
  label?: string;
}

const BLOCK_OPTIONS = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'heading', label: 'Heading', icon: HeadingIcon },
  { id: 'list', label: 'List', icon: ListIcon },
  { id: 'upload', label: 'Upload', icon: UploadIcon },
  { id: 'table', label: 'Table', icon: TableIcon },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  { id: 'assignment', label: 'Assignment', icon: FileText },
  { id: 'programming', label: 'Programming Exercise', icon: Code },
  { id: 'codebox', label: 'CodeBox', icon: Terminal },
];

import { useRouter } from 'next/navigation';
import { createLesson } from '@/services/lms.services';
import { uploadFile, BASE_DOMAIN } from '@/services/api.services';
import { Loader2 } from 'lucide-react';

export default function LessonEditor({ courseId = "aaaaaaakk", chapterId = "" }: { courseId?: string, chapterId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [instructorNotesOpen, setInstructorNotesOpen] = useState(false);
  const [instructorNotes, setInstructorNotes] = useState('');
  
  const [blocks, setBlocks] = useState<Block[]>([
    { id: '1', type: 'text', content: '' }
  ]);
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeDotsMenuId, setActiveDotsMenuId] = useState<string | null>(null);
  const [menuFilter, setMenuFilter] = useState('');

  // Predefined Item Dropdown Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: PredefinedItemType | null;
    insertIndex: number;
    targetBlockId?: string;
    selectedValue?: string;
  }>({
    isOpen: false,
    type: null,
    insertIndex: 0,
    targetBlockId: undefined,
    selectedValue: undefined,
  });

  // Restore draft if user navigated to create a quiz/assignment/exercise and returned
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const draftKey = `lms_lesson_draft_${courseId || 'default'}_${chapterId || 'default'}`;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (parsed.title) setTitle(parsed.title);
          if (parsed.instructorNotes) setInstructorNotes(parsed.instructorNotes);
          if (parsed.instructorNotesOpen !== undefined) setInstructorNotesOpen(parsed.instructorNotesOpen);
          if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
            setBlocks(parsed.blocks);
          }
          if (parsed.modalState?.type) {
            setModalState({
              ...parsed.modalState,
              isOpen: true,
            });
          }
        }
      } catch (err) {
        console.error("Failed to restore lesson draft:", err);
      } finally {
        localStorage.removeItem(draftKey);
      }
    }
  }, [courseId, chapterId]);

  const handleModalSelectItem = (item: { value: string; label: string }) => {
    if (modalState.targetBlockId) {
      setBlocks(blocks.map(b => b.id === modalState.targetBlockId ? { ...b, content: item.value, label: item.label } : b));
    } else if (modalState.type) {
      const newBlock: Block = {
        id: Math.random().toString(36).substring(7),
        type: modalState.type,
        content: item.value,
        label: item.label,
      };
      const newBlocks = [...blocks];
      newBlocks.splice(modalState.insertIndex + 1, 0, newBlock);
      setBlocks(newBlocks);
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalCreateNew = () => {
    if (!modalState.type) return;

    // 1. Save lesson draft so no user input is lost
    const draftKey = `lms_lesson_draft_${courseId || 'default'}_${chapterId || 'default'}`;
    const draftData = {
      title,
      instructorNotes,
      instructorNotesOpen,
      blocks,
      modalState,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch (e) {
      console.warn("Could not save lesson draft to localStorage", e);
    }

    // 2. Save returnUrl in sessionStorage and query params
    const currentUrl = typeof window !== 'undefined'
      ? (window.location.pathname + window.location.search + window.location.hash)
      : '';
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lms_return_url', currentUrl);
    }

    // 3. Navigate directly to the corresponding creation page
    let targetRoute = '/assignments/create';
    if (modalState.type === 'quiz') {
      targetRoute = '/quizzes/create';
    } else if (modalState.type === 'programming') {
      targetRoute = '/programming-exercises/create';
    }

    router.push(`${targetRoute}?returnUrl=${encodeURIComponent(currentUrl)}`);
  };

  const addBlock = (index: number, type: BlockType) => {
    if (type === 'quiz' || type === 'assignment' || type === 'programming') {
      setActiveMenuId(null);
      setModalState({
        isOpen: true,
        type: type as PredefinedItemType,
        insertIndex: index,
        targetBlockId: undefined,
        selectedValue: undefined,
      });
      return;
    }

    let initialContent: any = '';
    if (type === 'list') initialContent = [''];
    if (type === 'table') initialContent = [['Column 1', 'Column 2'], ['Data 1', 'Data 2']];

    const newBlock: Block = {
      id: Math.random().toString(36).substring(7),
      type,
      content: initialContent
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setActiveMenuId(null);
  };

  const updateBlock = (id: string, content: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const removeBlock = (id: string) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter(b => b.id !== id));
    }
    setActiveDotsMenuId(null);
  };

  const moveBlockUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    setBlocks(newBlocks);
    setActiveDotsMenuId(null);
  };

  const moveBlockDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    setBlocks(newBlocks);
    setActiveDotsMenuId(null);
  };

  const handleSave = async () => {
    if (!title) {
      alert("Please enter a title");
      return;
    }
    setActionLoading(true);
    try {
      const htmlBody = blocks.map(block => {
        if (block.type === 'heading') return `<h2>${block.content}</h2>`;
        if (block.type === 'list' && Array.isArray(block.content)) {
          return `<ul>${block.content.map(li => `<li>${li}</li>`).join('')}</ul>`;
        }
        if (block.type === 'upload' && typeof block.content === 'string') {
          const src = block.content.startsWith('/') ? `${BASE_DOMAIN}${block.content}` : block.content;
          return `<img src="${src}" alt="uploaded" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; background-color: #f8fafc; padding: 16px;" />`;
        }
        if (block.type === 'table') {
          if (Array.isArray(block.content)) {
            const rows = block.content.map((row: any, i: number) => {
              if (i === 0) return `<tr>${row.map((cell: string) => `<th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: 600;">${cell}</th>`).join('')}</tr>`;
              return `<tr>${row.map((cell: string) => `<td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${cell}</td>`).join('')}</tr>`;
            });
            return `<div style="overflow-x: auto; margin-bottom: 16px;"><table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
              <thead>${rows[0]}</thead>
              <tbody>${rows.slice(1).join('')}</tbody>
            </table></div>`;
          }
          return `<pre className="table-block">${block.content}</pre>`;
        }
        if (block.type === 'quiz') return `<div className="quiz-block" data-id="${block.content}">[Quiz: ${block.content}]</div>`;
        if (block.type === 'assignment') return `<div className="assignment-block" data-id="${block.content}">[Assignment: ${block.content}]</div>`;
        if (block.type === 'programming') return `<div className="programming-block" data-id="${block.content}">[Programming Exercise: ${block.content}]</div>`;
        if (block.type === 'codebox') return `<pre><code>${block.content}</code></pre>`;
        if (block.type === 'text') return `<p>${block.content}</p>`;
      }).join('\n');

      const formattedBlocks = blocks.map(block => {
        if (block.type === 'upload') {
          return {
            id: block.id,
            type: "upload",
            data: {
              file_url: typeof block.content === 'string' ? block.content : "",
              file_type: typeof block.content === 'string' && block.content.match(/\.(mp4|webm|ogg)$/i) ? "MP4" : "IMAGE",
              quizzes: []
            }
          };
        } else if (block.type === 'quiz') {
          return {
            id: block.id,
            type: "quiz",
            data: {
              quiz: block.content
            }
          };
        } else if (block.type === 'assignment') {
          return {
            id: block.id,
            type: "assignment",
            data: {
              assignment: block.content
            }
          };
        } else if (block.type === 'programming') {
          return {
            id: block.id,
            type: "programming",
            data: {
              programming_exercise: block.content
            }
          };
        } else {
          let textData = block.content;
          if (Array.isArray(block.content)) {
             textData = block.content.map(row => Array.isArray(row) ? row.join(' | ') : row).join('\n');
          }
          return {
            id: block.id,
            type: "markdown",
            data: {
              text: typeof textData === 'string' ? textData : JSON.stringify(textData)
            }
          };
        }
      });

      const contentObj = {
        time: Date.now(),
        blocks: formattedBlocks,
        version: "2.29.0"
      };

      const payload = {
        course: decodeURIComponent(courseId || ""),
        chapter: decodeURIComponent(chapterId || ""),
        title: title,
        include_in_preview: 1,
        content: contentObj,
        body: htmlBody || title,
        instructor_content: instructorNotes || '',
        instructor_notes: instructorNotes || ''
      };

      await createLesson(payload);
      alert('Lesson created successfully');
      router.push(`/course/${courseId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to save lesson');
    } finally {
      setActionLoading(false);
    }
  };

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.block-menu-container')) {
        setActiveMenuId(null);
      }
      if (!(e.target as Element).closest('.dots-menu-container')) {
        setActiveDotsMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const renderBlockMenu = (index: number, blockId: string) => {
    if (activeMenuId !== blockId) return null;

    const filteredOptions = BLOCK_OPTIONS.filter(opt => 
      opt.label.toLowerCase().includes(menuFilter.toLowerCase())
    );

    return (
      <div className="absolute top-10 left-0 z-50 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden block-menu-container animate-in fade-in zoom-in-95 duration-100">
        <div className="p-2 border-b border-slate-100 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Filter" 
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border-none rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            value={menuFilter}
            onChange={(e) => setMenuFilter(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {filteredOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => addBlock(index, opt.id as BlockType)}
              className="w-full flex items-center px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center mr-3 shadow-sm text-slate-500">
                <opt.icon className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
          {filteredOptions.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-500">No matching blocks</div>
          )}
        </div>
      </div>
    );
  };

  const renderBlockContent = (block: Block) => {
    switch (block.type) {
      case 'text':
        return (
          <textarea
            className="w-full resize-none text-slate-800 placeholder:text-slate-300 focus:outline-none text-sm min-h-[40px] py-1 bg-transparent"
            placeholder="Type '/' for commands or start writing..."
            value={block.content}
            onChange={(e) => updateBlock(block.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && block.content === '') {
                e.preventDefault();
                removeBlock(block.id);
              }
            }}
          />
        );
      case 'heading':
        return (
          <input
            type="text"
            className="w-full text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none py-1 bg-transparent"
            placeholder="Heading..."
            value={block.content}
            onChange={(e) => updateBlock(block.id, e.target.value)}
          />
        );
      case 'list':
        return (
          <div className="pl-4 border-l-2 border-indigo-200 space-y-2 py-1">
            {Array.isArray(block.content) && block.content.map((item, i) => (
              <div key={i} className="flex items-start">
                <span className="text-indigo-400 mr-2 mt-1.5 text-base leading-none">•</span>
                <input
                  type="text"
                  className="flex-1 focus:outline-none text-sm text-slate-800 bg-transparent"
                  placeholder="List item..."
                  value={item}
                  onChange={(e) => {
                    const newContent = [...block.content];
                    newContent[i] = e.target.value;
                    updateBlock(block.id, newContent);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const newContent = [...block.content];
                      newContent.splice(i + 1, 0, '');
                      updateBlock(block.id, newContent);
                    } else if (e.key === 'Backspace' && item === '') {
                      e.preventDefault();
                      const newContent = [...block.content];
                      if (newContent.length > 1) {
                        newContent.splice(i, 1);
                        updateBlock(block.id, newContent);
                      } else {
                        removeBlock(block.id);
                      }
                    }
                  }}
                  autoFocus={i === block.content.length - 1}
                />
              </div>
            ))}
          </div>
        );
      case 'upload':
        return (
          <div className="relative group/upload border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer overflow-hidden min-h-[120px]">
            {block.content === 'uploading' ? (
              <div className="p-6 flex flex-col items-center pointer-events-none">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                <h4 className="font-semibold text-slate-700 text-sm">Uploading...</h4>
              </div>
            ) : typeof block.content === 'string' && block.content !== '' ? (
              block.content.match(/\.(mp4|webm|ogg)$/i) ? (
                 <video src={block.content.startsWith('/') ? `${BASE_DOMAIN}${block.content}` : block.content} controls className="max-w-md max-h-48 rounded-lg p-2" />
              ) : (
                 <img src={block.content.startsWith('/') ? `${BASE_DOMAIN}${block.content}` : block.content} alt="Preview" className="max-w-md max-h-48 object-contain rounded-xl p-4 border border-slate-200 bg-slate-50" />
              )
            ) : (
              <div className="p-6 flex flex-col items-center pointer-events-none">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-2 group-hover/upload:scale-105 transition-transform">
                  <UploadIcon className="w-4 h-4 text-indigo-500" />
                </div>
                <h4 className="font-semibold text-slate-700 text-sm">Click to upload</h4>
                <p className="text-xs text-slate-500 mt-1">Image, Video, Audio or PDF</p>
              </div>
            )}
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              accept="image/*,video/*"
              disabled={block.content === 'uploading'}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    updateBlock(block.id, 'uploading');
                    const response = await uploadFile(file);
                    // Handle Frappe's file upload response structure
                    const fileUrl = response?.message?.file_url || response?.file_url || response;
                    if (typeof fileUrl === 'string') {
                      updateBlock(block.id, fileUrl);
                    } else {
                      updateBlock(block.id, '');
                      alert('Upload failed: Could not get file URL');
                    }
                  } catch (err) {
                    console.error('Upload error:', err);
                    updateBlock(block.id, '');
                    alert('Failed to upload file');
                  }
                }
              }}
            />
          </div>
        );
      case 'table': {
        const tableData = Array.isArray(block.content) ? block.content : [['Header 1', 'Header 2'], ['Data 1', 'Data 2']];
        
        const updateCell = (rowIndex: number, colIndex: number, value: string) => {
          const newData = tableData.map((row: any, i: number) => 
            i === rowIndex ? row.map((cell: any, j: number) => j === colIndex ? value : cell) : row
          );
          updateBlock(block.id, newData);
        };
        
        const addRow = () => {
          const cols = tableData[0]?.length || 2;
          updateBlock(block.id, [...tableData, Array(cols).fill('')]);
        };
        
        const addCol = () => {
          const newData = tableData.map((row: any) => [...row, '']);
          updateBlock(block.id, newData);
        };

        const removeRow = (rowIndex: number) => {
          if (tableData.length <= 1) return;
          updateBlock(block.id, tableData.filter((_: any, i: number) => i !== rowIndex));
        };

        const removeCol = (colIndex: number) => {
          if (tableData[0]?.length <= 1) return;
          updateBlock(block.id, tableData.map((row: any) => row.filter((_: any, j: number) => j !== colIndex)));
        };

        return (
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                <TableIcon className="w-4 h-4 text-indigo-500" /> Table Editor
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={addRow} className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors flex items-center gap-1 shadow-sm">
                  <Plus className="w-3 h-3" /> Row
                </button>
                <button type="button" onClick={addCol} className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors flex items-center gap-1 shadow-sm">
                  <Plus className="w-3 h-3" /> Column
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm text-left border-collapse border border-slate-200 rounded-lg">
                <tbody>
                  {/* Top Row for Column Controls */}
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="w-10 p-0 text-center border-r border-slate-200 bg-slate-100 sticky left-0 z-20 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                    </td>
                    {tableData[0]?.map((_: any, colIndex: number) => (
                      <td key={`del-col-${colIndex}`} className="p-0 text-center border-r border-slate-200 bg-slate-100 h-8 min-w-[120px]">
                        <button type="button" onClick={() => removeCol(colIndex)} className="text-slate-400 hover:text-red-500 w-full h-full flex justify-center items-center text-[10px] uppercase font-bold tracking-wider gap-1 transition-colors" title="Remove Column">
                           <X className="w-3 h-3" /> Del Col
                         </button>
                      </td>
                    ))}
                  </tr>
                  
                  {/* Data Rows */}
                  {tableData.map((row: any, rowIndex: number) => (
                    <tr key={`row-${rowIndex}`} className={rowIndex === 0 ? "bg-slate-50 border-b border-slate-200" : "bg-white border-b border-slate-100 last:border-0"}>
                      <td className="w-10 p-0 text-center border-r border-slate-200 bg-slate-100 sticky left-0 z-20 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                         <button type="button" onClick={() => removeRow(rowIndex)} className="text-slate-400 hover:text-red-500 w-full h-full p-2 flex justify-center items-center transition-colors" title="Remove Row">
                           <X className="w-4 h-4" />
                         </button>
                      </td>
                      {row.map((cell: any, colIndex: number) => (
                        <td key={`cell-${rowIndex}-${colIndex}`} className="p-0 border-r border-slate-200 last:border-r-0 relative">
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                            className={`w-full min-w-[120px] p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:z-10 relative bg-transparent ${rowIndex === 0 ? 'font-bold text-slate-800' : 'text-slate-600'}`}
                            placeholder={rowIndex === 0 ? "Header..." : "Data..."}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      case 'quiz':
      case 'assignment':
      case 'programming': {
        const configMap = {
          quiz: {
            title: 'Quiz',
            icon: HelpCircle,
            color: 'text-amber-500 bg-amber-50 border-amber-200',
            badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          },
          assignment: {
            title: 'Assignment',
            icon: FileText,
            color: 'text-blue-500 bg-blue-50 border-blue-200',
            badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          },
          programming: {
            title: 'Programming Exercise',
            icon: Code,
            color: 'text-emerald-500 bg-emerald-50 border-emerald-200',
            badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          },
        };
        const currentConfig = configMap[block.type as keyof typeof configMap];
        const Icon = currentConfig.icon;

        return (
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${currentConfig.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${currentConfig.badgeBg}`}>
                    {currentConfig.title}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {block.label || block.content || <span className="text-slate-400 italic font-normal">No {currentConfig.title} selected</span>}
                </div>
                {block.content && block.content !== block.label && (
                  <div className="text-xs text-slate-400 font-mono truncate">
                    ID: {block.content}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setModalState({
                    isOpen: true,
                    type: block.type as PredefinedItemType,
                    insertIndex: 0,
                    targetBlockId: block.id,
                    selectedValue: block.content,
                  });
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Remove block"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      }
      case 'codebox':
        return (
          <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
            <div className="bg-slate-800 px-4 py-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">Code Snippet</span>
            </div>
              <textarea
              className="w-full resize-none bg-transparent text-slate-100 font-mono text-xs p-4 focus:outline-none min-h-[120px]"
              placeholder="// Write your code here..."
              value={block.content as string}
              onChange={(e) => updateBlock(block.id, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center text-sm">
          <Link href={`/`} className="text-slate-500 hover:text-slate-900 transition-colors font-medium">Courses</Link>
          <span className="mx-2 text-slate-300">/</span>
          <Link href={`/course/${courseId}`} className="text-slate-500 hover:text-slate-900 transition-colors font-medium">
            {decodeURIComponent(courseId || "")}
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900 font-bold">Create Lesson</span>
        </div>
        <button 
          onClick={handleSave}
          disabled={actionLoading}
          className="bg-slate-900 text-white px-5 py-2 rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
        >
          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </button>
      </header>

      <div className="flex-1 max-w-[1400px] w-full mx-auto flex flex-col lg:flex-row">
        {/* Main Editor Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Title Settings */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none py-2 bg-transparent"
                  placeholder="Untitled Lesson"
                />
              </div>
            </div>

            {/* Instructor Notes Accordion */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setInstructorNotesOpen(!instructorNotesOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="font-semibold text-slate-700">Instructor Notes</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${instructorNotesOpen ? 'rotate-180' : ''}`} />
              </button>
              {instructorNotesOpen && (
                <div className="p-4 bg-white border-t border-slate-200">
                  <textarea 
                    value={instructorNotes}
                    onChange={(e) => setInstructorNotes(e.target.value)}
                    placeholder="Add private notes for instructors here..."
                    className="w-full h-32 resize-none focus:outline-none text-slate-700 placeholder:text-slate-300"
                  />
                </div>
              )}
            </div>

            {/* Blocks Content Area */}
            <div className="pt-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Content</h3>
              
              <div className="space-y-2">
                {blocks.map((block, index) => (
                  <div key={block.id} className="group relative flex items-start -ml-12 pl-12 py-1">
                    {/* Block Controls */}
                    <div className="absolute left-0 top-1.5 opacity-40 hover:opacity-100 transition-opacity flex items-center space-x-1 block-menu-container">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === block.id ? null : block.id);
                          setActiveDotsMenuId(null);
                          setMenuFilter('');
                        }}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Add block below"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <div className="relative dots-menu-container">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDotsMenuId(activeDotsMenuId === block.id ? null : block.id);
                            setActiveMenuId(null);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded"
                          title="Block options"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>

                        {/* Dots Menu Popover */}
                        {activeDotsMenuId === block.id && (
                          <div className="absolute top-8 left-0 z-50 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => moveBlockUp(index)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              disabled={index === 0}
                            >
                              Move Up
                            </button>
                            <button
                              onClick={() => moveBlockDown(index)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              disabled={index === blocks.length - 1}
                            >
                              Move Down
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button
                              onClick={() => removeBlock(block.id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              disabled={blocks.length === 1}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Floating Menu */}
                      {renderBlockMenu(index, block.id)}
                    </div>
                    
                    {/* Block Content */}
                    <div className="flex-1 w-full relative min-w-0">
                      {renderBlockContent(block)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Predefined Item Picker & Creator Modal */}
      <AddPredefinedItemModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        selectedValue={modalState.selectedValue}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onSelect={handleModalSelectItem}
        onCreateNew={handleModalCreateNew}
      />
    </div>
  );
}
