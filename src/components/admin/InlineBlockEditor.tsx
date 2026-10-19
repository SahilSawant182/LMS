import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AddPredefinedItemModal, { PredefinedItemType } from '@/components/admin/AddPredefinedItemModal';

type BlockType = 'text' | 'heading' | 'list' | 'upload' | 'table' | 'quiz' | 'assignment' | 'programming' | 'codebox';

interface Block {
  id: string;
  type: BlockType;
  content: string | string[];
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

export default function InlineBlockEditor({ 
  value, 
  onChange 
}: { 
  value: string, 
  onChange: (html: string) => void 
}) {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: '1', type: 'text', content: '' }
  ]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuFilter, setMenuFilter] = useState('');

  const router = useRouter();
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

  // Convert blocks to HTML whenever they change
  useEffect(() => {
    const html = blocks.map(block => {
      if (block.type === 'heading') {
        return `<h2>${block.content}</h2>`;
      } else if (block.type === 'list' && Array.isArray(block.content)) {
        return `<ul>${block.content.map(li => `<li>${li}</li>`).join('')}</ul>`;
      } else if (block.type === 'upload') {
        return `<div class="media-upload-placeholder">[Media Placeholder]</div>`;
      } else if (block.type === 'text') {
        return `<p>${block.content}</p>`;
      } else if (block.type === 'quiz') {
        return `<div class="quiz-block" data-id="${block.content}">[Quiz: ${block.content}]</div>`;
      } else if (block.type === 'assignment') {
        return `<div class="assignment-block" data-id="${block.content}">[Assignment: ${block.content}]</div>`;
      } else if (block.type === 'programming') {
        return `<div class="programming-block" data-id="${block.content}">[Programming Exercise: ${block.content}]</div>`;
      } else {
        return `<div class="custom-block">[${block.type} Block]</div>`;
      }
    }).join('\n');
    onChange(html);
  }, [blocks]);

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
    const currentUrl = typeof window !== 'undefined'
      ? (window.location.pathname + window.location.search + window.location.hash)
      : '';
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lms_return_url', currentUrl);
    }

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

    const newBlock: Block = {
      id: Math.random().toString(36).substring(7),
      type,
      content: type === 'list' ? [''] : ''
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setActiveMenuId(null);
  };

  const updateBlock = (id: string, content: string | string[]) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const removeBlock = (id: string) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter(b => b.id !== id));
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.block-menu-container')) {
        setActiveMenuId(null);
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
            placeholder="Filter options..." 
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border-none rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            value={menuFilter}
            onChange={(e) => setMenuFilter(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filteredOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => addBlock(index, opt.id as BlockType)}
              className="w-full flex items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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
            className="w-full resize-none text-slate-700 placeholder:text-slate-300 focus:outline-none text-sm min-h-[40px] py-2 bg-transparent"
            placeholder="Type '/' for commands or start writing..."
            value={block.content as string}
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
            className="w-full text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none py-2 bg-transparent"
            placeholder="Heading..."
            value={block.content as string}
            onChange={(e) => updateBlock(block.id, e.target.value)}
          />
        );
      case 'list':
        return (
          <div className="pl-4 border-l-2 border-indigo-200 space-y-1 py-1">
            {Array.isArray(block.content) && block.content.map((item, i) => (
              <div key={i} className="flex items-start">
                <span className="text-indigo-400 mr-2 mt-1.5 text-lg leading-none">•</span>
                <input
                  type="text"
                  className="flex-1 focus:outline-none text-sm text-slate-700 bg-transparent py-1"
                  placeholder="List item..."
                  value={item}
                  onChange={(e) => {
                    const newContent = [...(block.content as string[])];
                    newContent[i] = e.target.value;
                    updateBlock(block.id, newContent);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const newContent = [...(block.content as string[])];
                      newContent.splice(i + 1, 0, '');
                      updateBlock(block.id, newContent);
                    } else if (e.key === 'Backspace' && item === '') {
                      e.preventDefault();
                      const newContent = [...(block.content as string[])];
                      if (newContent.length > 1) {
                        newContent.splice(i, 1);
                        updateBlock(block.id, newContent);
                      } else {
                        removeBlock(block.id);
                      }
                    }
                  }}
                  autoFocus={i === (block.content as string[]).length - 1}
                />
              </div>
            ))}
          </div>
        );
      case 'upload':
        return (
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-white hover:bg-slate-50 transition-colors cursor-pointer group my-2">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <UploadIcon className="w-4 h-4 text-indigo-500" />
            </div>
            <h4 className="font-semibold text-slate-700 text-sm">Click to upload</h4>
            <p className="text-xs text-slate-400 mt-1">Image, Video, Audio or PDF</p>
          </div>
        );
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
          <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${currentConfig.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${currentConfig.badgeBg}`}>
                    {currentConfig.title}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {block.label || (typeof block.content === 'string' ? block.content : '') || <span className="text-slate-400 italic font-normal">No {currentConfig.title} selected</span>}
                </div>
                {typeof block.content === 'string' && block.content && block.content !== block.label && (
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
                    selectedValue: typeof block.content === 'string' ? block.content : '',
                  });
                }}
                className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Remove block"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center text-slate-500 my-2 text-sm">
            <div className="w-6 h-6 rounded bg-slate-50 border border-slate-200 flex items-center justify-center mr-3">
              <Code className="w-3 h-3" />
            </div>
            <span>{block.type} block placeholder</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 min-h-[150px] font-sans">
      <div className="space-y-1">
        {blocks.map((block, index) => (
          <div key={block.id} className="group relative flex items-start -ml-8 pl-8 py-1">
            {/* Block Controls (Hover) */}
            <div className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 block-menu-container">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveMenuId(activeMenuId === block.id ? null : block.id);
                  setMenuFilter('');
                }}
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                title="Add block below"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="p-1 text-slate-300 cursor-grab hover:text-slate-500">
                <GripVertical className="w-4 h-4" />
              </div>
              
              {/* Floating Menu */}
              {renderBlockMenu(index, block.id)}
            </div>
            
            {/* Block Content */}
            <div className="flex-1 w-full relative">
              {renderBlockContent(block)}
            </div>
          </div>
        ))}
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
