"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createQuiz,
  updateQuiz,
  getQuiz,
  getQuestions,
  createQuestion,
  CreateQuestionPayload,
  CreateQuizPayload,
} from '@/services/lms.services';
import { isAuthorizedInstructor } from '@/services/auth.services';
import { showToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  Search,
  Plus,
  Database,
  GripVertical,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  HelpCircle,
  FileText,
  CheckSquare,
  Radio,
  AlignLeft,
  Type,
  Clock,
  ArrowLeft,
  Sliders,
  Layers,
  Loader2,
  Sparkles,
  ShieldAlert,
  Bold,
  Italic,
  Strikethrough,
  List,
  Code,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';

export type QuestionTypeUI = "Single choice" | "Multiple choice" | "User input" | "Open ended";

export interface OptionItem {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizQuestionItem {
  name: string;
  questionId?: string;
  question: string;
  type: string;
  multiple: number;
  displayType: QuestionTypeUI;
  marks: number;
  options?: OptionItem[];
  possibilities?: string[];
  [key: string]: any;
}

export function CreateQuizContent({ initialQuizName }: { initialQuizName?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || (typeof window !== 'undefined' ? sessionStorage.getItem('lms_return_url') : null);
  const quizParam = initialQuizName || searchParams.get('quiz') || searchParams.get('name') || '';

  const [isInstructor, setIsInstructor] = useState<boolean | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(Boolean(quizParam));
  const [existingQuizId, setExistingQuizId] = useState<string>(quizParam);

  // Quiz Details State
  const [title, setTitle] = useState('');
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [duration, setDuration] = useState<number>(60);
  const [passingPercentage, setPassingPercentage] = useState<number>(100);
  const [description, setDescription] = useState('');

  // Settings State
  const [showAnswers, setShowAnswers] = useState<boolean>(true);
  const [showSubmissionHistory, setShowSubmissionHistory] = useState<boolean>(false);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [enableNegativeMarking, setEnableNegativeMarking] = useState<boolean>(false);

  // Questions in Current Quiz
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionItem[]>([]);
  const [searchQuestionsQuery, setSearchQuestionsQuery] = useState('');

  // Save / Submitting Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);

  // Question Bank Modal State
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [bankFilterType, setBankFilterType] = useState<string>('All');
  const [selectedBankNames, setSelectedBankNames] = useState<Set<string>>(new Set());

  // Inline Question Creator State
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionTypeUI>("Single choice");
  const [questionMarks, setQuestionMarks] = useState<number>(1);
  const [isCustomMarks, setIsCustomMarks] = useState(false);
  const [customMarksValue, setCustomMarksValue] = useState<number>(1);
  const [questionText, setQuestionText] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isMarksDropdownOpen, setIsMarksDropdownOpen] = useState(false);

  // Options for Single / Multiple Choice
  const [options, setOptions] = useState<OptionItem[]>([
    { id: '1', text: '', isCorrect: true, explanation: '' },
    { id: '2', text: '', isCorrect: false, explanation: '' },
    { id: '3', text: '', isCorrect: false, explanation: '' },
    { id: '4', text: '', isCorrect: false, explanation: '' },
  ]);

  // Possibilities for User Input
  const [possibilities, setPossibilities] = useState<string[]>(['', '', '', '']);

  // Marks for Open Ended
  const [openEndedMarks, setOpenEndedMarks] = useState<number>(10);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewActiveIndex, setPreviewActiveIndex] = useState(0);

  // Delete Confirm Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Check Auth & Fetch Existing Quiz if Edit Mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('apiKey');
      if (!apiKey) {
        router.push('/login');
        return;
      }
      setIsInstructor(isAuthorizedInstructor());
    }

    if (quizParam) {
      loadExistingQuiz(quizParam);
    }
  }, [router, quizParam]);

  const loadExistingQuiz = async (name: string) => {
    try {
      const res = await getQuiz(name);
      const data = res?.data || res?.message?.data || res?.message || res;
      if (data) {
        setTitle(data.title || data.name || '');
        if (data.max_attempts !== undefined) setMaxAttempts(Number(data.max_attempts));
        if (data.duration !== undefined) setDuration(Number(data.duration));
        if (data.passing_percentage !== undefined) setPassingPercentage(Number(data.passing_percentage));
        if (data.description) setDescription(data.description);
        if (data.show_answers !== undefined) setShowAnswers(Boolean(data.show_answers));
        if (data.show_submission_history !== undefined) setShowSubmissionHistory(Boolean(data.show_submission_history));
        if (data.shuffle_questions !== undefined) setShuffleQuestions(Boolean(data.shuffle_questions));
        if (data.enable_negative_marking !== undefined) setEnableNegativeMarking(Boolean(data.enable_negative_marking));

        if (Array.isArray(data.questions)) {
          // Fetch question bank in parallel to enrich question details if missing
          let bankMap = new Map<string, any>();
          try {
            const bankRes = await getQuestions();
            const list = Array.isArray(bankRes)
              ? bankRes
              : (bankRes?.data?.questions || bankRes?.message?.data?.questions || bankRes?.questions || []);
            if (Array.isArray(list)) {
              list.forEach((item: any) => {
                const itemKey = String(item.question || item.name || '').trim().toLowerCase();
                const itemName = String(item.name || '').trim().toLowerCase();
                if (itemKey) bankMap.set(itemKey, item);
                if (itemName) bankMap.set(itemName, item);
              });
            }
          } catch (e) {
            console.warn('Could not fetch bank to enrich questions:', e);
          }

          const loaded: QuizQuestionItem[] = data.questions.map((q: any) => {
            const rawRef = q.question || q.name || '';
            const bankMatch = bankMap.get(String(rawRef).toLowerCase()) || bankMap.get(String(q.name || '').toLowerCase());
            const displayType = mapBackendTypeToUI(q.type || bankMatch?.type || 'Choices', q.multiple ?? bankMatch?.multiple);
            const qText = q.question_detail || bankMatch?.question_detail || bankMatch?.question_title || q.question_text || q.question_title || (typeof q.question === 'string' && !q.question.startsWith('QTS-') ? q.question : '') || rawRef;
            return {
              name: q.name || rawRef,
              questionId: rawRef,
              question: qText,
              type: q.type || bankMatch?.type || 'Choices',
              multiple: q.multiple !== undefined ? Number(q.multiple) : (bankMatch?.multiple ? 1 : 0),
              displayType,
              marks: Number(q.marks) || Number(bankMatch?.marks) || 1,
            };
          });
          setQuizQuestions(loaded);
        }
        setIsEditMode(true);
        setExistingQuizId(name);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('Failed to load existing quiz:', err);
    }
  };

  const mapBackendTypeToUI = (backendType?: string, multiple?: number): QuestionTypeUI => {
    const norm = String(backendType || '').toLowerCase();
    if (norm.includes('user input') || norm === 'user_input') return "User input";
    if (norm.includes('open ended') || norm === 'open_ended') return "Open ended";
    if (multiple === 1 || norm.includes('multiple')) return "Multiple choice";
    return "Single choice";
  };

  // Auto-calculated Totals
  const totalQuestions = quizQuestions.length;
  const totalMarks = useMemo(() => {
    return quizQuestions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0);
  }, [quizQuestions]);

  // Track Unsaved Changes
  const handleFieldChange = () => {
    setHasUnsavedChanges(true);
  };

  // Filtered Questions in Quiz
  const filteredQuizQuestions = useMemo(() => {
    if (!searchQuestionsQuery.trim()) return quizQuestions;
    const q = searchQuestionsQuery.toLowerCase();
    return quizQuestions.filter((item) =>
      item.question.toLowerCase().includes(q) ||
      item.displayType.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q)
    );
  }, [quizQuestions, searchQuestionsQuery]);

  // Reordering Questions
  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= quizQuestions.length) return;
    const updated = [...quizQuestions];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setQuizQuestions(updated);
    setHasUnsavedChanges(true);
    setActiveMenuIndex(null);
  };

  const removeQuestionFromQuiz = (index: number) => {
    const updated = quizQuestions.filter((_, idx) => idx !== index);
    setQuizQuestions(updated);
    setHasUnsavedChanges(true);
    setActiveMenuIndex(null);
    showToast.info('Question removed from quiz.');
  };

  // Open Question Bank & Fetch Predefined Questions
  const handleOpenBank = async () => {
    setIsBankOpen(true);
    setLoadingBank(true);
    try {
      const questionsRes = await getQuestions();
      const list = Array.isArray(questionsRes)
        ? questionsRes
        : (questionsRes?.data?.questions || questionsRes?.message?.data?.questions || questionsRes?.questions || []);
      setBankQuestions(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Failed to fetch question bank:', err);
      showToast.error('Failed to load predefined questions.');
    } finally {
      setLoadingBank(false);
    }
  };

  // Filtered Bank Questions
  const filteredBankQuestions = useMemo(() => {
    return bankQuestions.filter((item: any) => {
      const qText = String(item.question_detail || item.question_title || item.question || item.name || '').toLowerCase();
      const matchesSearch = !bankSearchQuery.trim() || qText.includes(bankSearchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (bankFilterType === 'All') return true;
      const displayType = mapBackendTypeToUI(item.type, item.multiple);
      if (displayType.toLowerCase() === bankFilterType.toLowerCase()) return true;
      if (bankFilterType === 'Single choice' && (item.type === 'Choices' || item.type === 'Choice')) return true;
      if (bankFilterType === 'User input' && (item.type === 'User Input' || item.type === 'User input')) return true;
      if (bankFilterType === 'Open ended' && (item.type === 'Open Ended' || item.type === 'Open ended')) return true;
      return false;
    });
  }, [bankQuestions, bankSearchQuery, bankFilterType]);

  const toggleBankQuestionSelection = (id: string) => {
    const next = new Set(selectedBankNames);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedBankNames(next);
  };

  const handleAddFromBank = () => {
    const newlyAdded: QuizQuestionItem[] = [];
    const seenInBatch = new Set<string>();
    const seenTextsInBatch = new Set<string>();

    bankQuestions.forEach((item: any) => {
      const qId = String(item.question || item.name || '').trim();
      const rowId = String(item.name || item.question || '').trim();
      const qText = String(item.question_detail || item.question_title || item.question || item.name || 'Untitled Question').trim();
      const normText = qText.toLowerCase();

      if (selectedBankNames.has(qId) || selectedBankNames.has(rowId)) {
        // avoid duplicates if already present in quizQuestions or in current batch
        const alreadyExists = quizQuestions.some((q) => {
          const sameId = (q.questionId && (q.questionId.toLowerCase() === qId.toLowerCase() || q.questionId.toLowerCase() === rowId.toLowerCase())) ||
                         (q.name && (q.name.toLowerCase() === qId.toLowerCase() || q.name.toLowerCase() === rowId.toLowerCase()));
          const sameText = normText && q.question && q.question.trim().toLowerCase() === normText;
          return sameId || sameText;
        }) ||
        newlyAdded.some((q) => {
          const sameId = (q.questionId && (q.questionId.toLowerCase() === qId.toLowerCase() || q.questionId.toLowerCase() === rowId.toLowerCase())) ||
                         (q.name && (q.name.toLowerCase() === qId.toLowerCase() || q.name.toLowerCase() === rowId.toLowerCase()));
          const sameText = normText && q.question && q.question.trim().toLowerCase() === normText;
          return sameId || sameText;
        }) ||
        (qId && seenInBatch.has(qId.toLowerCase())) ||
        (rowId && seenInBatch.has(rowId.toLowerCase())) ||
        (normText && seenTextsInBatch.has(normText));

        if (!alreadyExists) {
          if (qId) seenInBatch.add(qId.toLowerCase());
          if (rowId) seenInBatch.add(rowId.toLowerCase());
          if (normText) seenTextsInBatch.add(normText);

          const displayType = mapBackendTypeToUI(item.type, item.multiple);
          newlyAdded.push({
            name: item.name || qId,
            questionId: item.question || item.name,
            question: qText,
            type: item.type || (displayType === 'User input' ? 'User Input' : displayType === 'Open ended' ? 'Open Ended' : 'Choices'),
            multiple: item.multiple !== undefined ? Number(item.multiple) : (displayType === 'Multiple choice' ? 1 : 0),
            displayType,
            marks: Number(item.marks) || 1,
            options: item.options || [],
            possibilities: item.possibilities || [],
          });
        }
      }
    });

    if (newlyAdded.length > 0) {
      setQuizQuestions((prev) => [...prev, ...newlyAdded]);
      setHasUnsavedChanges(true);
      showToast.success(`Added ${newlyAdded.length} question${newlyAdded.length > 1 ? 's' : ''} to quiz!`);
    } else {
      showToast.info('Selected questions are already in the quiz.');
    }

    setSelectedBankNames(new Set());
    setIsBankOpen(false);
  };

  // Option Handlers for Single / Multiple Choice
  const handleOptionTextChange = (index: number, text: string) => {
    const next = [...options];
    next[index] = { ...next[index], text };
    setOptions(next);
  };

  const handleOptionExplanationChange = (index: number, explanation: string) => {
    const next = [...options];
    next[index] = { ...next[index], explanation };
    setOptions(next);
  };

  const handleSingleChoiceCorrect = (index: number) => {
    setOptions(
      options.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === index,
      }))
    );
  };

  const handleMultipleChoiceCorrect = (index: number) => {
    setOptions(
      options.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === index ? !opt.isCorrect : opt.isCorrect,
      }))
    );
  };

  const handleAddOption = () => {
    if (options.length >= 10) {
      showToast.warning('Maximum 10 options allowed.');
      return;
    }
    setOptions((prev) => [
      ...prev,
      { id: String(prev.length + 1), text: '', isCorrect: false, explanation: '' },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      showToast.warning('A choice question must have at least 2 options.');
      return;
    }
    const next = options.filter((_, idx) => idx !== index);
    setOptions(next);
  };

  // Possibility Handlers for User Input
  const handlePossibilityChange = (index: number, text: string) => {
    const next = [...possibilities];
    next[index] = text;
    setPossibilities(next);
  };

  const handleAddPossibility = () => {
    setPossibilities((prev) => [...prev, '']);
  };

  const handleRemovePossibility = (index: number) => {
    if (possibilities.length <= 1) return;
    setPossibilities(possibilities.filter((_, idx) => idx !== index));
  };

  // Save New Question (Matches the exact API requirements)
  const handleSaveQuestion = async () => {
    const trimmedQuestion = (questionText || '').trim();
    if (!trimmedQuestion) {
      showToast.warning('Please enter the question text.');
      return;
    }

    const assignedMarks = isCustomMarks
      ? Number(customMarksValue) || 1
      : questionType === 'Open ended'
      ? Number(openEndedMarks) || 10
      : Number(questionMarks) || 1;

    setIsSavingQuestion(true);

    try {
      let payload: CreateQuestionPayload;

      if (questionType === 'Multiple choice' || questionType === 'Single choice') {
        const isMultiple = questionType === 'Multiple choice';
        const validOptions = (options || []).filter((o) => Boolean(o && typeof o.text === 'string' && o.text.trim()));

        if (validOptions.length < 2) {
          showToast.warning(`Please provide at least 2 options for ${questionType.toLowerCase()}.`);
          setIsSavingQuestion(false);
          return;
        }

        // Ensure at least one option is marked correct
        const hasCorrect = validOptions.some((o) => Boolean(o.isCorrect));
        if (!hasCorrect) {
          validOptions[0].isCorrect = true;
        }

        const obj: Record<string, any> = {
          question: trimmedQuestion,
          type: 'Choices',
          multiple: isMultiple ? 1 : 0,
        };

        validOptions.forEach((opt, idx) => {
          const num = idx + 1;
          obj[`option_${num}`] = (opt.text || '').trim();
          obj[`is_correct_${num}`] = opt.isCorrect ? 1 : 0;
          if (opt.explanation && typeof opt.explanation === 'string' && opt.explanation.trim()) {
            obj[`explanation_${num}`] = opt.explanation.trim();
          }
        });

        payload = obj as CreateQuestionPayload;
      } else if (questionType === 'User input') {
        const validPossibilities = (possibilities || []).filter((p) => Boolean(p && typeof p === 'string' && p.trim()));
        if (validPossibilities.length === 0) {
          showToast.warning('Please provide at least one accepted answer possibility.');
          setIsSavingQuestion(false);
          return;
        }

        const obj: Record<string, any> = {
          question: trimmedQuestion,
          type: 'User Input',
          multiple: 0,
        };

        validPossibilities.forEach((p, idx) => {
          obj[`possibility_${idx + 1}`] = p.trim();
        });

        payload = obj as CreateQuestionPayload;
      } else {
        // Open Ended
        payload = {
          question: trimmedQuestion,
          type: 'Open Ended',
          multiple: 0,
          marks: assignedMarks || 10,
        };
      }

      console.log('handleSaveQuestion calling createQuestion with payload:', payload);

      // Call API
      const res = await createQuestion(payload);

      const isValidId = (val: any): boolean =>
        typeof val === 'string' &&
        val.trim().length > 0 &&
        !val.includes(' ') &&
        !['success', 'ok', 'failed', 'error', 'created', 'true', 'false'].includes(val.toLowerCase()) &&
        (val.startsWith('QTS-') || /^[a-zA-Z0-9_-]{5,30}$/.test(val));

      let resolvedQuestionId: string | null = null;
      if (isValidId(res?.data?.name)) resolvedQuestionId = res.data.name;
      else if (isValidId(res?.name)) resolvedQuestionId = res.name;
      else if (isValidId(res?.message?.name)) resolvedQuestionId = res.message.name;
      else if (isValidId(res?.data?.question)) resolvedQuestionId = res.data.question;
      else if (isValidId(res?.question)) resolvedQuestionId = res.question;
      else if (isValidId(res?.message?.question)) resolvedQuestionId = res.message.question;
      else if (isValidId(res?.message?.data?.name)) resolvedQuestionId = res.message.data.name;
      else if (isValidId(res?.data)) resolvedQuestionId = res.data;
      else if (isValidId(res?.message)) resolvedQuestionId = res.message;
      else if (isValidId(res)) resolvedQuestionId = res;

      // If ID not returned in response, look it up from question bank
      if (!resolvedQuestionId) {
        try {
          const bankRes = await getQuestions();
          const list = Array.isArray(bankRes)
            ? bankRes
            : (bankRes?.data?.questions || bankRes?.message?.data?.questions || bankRes?.questions || []);
          if (Array.isArray(list)) {
            const match = list.find((item: any) => {
              const text = String(item.question_detail || item.question_title || item.question || '').trim().toLowerCase();
              return text === trimmedQuestion.toLowerCase();
            });
            if (match) {
              resolvedQuestionId = match.question || match.name;
            }
          }
        } catch (lookupErr) {
          console.warn('Could not lookup newly created question ID:', lookupErr);
        }
      }

      const finalId = resolvedQuestionId || `QTS-${Date.now()}`;

      // Check if question is already in quiz by ID
      const isAlreadyInQuiz = quizQuestions.some((q) => {
        return (q.questionId && q.questionId.toLowerCase() === finalId.toLowerCase()) || 
               (q.name && q.name.toLowerCase() === finalId.toLowerCase());
      });

      if (isAlreadyInQuiz) {
        showToast.warning('This question is already in the quiz.');
        setIsCreatingQuestion(false);
        setIsSavingQuestion(false);
        return;
      }

      // Add to current quiz's question list (prepend to top so it's instantly visible)
      const newQuizQuestion: QuizQuestionItem = {
        name: finalId,
        questionId: finalId,
        question: trimmedQuestion,
        type: payload.type,
        multiple: payload.multiple !== undefined ? payload.multiple : (questionType === 'Multiple choice' ? 1 : 0),
        displayType: questionType,
        marks: assignedMarks,
        options: questionType.includes('choice') ? [...options] : undefined,
        possibilities: questionType === 'User input' ? [...possibilities] : undefined,
      };

      setQuizQuestions((prev) => [newQuizQuestion, ...prev]);
      setSearchQuestionsQuery(''); // Clear search query so the new question is always displayed
      setHasUnsavedChanges(true);

      // Also add to bank questions so it's instantly available in the Question Bank modal
      setBankQuestions((prev) => [
        {
          name: finalId,
          question: finalId,
          question_detail: trimmedQuestion,
          question_title: trimmedQuestion,
          type: payload.type,
          multiple: payload.multiple !== undefined ? payload.multiple : (questionType === 'Multiple choice' ? 1 : 0),
          marks: assignedMarks,
        },
        ...prev
      ]);

      showToast.success('Question created and added to quiz successfully!');

      // Reset inline form
      setQuestionText('');
      setOptions([
        { id: '1', text: '', isCorrect: true, explanation: '' },
        { id: '2', text: '', isCorrect: false, explanation: '' },
        { id: '3', text: '', isCorrect: false, explanation: '' },
        { id: '4', text: '', isCorrect: false, explanation: '' },
      ]);
      setPossibilities(['', '', '', '']);
      setIsCreatingQuestion(false);
    } catch (err: any) {
      console.error('Failed to create question:', err);
      showToast.error(err?.response?.data?.message?.message || err?.message || 'Failed to save question.');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // Save Quiz Handler
  const handleSaveQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      showToast.warning('Please enter a Quiz Title in the Details panel.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Deduplicate quiz questions by reference AND question text (case-insensitively)
      const seenRefs = new Set<string>();
      const seenTexts = new Set<string>();
      const uniqueQuizQuestions: QuizQuestionItem[] = [];

      for (const q of quizQuestions) {
        const ref = q.questionId || (q.name?.startsWith('QTS-') ? q.name : undefined) || (q.question?.startsWith('QTS-') ? q.question : undefined) || q.name || q.question;
        const normRef = String(ref || '').trim();
        const normText = String(q.question || '').trim().toLowerCase();
        if (!normRef) continue;

        const refKey = normRef.toLowerCase();
        if (seenRefs.has(refKey) || (normText && seenTexts.has(normText))) {
          console.warn(`Skipping duplicate question in quiz: ref=${normRef}, text=${normText}`);
          continue;
        }

        seenRefs.add(refKey);
        if (normText) seenTexts.add(normText);
        uniqueQuizQuestions.push(q);
      }

      if (uniqueQuizQuestions.length !== quizQuestions.length) {
        setQuizQuestions(uniqueQuizQuestions);
        showToast.info('Removed duplicate questions before saving.');
      }

      const questionsPayload = uniqueQuizQuestions.map((q) => {
        const ref = q.questionId || (q.name?.startsWith('QTS-') ? q.name : undefined) || (q.question?.startsWith('QTS-') ? q.question : undefined) || q.name || q.question;
        return {
          question: String(ref).trim(),
          marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
        };
      });

      const payload: CreateQuizPayload = {
        title: title.trim(),
        max_attempts: Number(maxAttempts) || 3,
        duration: Number(duration) || 60,
        passing_percentage: Number(passingPercentage) || 100,
        description: description.trim() || undefined,
        show_answers: showAnswers ? 1 : 0,
        show_submission_history: showSubmissionHistory ? 1 : 0,
        shuffle_questions: shuffleQuestions ? 1 : 0,
        enable_negative_marking: enableNegativeMarking ? 1 : 0,
        questions: questionsPayload,
      };

      if (isEditMode && existingQuizId) {
        await updateQuiz(existingQuizId, payload);
        showToast.success('Quiz updated successfully!');
      } else {
        const res = await createQuiz(payload);
        const createdName = res?.data?.name || res?.message?.name || res?.name;
        if (createdName) {
          setExistingQuizId(createdName);
          setIsEditMode(true);
        }
        showToast.success('Quiz created successfully!');
      }

      setHasUnsavedChanges(false);

      if (returnUrl) {
        setTimeout(() => {
          router.push(returnUrl);
        }, 1200);
      }
    } catch (err: any) {
      console.error('Failed to save quiz:', err);
      showToast.error(err?.response?.data?.message?.message || err?.message || 'Failed to save quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInstructor === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5 border border-amber-100 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Access Restricted</h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              Quiz creation is reserved for verified instructors and administrators.
            </p>
            <Link
              href={returnUrl || "/quizzes"}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all"
            >
              {returnUrl ? "Back to Lesson Editor" : "Back to Quizzes"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#0F172A] text-slate-100">
      <Navbar />

      {/* Top Bar Header (Matches reference image) */}
      <header className="border-b border-slate-800 bg-[#0B1120] sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link
            href={returnUrl || "/quizzes"}
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Quizzes
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-white font-semibold truncate max-w-[200px] sm:max-w-md">
            {title.trim() || (isEditMode ? existingQuizId : 'New Quiz')}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          {hasUnsavedChanges ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Not saved
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Saved
            </span>
          )}

          {/* Preview Button */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>Preview</span>
          </button>

          {/* Submissions / Return Link */}
          {isEditMode && (
            <Link
              href={`/quizzes/${encodeURIComponent(existingQuizId)}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Take Quiz</span>
            </Link>
          )}

          {/* Delete Button (if in edit mode) */}
          {isEditMode && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          {/* Save Quiz Button */}
          <button
            type="button"
            onClick={() => handleSaveQuiz()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Saving...' : 'Save Quiz'}</span>
          </button>
        </div>
      </header>

      {/* Main Dual-Column Studio */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Questions Builder (7 / 12) */}
        <section className="lg:col-span-7 space-y-4">
          {/* Action Row: Search + New Question + Question Bank */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search questions"
                value={searchQuestionsQuery}
                onChange={(e) => setSearchQuestionsQuery(e.target.value)}
                className="w-full bg-[#1E293B] border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingQuestion(true);
                  handleFieldChange();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New question</span>
              </button>

              <button
                type="button"
                onClick={handleOpenBank}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1E293B] hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>Question bank</span>
              </button>
            </div>
          </div>

          {/* Inline Question Creator (Matches Image 2 & 3) */}
          {isCreatingQuestion && (
            <div className="bg-[#1E293B] rounded-2xl border-2 border-indigo-500/50 p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Question Creator Header Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-700/70">
                <div className="flex items-center gap-2.5">
                  {/* Type Selector Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
                    >
                      {questionType === 'Single choice' && <Radio className="w-3.5 h-3.5 text-indigo-400" />}
                      {questionType === 'Multiple choice' && <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />}
                      {questionType === 'User input' && <Type className="w-3.5 h-3.5 text-indigo-400" />}
                      {questionType === 'Open ended' && <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />}
                      <span>{questionType}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
                    </button>

                    {isTypeDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-48 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl py-1 z-40">
                        {(["Single choice", "Multiple choice", "User input", "Open ended"] as QuestionTypeUI[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setQuestionType(t);
                              setIsTypeDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-slate-800 transition-colors ${
                              questionType === t ? 'text-indigo-400 font-bold bg-indigo-950/40' : 'text-slate-300'
                            }`}
                          >
                            {t === 'Single choice' && <Radio className="w-3.5 h-3.5" />}
                            {t === 'Multiple choice' && <CheckSquare className="w-3.5 h-3.5" />}
                            {t === 'User input' && <Type className="w-3.5 h-3.5" />}
                            {t === 'Open ended' && <AlignLeft className="w-3.5 h-3.5" />}
                            <span>{t}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Marks Selector Dropdown (Matches Image 3) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsMarksDropdownOpen(!isMarksDropdownOpen)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isCustomMarks ? `${customMarksValue} marks` : `${questionMarks} mark${questionMarks > 1 ? 's' : ''}`}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                    </button>

                    {isMarksDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-36 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl py-1 z-40 max-h-56 overflow-y-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setQuestionMarks(m);
                              setIsCustomMarks(false);
                              setIsMarksDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-slate-800 transition-colors ${
                              !isCustomMarks && questionMarks === m ? 'text-indigo-400 font-bold bg-indigo-950/40' : 'text-slate-300'
                            }`}
                          >
                            <span>{m} {m === 1 ? 'mark' : 'marks'}</span>
                            {!isCustomMarks && questionMarks === m && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                        <div className="border-t border-slate-700/80 my-1"></div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomMarks(true);
                            setIsMarksDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-slate-800 transition-colors ${
                            isCustomMarks ? 'text-indigo-400 font-bold bg-indigo-950/40' : 'text-slate-300'
                          }`}
                        >
                          <span>Custom...</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isCustomMarks && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={customMarksValue}
                        onChange={(e) => setCustomMarksValue(Math.max(1, Number(e.target.value)))}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[11px] text-slate-400">marks</span>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsCreatingQuestion(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Text formatting bar & Question Input */}
              <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900/80">
                {/* Editor Bar */}
                <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 border-b border-slate-700 text-slate-400 text-xs">
                  <span className="font-bold px-1.5 text-slate-300">T</span>
                  <span className="font-bold px-1.5 text-slate-300 text-[11px]">H1</span>
                  <div className="w-[1px] h-3 bg-slate-700 mx-1"></div>
                  <Bold className="w-3.5 h-3.5 hover:text-slate-200 cursor-pointer" />
                  <Italic className="w-3.5 h-3.5 hover:text-slate-200 cursor-pointer" />
                  <Strikethrough className="w-3.5 h-3.5 hover:text-slate-200 cursor-pointer" />
                  <div className="w-[1px] h-3 bg-slate-700 mx-1"></div>
                  <List className="w-3.5 h-3.5 hover:text-slate-200 cursor-pointer" />
                  <Code className="w-3.5 h-3.5 hover:text-slate-200 cursor-pointer" />
                </div>

                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Type your question here"
                  className="w-full bg-transparent px-3.5 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
                />
              </div>

              {/* Dynamic Answer Fields Based on Type */}
              <div className="space-y-3 pt-1">
                {/* 1 & 2: Single Choice & Multiple Choice */}
                {(questionType === 'Single choice' || questionType === 'Multiple choice') && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                      {questionType === 'Single choice'
                        ? 'Select one radio option as the correct answer.'
                        : 'Check all options that are correct (user can select more than one option).'}
                    </p>

                    <div className="space-y-2.5">
                      {options.map((opt, idx) => (
                        <div
                          key={opt.id}
                          className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 space-y-2"
                        >
                          <div className="flex items-center gap-3">
                            {/* Selector */}
                            {questionType === 'Single choice' ? (
                              <input
                                type="radio"
                                name="single_choice_correct"
                                checked={opt.isCorrect}
                                onChange={() => handleSingleChoiceCorrect(idx)}
                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-600 bg-slate-800 cursor-pointer"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={opt.isCorrect}
                                onChange={() => handleMultipleChoiceCorrect(idx)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-600 bg-slate-800 cursor-pointer"
                              />
                            )}

                            {/* Option Text */}
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                              placeholder={`Option ${idx + 1}`}
                              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />

                            {/* Remove Option */}
                            {options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(idx)}
                                className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Optional Explanation Feedback */}
                          <div className="pl-7">
                            <input
                              type="text"
                              value={opt.explanation}
                              onChange={(e) => handleOptionExplanationChange(idx, e.target.value)}
                              placeholder={`Explanation for option ${idx + 1}, shown as feedback (optional)`}
                              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add option ({options.length}/10)</span>
                    </button>
                  </div>
                )}

                {/* 3: User Input */}
                {questionType === 'User input' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                      Define all accepted answer possibilities (case variations, synonyms, etc.)
                    </p>

                    <div className="space-y-2">
                      {possibilities.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 w-24">
                            Possibility {idx + 1}:
                          </span>
                          <input
                            type="text"
                            value={p}
                            onChange={(e) => handlePossibilityChange(idx, e.target.value)}
                            placeholder={`e.g. ${idx === 0 ? 'New Delhi' : idx === 1 ? 'Delhi' : 'new delhi'}`}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                          {possibilities.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePossibility(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddPossibility}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add possibility</span>
                    </button>
                  </div>
                )}

                {/* 4: Open Ended */}
                {questionType === 'Open ended' && (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-700/80">
                    <p className="text-[11px] text-slate-400">
                      Open ended questions require manual evaluation by the instructor or course evaluator.
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-slate-300">
                        Total Marks for this question:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={openEndedMarks}
                        onChange={(e) => setOpenEndedMarks(Math.max(1, Number(e.target.value)))}
                        className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setIsCreatingQuestion(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 italic">Not saved yet</span>
                  <button
                    type="button"
                    onClick={handleSaveQuestion}
                    disabled={isSavingQuestion}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors disabled:opacity-50"
                  >
                    {isSavingQuestion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isSavingQuestion ? 'Saving question...' : 'Save question'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Questions List (Matches Image 1) */}
          <div className="space-y-2.5">
            {filteredQuizQuestions.length > 0 ? (
              filteredQuizQuestions.map((q, idx) => (
                <div
                  key={q.name || idx}
                  className="group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#1E293B] border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                >
                  {/* Left: Drag grip, index, question text */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical className="w-4 h-4 text-slate-500 cursor-grab shrink-0" />
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                      {q.question}
                    </p>
                  </div>

                  {/* Right: Badges & More Menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Type Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {q.displayType === 'Single choice' && <Radio className="w-3 h-3 text-indigo-400" />}
                      {q.displayType === 'Multiple choice' && <CheckSquare className="w-3 h-3 text-indigo-400" />}
                      {q.displayType === 'User input' && <Type className="w-3 h-3 text-amber-400" />}
                      {q.displayType === 'Open ended' && <AlignLeft className="w-3 h-3 text-emerald-400" />}
                      <span>{q.displayType}</span>
                    </span>

                    {/* Marks Badge */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
                      {q.marks || 1} mark{Number(q.marks) > 1 ? 's' : ''}
                    </span>

                    {/* Options Dropdown Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuIndex(activeMenuIndex === idx ? null : idx)}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuIndex === idx && (
                        <div className="absolute right-0 mt-1 w-36 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl py-1 z-30">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveQuestion(idx, idx - 1)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Move up</span>
                          </button>
                          <button
                            type="button"
                            disabled={idx === quizQuestions.length - 1}
                            onClick={() => moveQuestion(idx, idx + 1)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Move down</span>
                          </button>
                          <div className="border-t border-slate-800 my-1"></div>
                          <button
                            type="button"
                            onClick={() => removeQuestionFromQuiz(idx)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-rose-400 hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                <BookOpen className="w-9 h-9 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-300 mb-1">No questions added yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Add custom questions of 4 different types or choose existing questions from the Question Bank.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingQuestion(true);
                      handleFieldChange();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Question</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenBank}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    <span>From Bank</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Details & Settings Panel (5 / 12) (Matches Image 1) */}
        <section className="lg:col-span-5">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-6 space-y-6 sticky top-20 shadow-xl">
            {/* Details Section */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center justify-between">
                <span>Details</span>
                {totalQuestions > 0 && (
                  <span className="text-xs font-normal text-slate-400">
                    {totalQuestions} questions · {totalMarks} marks
                  </span>
                )}
              </h2>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quiz 1"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    handleFieldChange();
                  }}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Maximum Attempts */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Maximum Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxAttempts}
                  onChange={(e) => {
                    setMaxAttempts(Math.max(1, Number(e.target.value)));
                    handleFieldChange();
                  }}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Duration (in minutes) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Duration (in minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(e) => {
                    setDuration(Math.max(0, Number(e.target.value)));
                    handleFieldChange();
                  }}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Passing Percentage */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Passing Percentage <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingPercentage}
                  onChange={(e) => {
                    setPassingPercentage(Number(e.target.value));
                    handleFieldChange();
                  }}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Total Questions (Calculated) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Total Questions
                </label>
                <input
                  type="text"
                  readOnly
                  value={totalQuestions}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 cursor-not-allowed font-medium"
                />
              </div>

              {/* Total Marks (Calculated) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Total Marks
                </label>
                <input
                  type="text"
                  readOnly
                  value={totalMarks}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800"></div>

            {/* Settings Section (Matches Reference Image) */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white tracking-tight">Settings</h3>

              {/* Show Answers */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Show Answers</p>
                  <p className="text-[11px] text-slate-400">
                    Display correct answers after each question is attempted.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAnswers(!showAnswers);
                    handleFieldChange();
                  }}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                    showAnswers ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              {/* Show Submission History */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Show Submission History</p>
                  <p className="text-[11px] text-slate-400">
                    Allow users to view their past quiz attempts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmissionHistory(!showSubmissionHistory);
                    handleFieldChange();
                  }}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                    showSubmissionHistory ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              {/* Shuffle Questions */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Shuffle Questions</p>
                  <p className="text-[11px] text-slate-400">
                    Randomize the order of questions for each attempt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShuffleQuestions(!shuffleQuestions);
                    handleFieldChange();
                  }}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                    shuffleQuestions ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              {/* Enable Negative Marking */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Enable Negative Marking</p>
                  <p className="text-[11px] text-slate-400">
                    Deduct marks for incorrect answers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEnableNegativeMarking(!enableNegativeMarking);
                    handleFieldChange();
                  }}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                    enableNegativeMarking ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>

            {/* Bottom Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSaveQuiz()}
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSubmitting ? 'Saving Quiz...' : 'Save Quiz'}</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Question Bank Modal */}
      {isBankOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-[#1E293B] rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span>Question Bank</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select predefined questions to add to this quiz.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBankOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search & Filter */}
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions by text or name..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {(["All", "Single choice", "Multiple choice", "User input", "Open ended"]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setBankFilterType(f)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      bankFilterType === f
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 divide-y divide-slate-800/80">
              {loadingBank ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <p className="text-xs">Fetching predefined questions from repository...</p>
                </div>
              ) : filteredBankQuestions.length > 0 ? (
                filteredBankQuestions.map((item: any) => {
                  const id = item.question || item.name;
                  const isChecked = selectedBankNames.has(id) || selectedBankNames.has(item.name);
                  const qText = item.question_detail || item.question_title || item.question || item.name;
                  const normText = String(qText || '').trim().toLowerCase();
                  const isAlreadyInQuiz = quizQuestions.some((q) => {
                    const sameId = q.questionId === id || q.questionId === item.question || q.name === id || q.name === item.name;
                    const sameText = normText && q.question && q.question.trim().toLowerCase() === normText;
                    return sameId || sameText;
                  });
                  const displayType = mapBackendTypeToUI(item.type, item.multiple);

                  return (
                    <div
                      key={item.name || id}
                      onClick={() => !isAlreadyInQuiz && toggleBankQuestionSelection(id)}
                      className={`pt-2.5 pb-2.5 flex items-start gap-3 rounded-lg px-2 transition-colors cursor-pointer ${
                        isChecked ? 'bg-indigo-950/30' : 'hover:bg-slate-800/50'
                      } ${isAlreadyInQuiz ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        disabled={isAlreadyInQuiz}
                        checked={isChecked || isAlreadyInQuiz}
                        onChange={() => !isAlreadyInQuiz && toggleBankQuestionSelection(id)}
                        className="mt-1 w-4 h-4 rounded text-indigo-600 border-slate-600 bg-slate-900 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-100 line-clamp-2">
                          {qText}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {displayType}
                          </span>
                          {item.question && item.question !== qText && (
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/50">
                              {item.question}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {item.marks || 1} mark{Number(item.marks) > 1 ? 's' : ''}
                          </span>
                          {item.parent && (
                            <span className="text-[10px] text-slate-500">
                              From: {item.parent}
                            </span>
                          )}
                          {isAlreadyInQuiz && (
                            <span className="text-[10px] font-bold text-emerald-400 ml-auto">
                              Already in quiz
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No predefined questions found matching your filter.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-700 bg-slate-900 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {selectedBankNames.size} question{selectedBankNames.size === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBankOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddFromBank}
                  disabled={selectedBankNames.size === 0}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40"
                >
                  Add Selected to Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-[#0F172A] rounded-2xl border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  Learner Preview
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {title || 'Quiz Preview'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quizQuestions.length > 0 ? (
              <div className="space-y-6">
                {/* Question tracker */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Question {previewActiveIndex + 1} of {quizQuestions.length}
                  </span>
                  <span className="font-semibold text-amber-400">
                    {quizQuestions[previewActiveIndex]?.marks || 1} mark
                  </span>
                </div>

                {/* Question Text */}
                <h4 className="text-base font-semibold text-slate-100">
                  {quizQuestions[previewActiveIndex]?.question}
                </h4>

                {/* Options / Answer Input Based on Type */}
                <div className="space-y-2.5">
                  {quizQuestions[previewActiveIndex]?.displayType === 'Single choice' && (
                    <div className="space-y-2">
                      {quizQuestions[previewActiveIndex]?.options?.map((opt, i) => (
                        <label
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                        >
                          <input
                            type="radio"
                            name="preview_radio"
                            className="w-4 h-4 text-indigo-600 bg-slate-800 border-slate-700"
                          />
                          <span className="text-xs text-slate-200">{opt.text}</span>
                        </label>
                      )) || (
                        <p className="text-xs text-slate-400 italic">No options defined.</p>
                      )}
                    </div>
                  )}

                  {quizQuestions[previewActiveIndex]?.displayType === 'Multiple choice' && (
                    <div className="space-y-2">
                      {quizQuestions[previewActiveIndex]?.options?.map((opt, i) => (
                        <label
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
                          />
                          <span className="text-xs text-slate-200">{opt.text}</span>
                        </label>
                      )) || (
                        <p className="text-xs text-slate-400 italic">No options defined.</p>
                      )}
                    </div>
                  )}

                  {quizQuestions[previewActiveIndex]?.displayType === 'User input' && (
                    <input
                      type="text"
                      placeholder="Type your answer here..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  )}

                  {quizQuestions[previewActiveIndex]?.displayType === 'Open ended' && (
                    <textarea
                      rows={4}
                      placeholder="Write your detailed explanation..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  )}
                </div>

                {/* Preview navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={previewActiveIndex === 0}
                    onClick={() => setPreviewActiveIndex((prev) => Math.max(0, prev - 1))}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={previewActiveIndex === quizQuestions.length - 1}
                    onClick={() => setPreviewActiveIndex((prev) => Math.min(quizQuestions.length - 1, prev + 1))}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No questions added to preview yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete Quiz Modal */}
      {isDeleteModalOpen && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          title="Delete Quiz"
          message={`Are you sure you want to permanently delete quiz "${title || existingQuizId}"? This action cannot be undone.`}
          confirmLabel="Delete Quiz"
          confirmVariant="danger"
          onConfirm={async () => {
            try {
              if (existingQuizId) {
                // Delete quiz
                const { deleteQuiz } = await import('@/services/lms.services');
                await deleteQuiz(existingQuizId);
                showToast.success('Quiz deleted successfully.');
              }
              router.push('/quizzes');
            } catch (err: any) {
              showToast.error(err?.message || 'Failed to delete quiz.');
            } finally {
              setIsDeleteModalOpen(false);
            }
          }}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function CreateQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F172A] flex justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs text-slate-400">Loading Quiz Studio...</p>
          </div>
        </div>
      }
    >
      <CreateQuizContent />
    </Suspense>
  );
}
