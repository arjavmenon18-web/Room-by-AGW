import React, { useState } from 'react';
import { useMeeting } from '../../context/MeetingContext';
import { 
  X, 
  FileText, 
  FolderOpen, 
  Layers, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Plus, 
  CheckSquare, 
  Square, 
  Send, 
  ExternalLink,
  Bot,
  RefreshCw,
  Film,
  Music,
  Image as ImageIcon
} from 'lucide-react';
import { WorkspaceSubTab } from '../../types';

export const WorkspacePanel: React.FC = () => {
  const {
    user,
    room,
    setActiveDrawer,
    workspaceTab,
    setWorkspaceTab,
    notes,
    updateNotes,
    projectAssets,
    addProjectAsset,
    projectTasks,
    toggleTask,
    aiSummary,
    isAiSummarizing,
    generateMeetingSummary,
    aiChatQuery,
    setAiChatQuery,
    aiChatHistory,
    askAiAssistant,
    isAiAsking,
  } = useMeeting();

  const [copiedNotes, setCopiedNotes] = useState(false);
  const [assetFilter, setAssetFilter] = useState<'all' | 'script' | 'document' | 'image' | 'video' | 'task' | 'reference'>('all');
  const [newAssetTitle, setNewAssetTitle] = useState('');

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(notes);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetTitle.trim()) return;
    addProjectAsset({
      title: newAssetTitle.trim(),
      category: 'document',
      author: user?.name || 'User',
      size: '1.2 MB',
      version: 'v1.0',
      status: 'in-review',
    });
    setNewAssetTitle('');
  };

  const filteredAssets = assetFilter === 'all' 
    ? projectAssets 
    : projectAssets.filter((a) => a.category === assetFilter);

  return (
    <div className="w-80 sm:w-[420px] h-full bg-[#141311] border-l border-[#24211d] flex flex-col justify-between select-none animate-in slide-in-from-right duration-200">
      {/* Header & Tabs */}
      <div className="border-b border-[#24211d]">
        <div className="p-4 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#d97746]" />
            <h3 className="text-sm font-medium text-[#ede8df]">
              Workspace
            </h3>
          </div>
          <button
            onClick={() => setActiveDrawer(null)}
            className="p-1 rounded text-[#8f887d] hover:text-[#ede8df] hover:bg-[#211e1b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs: Notes, Files, Project, AI */}
        <div className="flex items-center px-3 space-x-1 overflow-x-auto text-xs font-medium text-[#8f887c]">
          {[
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'files', label: 'Files', icon: FolderOpen },
            { id: 'project', label: 'Project Hub', icon: Layers },
            { id: 'ai', label: 'Armen AI', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = workspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setWorkspaceTab(tab.id as WorkspaceSubTab)}
                className={`py-2 px-2.5 border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[#d97746] text-[#ede8df]'
                    : 'border-transparent text-[#8f887c] hover:text-[#b8b0a2]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#d97746]' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TAB 1: LIVE COLLABORATIVE NOTES */}
        {workspaceTab === 'notes' && (
          <div className="space-y-3 h-full flex flex-col">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-mono text-[#8f887c] flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Auto-saved to Cloud • Markdown</span>
              </span>

              <button
                onClick={handleCopyNotes}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#211e19] hover:bg-[#2b2721] text-[#d9d3c7] font-mono text-[11px] border border-[#302b23] transition-colors"
              >
                {copiedNotes ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Record live meeting decisions, sequence timecodes, and creative direction..."
              className="flex-1 w-full bg-[#171513] border border-[#2b2722] rounded-xl p-3.5 text-xs text-[#ede8df] font-mono leading-relaxed resize-none focus:outline-none focus:border-[#d97746]"
            />

            <div className="flex items-center justify-between text-[11px] text-[#736d62] pt-1">
              <span>Notes synchronized locally</span>
              <button
                onClick={generateMeetingSummary}
                className="text-[#d97746] hover:underline font-mono"
              >
                Synthesize with AI →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: FILES & ASSETS */}
        {workspaceTab === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#a8a092]">
                Shared Room Files & LUTs
              </span>
              <span className="text-[#7d7568]">{projectAssets.length} items</span>
            </div>

            {/* Upload form simulation */}
            <form onSubmit={handleAddAsset} className="flex gap-2">
              <input
                type="text"
                value={newAssetTitle}
                onChange={(e) => setNewAssetTitle(e.target.value)}
                placeholder="Upload asset (e.g. Look_Book_v3.pdf)"
                className="flex-1 bg-[#1a1816] border border-[#2e2a23] rounded-lg px-3 py-1.5 text-xs text-[#ede8df] focus:outline-none focus:border-[#d97746]"
              />
              <button
                type="submit"
                disabled={!newAssetTitle.trim()}
                className="px-3 py-1.5 rounded-lg bg-[#24211d] hover:bg-[#302c26] text-xs font-medium text-[#ede8df] transition-colors disabled:opacity-40"
              >
                Upload
              </button>
            </form>

            {/* Asset List */}
            <div className="space-y-2">
              {projectAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="p-3 rounded-xl bg-[#171513] border border-[#26231e] hover:border-[#38332b] transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5 truncate max-w-[75%]">
                    <div className="p-2 rounded-lg bg-[#211e1a] text-[#d97746]">
                      {asset.category === 'script' ? (
                        <FileText className="w-4 h-4" />
                      ) : asset.category === 'image' ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : asset.category === 'video' ? (
                        <Film className="w-4 h-4" />
                      ) : (
                        <FolderOpen className="w-4 h-4" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-[#ede8df] truncate">
                        {asset.title}
                      </div>
                      <div className="text-[10px] text-[#787267] flex items-center space-x-2 font-mono">
                        <span>{asset.size || '3.2 MB'}</span>
                        <span>•</span>
                        <span>{asset.version || 'v1.0'}</span>
                        <span>•</span>
                        <span>{asset.author}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => alert(`Downloading ${asset.title}`)}
                    className="p-1.5 rounded-lg text-[#8f887c] hover:text-[#ede8df] hover:bg-[#26221c]"
                    title="Download asset"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PROJECT HUB */}
        {workspaceTab === 'project' && (
          <div className="space-y-5">
            {/* Project Banner */}
            <div className="p-3.5 rounded-xl bg-[#1a1816] border border-[#2b2721] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[#d97746] tracking-wider font-semibold">
                  Project Workspace
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#2b221a] text-[#d97746] border border-[#3d2b1d] font-mono">
                  Active
                </span>
              </div>
              <h4 className="text-sm font-serif text-[#ede8df] font-normal">
                {room?.projectContext?.title || room?.title || 'Shared Project'}
              </h4>
              <p className="text-[11px] text-[#8f887c] leading-relaxed">
                {room?.projectContext?.description ||
                  'Collaborative project workspace for meetings, notes, and shared assets.'}
              </p>
            </div>

            {/* Task Checklist Linked to Meeting */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#a8a092]">
                  Agenda Action Tasks
                </span>
                <span className="text-[11px] text-[#7d7568] font-mono">
                  {projectTasks.filter((t) => t.completed).length}/{projectTasks.length} Done
                </span>
              </div>

              <div className="space-y-1.5">
                {projectTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start space-x-2.5 ${
                      task.completed
                        ? 'bg-[#151412] border-[#24211d] text-[#736d62]'
                        : 'bg-[#181614] border-[#2e2a23] text-[#ede8df] hover:border-[#3d372e]'
                    }`}
                  >
                    <button className="mt-0.5 text-[#d97746]">
                      {task.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-[#80796f]" />
                      )}
                    </button>
                    <div className="flex-1 text-xs">
                      <span className={task.completed ? 'line-through' : 'font-medium'}>
                        {task.title}
                      </span>
                      <div className="flex items-center space-x-2 mt-1 text-[10px] text-[#7d7568] font-mono">
                        <span>Assignee: {task.assignee}</span>
                        <span>•</span>
                        <span>Due {task.dueDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Studio Project Branches */}
            <div className="p-3 rounded-xl bg-[#161513] border border-[#26231e] space-y-2 text-xs text-[#8f887c]">
              <div className="font-mono text-[10px] uppercase text-[#a8a092]">
                Connected Workspaces
              </div>
              <div className="flex justify-between">
                <span>Shared Files & Documents</span>
                <span className="text-[#ede8df] font-mono">Live</span>
              </div>
              <div className="flex justify-between">
                <span>Project Notes & Memory</span>
                <span className="text-[#ede8df] font-mono">Synchronized</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI ASSISTANT */}
        {workspaceTab === 'ai' && (
          <div className="space-y-4 h-full flex flex-col">
            {/* Generate Summary Trigger */}
            <div className="p-3.5 rounded-xl bg-[#1b1815] border border-[#332b22] space-y-2.5">
              <div className="flex items-center space-x-2 text-xs text-[#d97746]">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium font-mono uppercase tracking-wider text-[11px]">
                  Armen Intelligence Engine
                </span>
              </div>
              <p className="text-xs text-[#9e9689] leading-relaxed">
                Generate an executive synthesis capturing room discussion, notes, and decisions.
              </p>
              <button
                onClick={generateMeetingSummary}
                disabled={isAiSummarizing}
                className="w-full py-2 rounded-lg bg-[#d97746] hover:bg-[#ea8754] text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 shadow disabled:opacity-50"
              >
                {isAiSummarizing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Room Dialog...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Executive Synthesis</span>
                  </>
                )}
              </button>
            </div>

            {/* Generated Summary Card */}
            {aiSummary && (
              <div className="p-4 rounded-xl bg-[#171513] border border-[#2e2923] text-xs text-[#ede8df] space-y-3 leading-relaxed">
                <div className="flex items-center justify-between pb-2 border-b border-[#26231e]">
                  <span className="font-mono text-[10px] uppercase text-[#a8a092]">
                    Executive Meeting Brief
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiSummary);
                      alert('Executive summary copied to clipboard');
                    }}
                    className="text-[11px] font-mono text-[#d97746] hover:underline"
                  >
                    Copy Brief
                  </button>
                </div>
                <div className="prose prose-invert prose-xs text-[#d9d3c7] whitespace-pre-wrap font-sans">
                  {aiSummary}
                </div>
              </div>
            )}

            {/* In-Room AI Q&A Dialogue */}
            <div className="flex-1 flex flex-col space-y-2 pt-2 border-t border-[#24211d]">
              <span className="text-[11px] font-mono uppercase text-[#8f887c]">
                Armen Intelligence
              </span>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-48 text-xs">
                {aiChatHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg ${
                      item.role === 'user'
                        ? 'bg-[#29231c] text-[#ede8df] ml-4'
                        : 'bg-[#181614] border border-[#2b2721] text-[#cfc8bc] mr-4'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-[#7d7568] mb-1">
                      {item.role === 'user' ? 'You' : 'Armen AI'}
                    </div>
                    <p className="leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>

              {/* Ask Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  askAiAssistant(aiChatQuery);
                }}
                className="flex gap-1.5 pt-1"
              >
                <input
                  type="text"
                  placeholder="Ask Armen AI about this session or project..."
                  value={aiChatQuery}
                  onChange={(e) => setAiChatQuery(e.target.value)}
                  disabled={isAiAsking}
                  className="flex-1 bg-[#1b1916] border border-[#2b2722] rounded-lg px-3 py-1.5 text-xs text-[#ede8df] focus:outline-none focus:border-[#d97746]"
                />
                <button
                  type="submit"
                  disabled={isAiAsking || !aiChatQuery.trim()}
                  className="p-2 rounded-lg bg-[#26221c] hover:bg-[#332e26] text-[#ede8df] disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
