import React, { useState } from 'react';
import { useChatAndKeep } from '../../context/ChatAndKeepContext';
import { useMeeting } from '../../context/MeetingContext';
import { X, Sparkles, Bookmark, CheckCircle2, Calendar, User, Tag } from 'lucide-react';
import { KeepCategory } from '../../types';

interface CaptureMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: KeepCategory;
  initialContent?: string;
  sourceTitle?: string;
}

export const CaptureMemoryModal: React.FC<CaptureMemoryModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'idea',
  initialContent = '',
  sourceTitle = 'Direct Studio Note'
}) => {
  const { addKeepItem, projects } = useChatAndKeep();
  const { atmosphere } = useMeeting();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(initialContent);
  const [category, setCategory] = useState<KeepCategory>(defaultCategory);
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isDark = atmosphere === 'obsidian';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim()) return;

    setIsSaving(true);
    const resolvedTitle = title.trim() || (content.length > 50 ? content.substring(0, 48) + '...' : content);

    await addKeepItem({
      title: resolvedTitle,
      content: content.trim() || resolvedTitle,
      category,
      status: 'confirmed',
      source: {
        type: 'explicit',
        title: sourceTitle,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      },
      projectId: projectId || undefined,
      assignedTo: category === 'task' ? assignedTo.trim() || undefined : undefined,
      dueDate: category === 'task' ? dueDate.trim() || undefined : undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      isAiGenerated: false
    });

    setIsSaving(false);
    onClose();
  };

  const categories: { key: KeepCategory; label: string; desc: string }[] = [
    { key: 'idea', label: 'Idea', desc: 'Creative concept or artistic proposal' },
    { key: 'decision', label: 'Decision', desc: 'Agreed choice or locked commitment' },
    { key: 'task', label: 'Task', desc: 'Actionable item with owner & deadline' },
    { key: 'reference', label: 'Reference', desc: 'Link, book, spec, or asset' },
    { key: 'question', label: 'Question', desc: 'Unresolved inquiry for the team' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDark 
            ? 'bg-[#181715] border-[#2e2a24] text-[#f5f1ea]' 
            : 'bg-[#faf8f5] border-[#e2dcd2] text-[#1a1917]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-[#2e2a24]' : 'border-[#e8e2d7]'
        }`}>
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-[#148b94]" />
            <h3 className="font-serif text-lg tracking-tight font-normal">
              Capture to ROOM Keep
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'text-[#8a8479] hover:text-white hover:bg-[#25221d]' : 'text-[#8a8479] hover:text-black hover:bg-[#ebe5d9]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Picker */}
          <div className="space-y-1.5">
            <label className={`text-xs font-mono uppercase tracking-wider ${
              isDark ? 'text-[#8a8479]' : 'text-[#968e82]'
            }`}>
              Memory Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border transition-all text-center ${
                    category === cat.key
                      ? isDark
                        ? 'bg-[#148b94]/20 border-[#148b94] text-[#4ed2db]'
                        : 'bg-[#148b94]/10 border-[#148b94] text-[#0f6b72]'
                      : isDark
                        ? 'bg-[#22201d] border-[#312d26] text-[#968f82] hover:text-[#ded8cc]'
                        : 'bg-[#f0ebe1] border-[#ddd6c8] text-[#6b6459] hover:text-[#1a1917]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className={`text-xs font-mono uppercase tracking-wider ${
              isDark ? 'text-[#8a8479]' : 'text-[#968e82]'
            }`}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scene 7 will be shot at night"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                isDark 
                  ? 'bg-[#1e1c19] border-[#312d26] text-[#f5f1ea] focus:border-[#148b94]' 
                  : 'bg-white border-[#ded8cc] text-[#1a1917] focus:border-[#148b94]'
              }`}
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <label className={`text-xs font-mono uppercase tracking-wider ${
              isDark ? 'text-[#8a8479]' : 'text-[#968e82]'
            }`}>
              Details & Context
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the decision, idea, or reference in detail..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none resize-none transition-colors ${
                isDark 
                  ? 'bg-[#1e1c19] border-[#312d26] text-[#f5f1ea] focus:border-[#148b94]' 
                  : 'bg-white border-[#ded8cc] text-[#1a1917] focus:border-[#148b94]'
              }`}
            />
          </div>

          {/* Task specific fields */}
          {category === 'task' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className={`text-xs font-mono uppercase tracking-wider flex items-center space-x-1 ${
                  isDark ? 'text-[#8a8479]' : 'text-[#968e82]'
                }`}>
                  <User className="w-3 h-3" />
                  <span>Assignee</span>
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Assignee name (optional)"
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-[#1e1c19] border-[#312d26]' : 'bg-white border-[#ded8cc]'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-mono uppercase tracking-wider flex items-center space-x-1 ${
                  isDark ? 'text-[#8a8479]' : 'text-[#968e82]'
                }`}>
                  <Calendar className="w-3 h-3" />
                  <span>Due Date</span>
                </label>
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="e.g. September 8"
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-[#1e1c19] border-[#312d26]' : 'bg-white border-[#ded8cc]'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Project Association & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className={`text-xs font-mono uppercase tracking-wider ${
                isDark ? 'text-[#8a8479]' : 'text-[#968e82]'
              }`}>
                Project Space
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                  isDark ? 'bg-[#1e1c19] border-[#312d26] text-[#f5f1ea]' : 'bg-white border-[#ded8cc] text-[#1a1917]'
                }`}
              >
                <option value="">General (No project)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={`text-xs font-mono uppercase tracking-wider flex items-center space-x-1 ${
                isDark ? 'text-[#8a8479]' : 'text-[#968e82]'
              }`}>
                <Tag className="w-3 h-3" />
                <span>Tags (comma separated)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Cinematography, Audio, Script"
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                  isDark ? 'bg-[#1e1c19] border-[#312d26]' : 'bg-white border-[#ded8cc]'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-dashed border-[#8a8479]/20">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                isDark ? 'text-[#a69f92] hover:bg-[#25221d]' : 'text-[#6b6459] hover:bg-[#ede7db]'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all shadow-sm"
            >
              {isSaving ? 'Saving to Keep…' : 'Remember to Keep'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
