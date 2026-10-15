"use client";

import { useState, useEffect } from "react";
import { Bell, Building2, CircleAlert, CircleCheck, FolderTree, History, ListChecks, LoaderCircle, X, Zap } from "lucide-react";
import { configApi, SystemConfig, Category, ConfigVersion, ConfigHistoryResponse } from "@/lib/config-api";
import { topic } from "@/lib/topic";
import { CategoryEditor } from "@/components/config/CategoryEditor";
import { ListEditor } from "@/components/config/ListEditor";
import { SaveDialog } from "@/components/config/SaveDialog";
import { VersionHistoryDialog } from "@/components/config/VersionHistoryDialog";
import { Badge } from "@/components/ui/Badge";
import { StateMessage } from "@/components/ui/StateMessage";
import { TabItem, Tabs, tabPanelProps } from "@/components/ui/Tabs";
import { buttonClass, CARD, ICON_BUTTON } from "@/components/ui/styles";

type ConfigTab = "categories" | "permit_types" | "departments" | "impact_types" | "urgency_levels";
type ListKey = Exclude<ConfigTab, "categories">;

interface Notice {
  tone: "success" | "error";
  text: string;
}

const ICON = "h-4 w-4";
const TABS: TabItem<ConfigTab>[] = [
  { id: "categories", label: "Categories & Subcategories", icon: <FolderTree className={ICON} aria-hidden="true" /> },
  { id: "permit_types", label: topic.itemLabelPlural, icon: <ListChecks className={ICON} aria-hidden="true" /> },
  { id: "departments", label: "Departments", icon: <Building2 className={ICON} aria-hidden="true" /> },
  { id: "impact_types", label: "Impact Types", icon: <Zap className={ICON} aria-hidden="true" /> },
  { id: "urgency_levels", label: "Urgency Levels", icon: <Bell className={ICON} aria-hidden="true" /> },
];

export default function SystemConfigManager() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [versionHistory, setVersionHistory] = useState<ConfigVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>("categories");
  const [hasChanges, setHasChanges] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Editing states
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{ category: string; index: number } | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: ConfigTab; index: number } | null>(null);

  useEffect(() => {
    // Load version history first to get current version, then load config
    const initialize = async () => {
      await loadVersionHistory();
      await loadConfig();
    };
    initialize();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await configApi.getConfig();
      setConfig(configData);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersionHistory = async () => {
    try {
      const history: ConfigHistoryResponse = await configApi.getConfigHistory();
      setVersionHistory(history.versions);
      if (history.current_version !== null && history.current_version !== undefined) {
        setCurrentVersion(history.current_version);
      }
    } catch (error) {
      console.error("Failed to load version history:", error);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      const result = await configApi.updateConfig(config, changeNotes);
      setHasChanges(false);
      setChangeNotes("");
      setShowSaveModal(false);
      setNotice({ tone: "success", text: `Configuration saved successfully! New version: ${result.version}` });
      await loadConfig(); // Reload to get updated version
      await loadVersionHistory(); // Reload version history
    } catch (error) {
      console.error("Failed to save config:", error);
      setNotice({ tone: "error", text: "Failed to save configuration. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleActivateVersion = async (version: number) => {
    if (!confirm(`Are you sure you want to activate version ${version}? This will rollback to that version.`)) {
      return;
    }
    
    try {
      await configApi.activateVersion(version);
      setNotice({ tone: "success", text: `Version ${version} activated successfully!` });
      await loadConfig();
      await loadVersionHistory();
      setShowVersionModal(false);
    } catch (error: any) {
      console.error("Failed to activate version:", error);
      setNotice({ tone: "error", text: error.response?.data?.detail || "Failed to activate version. Please try again." });
    }
  };

  const handleDeleteVersion = async (version: number) => {
    if (!confirm(`Are you sure you want to delete version ${version}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await configApi.deleteVersion(version);
      setNotice({ tone: "success", text: `Version ${version} deleted successfully!` });
      await loadVersionHistory();
      setShowVersionModal(false);
    } catch (error: any) {
      console.error("Failed to delete version:", error);
      setNotice({ tone: "error", text: error.response?.data?.detail || "Failed to delete version. Make sure it's not the active version." });
    }
  };

  const handleLoadVersion = async (version: number) => {
    try {
      const versionConfig = await configApi.getConfigByVersion(version);
      setConfig(versionConfig);
      setSelectedVersion(version);
      setHasChanges(true);
      setShowVersionModal(false);
    } catch (error) {
      console.error("Failed to load version:", error);
      setNotice({ tone: "error", text: "Failed to load version. Please try again." });
    }
  };

  const handleStopViewingVersion = async () => {
    // Reload the active config and clear selected version
    await loadConfig();
    setSelectedVersion(null);
    setHasChanges(false);
  };

  // Category management
  const addCategory = () => {
    if (!config) return;
    const newCategory: Category = { name: "", subcategories: [""] };
    setConfig({ ...config, categories: [...config.categories, newCategory] });
    setHasChanges(true);
    setEditingCategory(`new-${Date.now()}`);
  };

  const updateCategory = (index: number, field: "name" | "subcategories", value: string | string[]) => {
    if (!config) return;
    const updated = [...config.categories];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, categories: updated });
    setHasChanges(true);
  };

  const deleteCategory = (index: number) => {
    if (!config) return;
    if (!confirm("Are you sure you want to delete this category? All subcategories will be removed.")) return;
    const updated = config.categories.filter((_, i) => i !== index);
    setConfig({ ...config, categories: updated });
    setHasChanges(true);
  };

  const addSubcategory = (categoryIndex: number) => {
    if (!config) return;
    const target = config.categories[categoryIndex];
    const subcategories = [...target.subcategories, ""];
    const updated = config.categories.map((c, i) => (i === categoryIndex ? { ...c, subcategories } : c));
    setConfig({ ...config, categories: updated });
    setHasChanges(true);
    setEditingSubcategory({ category: target.name, index: subcategories.length - 1 });
  };

  const updateSubcategory = (categoryIndex: number, subcatIndex: number, value: string) => {
    if (!config) return;
    const updated = config.categories.map((c, i) =>
      i === categoryIndex ? { ...c, subcategories: c.subcategories.map((s, j) => (j === subcatIndex ? value : s)) } : c
    );
    setConfig({ ...config, categories: updated });
    setHasChanges(true);
  };

  const deleteSubcategory = (categoryIndex: number, subcatIndex: number) => {
    if (!config) return;
    const updated = config.categories.map((c, i) =>
      i === categoryIndex ? { ...c, subcategories: c.subcategories.filter((_, j) => j !== subcatIndex) } : c
    );
    setConfig({ ...config, categories: updated });
    setHasChanges(true);
  };

  // Generic list management (for permit_types, departments, etc.)
  const addListItem = (type: ConfigTab) => {
    if (!config) return;
    const key = type as ListKey;
    setConfig({ ...config, [key]: [...config[key], ""] });
    setHasChanges(true);
    setEditingItem({ type, index: config[key].length });
  };

  const updateListItem = (type: ConfigTab, index: number, value: string) => {
    if (!config) return;
    const key = type as ListKey;
    const updated = [...config[key]];
    updated[index] = value;
    setConfig({ ...config, [key]: updated });
    setHasChanges(true);
  };

  const deleteListItem = (type: ConfigTab, index: number) => {
    if (!config) return;
    const key = type as ListKey;
    if (!confirm(`Are you sure you want to delete "${config[key][index]}"?`)) return;
    const updated = config[key].filter((_, i) => i !== index);
    setConfig({ ...config, [key]: updated });
    setHasChanges(true);
  };

  if (loading) {
    return <StateMessage kind="loading" title="Loading configuration..." />;
  }

  if (!config) {
    return (
      <StateMessage
        kind="error"
        title="Failed to load configuration."
        action={<button type="button" onClick={loadConfig} className={buttonClass("secondary", "sm")}>Try again</button>}
      />
    );
  }

  const lists: Record<ListKey, string> = {
    permit_types: topic.itemLabelPlural,
    departments: "Departments",
    impact_types: "Impact Types",
    urgency_levels: "Urgency Levels",
  };

  return (
    <div className={CARD}>
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl text-[#091F2F]">System Configuration</h2>
            <p className="mt-1 text-sm text-slate-600">Manage categories, permit types, and other system settings</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                Current Version:
                <Badge tone="green" dot>v{currentVersion ?? "N/A"}</Badge>
              </span>
              {selectedVersion && selectedVersion !== currentVersion && (
                <span className="flex items-center gap-2 text-slate-600">
                  Viewing:
                  <span className="font-ui inline-flex items-center gap-1 rounded-full border border-[#1871bd]/40 bg-white py-0.5 pr-1 pl-2.5 text-xs font-semibold text-[#0f4c81]">
                    v{selectedVersion}
                    <button
                      type="button"
                      onClick={handleStopViewingVersion}
                      className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-[#1871bd]/10"
                      aria-label="Stop viewing this version"
                      title="Stop viewing this version"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {hasChanges && (
              <span role="status" className="font-ui inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                Unsaved changes
              </span>
            )}
            <button type="button" onClick={() => setShowVersionModal(true)} className={buttonClass("secondary")}>
              <History className="h-4 w-4" aria-hidden="true" />
              Versions
            </button>
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              disabled={!hasChanges || saving}
              className={buttonClass("primary")}
            >
              {saving && <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {notice && (
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            className={`mt-4 flex items-start gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
              notice.tone === "error"
                ? "border-red-200 bg-red-50 text-[var(--text-danger)]"
                : "border-green-200 bg-green-50 text-[var(--text-success)]"
            }`}
          >
            {notice.tone === "error" ? (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} className={`${ICON_BUTTON} -my-1 h-6 w-6`} aria-label="Dismiss message">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        idPrefix="config"
        label="Configuration lists"
        className="border-b border-slate-200 px-6"
      />

      {/* Content */}
      <div {...tabPanelProps("config", activeTab)} className="p-6 focus:outline-none">
        {activeTab === "categories" ? (
          <CategoryEditor
            categories={config.categories}
            onAdd={addCategory}
            onRename={(index, name) => updateCategory(index, "name", name)}
            onDelete={deleteCategory}
            onAddSub={addSubcategory}
            onUpdateSub={updateSubcategory}
            onDeleteSub={deleteSubcategory}
          />
        ) : (
          <ListEditor
            title={lists[activeTab]}
            items={config[activeTab]}
            onAdd={() => addListItem(activeTab)}
            onUpdate={(index, value) => updateListItem(activeTab, index, value)}
            onDelete={(index) => deleteListItem(activeTab, index)}
          />
        )}
      </div>

      {showSaveModal && (
        <SaveDialog
          notes={changeNotes}
          onNotesChange={setChangeNotes}
          saving={saving}
          onSave={handleSave}
          onCancel={() => {
            setShowSaveModal(false);
            setChangeNotes("");
          }}
        />
      )}

      {showVersionModal && (
        <VersionHistoryDialog
          versions={versionHistory}
          onClose={() => setShowVersionModal(false)}
          onLoad={handleLoadVersion}
          onActivate={handleActivateVersion}
          onDelete={handleDeleteVersion}
        />
      )}
    </div>
  );
}
