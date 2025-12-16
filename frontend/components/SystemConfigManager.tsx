"use client";

import { useState, useEffect } from "react";
import { configApi, SystemConfig, Category } from "@/lib/config-api";

type ConfigTab = "categories" | "permit_types" | "departments" | "impact_types" | "urgency_levels";

export default function SystemConfigManager() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>("categories");
  const [hasChanges, setHasChanges] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Editing states
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{ category: string; index: number } | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: ConfigTab; index: number } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await configApi.getConfig();
      setConfig(data);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
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
      alert(`Configuration saved successfully! New version: ${result.version}`);
      await loadConfig(); // Reload to get updated version
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("Failed to save configuration. Please try again.");
    } finally {
      setSaving(false);
    }
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
    const updated = [...config.categories];
    updated[categoryIndex].subcategories.push("");
    setConfig({ ...config, categories: updated });
    setHasChanges(true);
    setEditingSubcategory({ category: updated[categoryIndex].name, index: updated[categoryIndex].subcategories.length - 1 });
  };

  const updateSubcategory = (categoryIndex: number, subcatIndex: number, value: string) => {
    if (!config) return;
    const updated = [...config.categories];
    updated[categoryIndex].subcategories[subcatIndex] = value;
    setConfig({ ...config, categories: updated });
    setHasChanges(true);
  };

  const deleteSubcategory = (categoryIndex: number, subcatIndex: number) => {
    if (!config) return;
    const updated = [...config.categories];
    updated[categoryIndex].subcategories = updated[categoryIndex].subcategories.filter((_, i) => i !== subcatIndex);
    setConfig({ ...config, categories: updated });
    setHasChanges(true);
  };

  // Generic list management (for permit_types, departments, etc.)
  const addListItem = (type: ConfigTab) => {
    if (!config) return;
    const key = type === "permit_types" ? "permit_types" :
                type === "departments" ? "departments" :
                type === "impact_types" ? "impact_types" : "urgency_levels";
    setConfig({ ...config, [key]: [...config[key], ""] });
    setHasChanges(true);
    setEditingItem({ type, index: config[key].length });
  };

  const updateListItem = (type: ConfigTab, index: number, value: string) => {
    if (!config) return;
    const key = type === "permit_types" ? "permit_types" :
                type === "departments" ? "departments" :
                type === "impact_types" ? "impact_types" : "urgency_levels";
    const updated = [...config[key]];
    updated[index] = value;
    setConfig({ ...config, [key]: updated });
    setHasChanges(true);
  };

  const deleteListItem = (type: ConfigTab, index: number) => {
    if (!config) return;
    const key = type === "permit_types" ? "permit_types" :
                type === "departments" ? "departments" :
                type === "impact_types" ? "impact_types" : "urgency_levels";
    if (!confirm(`Are you sure you want to delete "${config[key][index]}"?`)) return;
    const updated = config[key].filter((_, i) => i !== index);
    setConfig({ ...config, [key]: updated });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center border" style={{ borderColor: 'var(--boston-gray-medium)' }}>
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: 'var(--boston-optimistic-blue)' }}></div>
        <p className="font-medium" style={{ color: 'var(--boston-gray-dark)' }}>Loading configuration...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border" style={{ borderColor: 'var(--boston-gray-medium)' }}>
        <p style={{ color: 'var(--boston-freedom-trail-red)' }}>Failed to load configuration.</p>
      </div>
    );
  }

  const tabs = [
    { id: "categories" as ConfigTab, label: "Categories & Subcategories", icon: "📁" },
    { id: "permit_types" as ConfigTab, label: "Permit Types", icon: "📋" },
    { id: "departments" as ConfigTab, label: "Departments", icon: "🏢" },
    { id: "impact_types" as ConfigTab, label: "Impact Types", icon: "⚡" },
    { id: "urgency_levels" as ConfigTab, label: "Urgency Levels", icon: "🔔" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md border" style={{ borderColor: 'var(--boston-gray-medium)' }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--boston-gray-medium)' }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--boston-charles-blue)' }}>System Configuration</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--boston-gray-dark)' }}>Manage categories, permit types, and other system settings</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm font-medium" style={{ color: 'var(--urgency-medium)' }}>Unsaved changes</span>
          )}
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!hasChanges || saving}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={
              hasChanges && !saving
                ? { backgroundColor: 'var(--boston-optimistic-blue)', color: 'white' }
                : { backgroundColor: 'var(--boston-gray-medium)', color: 'var(--boston-gray-dark)', cursor: 'not-allowed' }
            }
            onMouseEnter={(e) => {
              if (hasChanges && !saving) {
                e.currentTarget.style.backgroundColor = 'var(--boston-charles-blue)';
              }
            }}
            onMouseLeave={(e) => {
              if (hasChanges && !saving) {
                e.currentTarget.style.backgroundColor = 'var(--boston-optimistic-blue)';
              }
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-6" style={{ borderColor: 'var(--boston-gray-medium)' }}>
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-3 font-medium text-sm transition-colors border-b-2"
              style={
                activeTab === tab.id
                  ? { borderColor: 'var(--boston-optimistic-blue)', color: 'var(--boston-optimistic-blue)' }
                  : { borderColor: 'transparent', color: 'var(--boston-gray-dark)' }
              }
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--boston-charles-blue)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--boston-gray-dark)';
                }
              }}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "categories" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--boston-charles-blue)' }}>Categories & Subcategories</h3>
              <button
                onClick={addCategory}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105"
                style={{ 
                  backgroundColor: 'var(--boston-green)',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1e7e1e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--boston-green)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Add Category
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {config.categories.map((category, catIndex) => (
                <div key={catIndex} className="border rounded-lg p-3 transition-all hover:shadow-sm" style={{ borderColor: 'var(--boston-gray-medium)', backgroundColor: 'white' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--boston-optimistic-blue)', flexShrink: 0 }}>
                      <path d="M3 4.5H15M3 9H15M3 13.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) => updateCategory(catIndex, "name", e.target.value)}
                      placeholder="Category name"
                      className="flex-1 px-2 py-1.5 text-sm border-0 border-b-2 rounded-none focus:outline-none transition-colors"
                      style={{ 
                        borderColor: 'var(--boston-gray-medium-dark)',
                        color: 'var(--boston-gray-dark)',
                        backgroundColor: 'transparent'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--boston-optimistic-blue)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--boston-gray-medium-dark)';
                      }}
                    />
                    <button
                      onClick={() => deleteCategory(catIndex)}
                      className="p-1.5 rounded transition-colors hover:bg-red-50"
                      style={{ color: 'var(--boston-freedom-trail-red)' }}
                      title="Delete category"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="ml-7">
                    <div className="grid grid-cols-1 gap-1.5 mb-2">
                      {category.subcategories.map((subcat, subIndex) => (
                        <div key={subIndex} className="flex items-center gap-2 group">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--boston-gray-medium-dark)', flexShrink: 0 }}>
                            <circle cx="6" cy="6" r="2" fill="currentColor"/>
                          </svg>
                          <input
                            type="text"
                            value={subcat}
                            onChange={(e) => updateSubcategory(catIndex, subIndex, e.target.value)}
                            placeholder="Subcategory"
                            className="flex-1 px-2 py-1 text-sm border-0 border-b border-dashed rounded-none focus:outline-none transition-colors"
                            style={{ 
                              borderColor: 'var(--boston-gray-medium)',
                              color: 'var(--boston-gray-dark)',
                              backgroundColor: 'transparent'
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = 'var(--boston-optimistic-blue)';
                              e.currentTarget.style.borderStyle = 'solid';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'var(--boston-gray-medium)';
                              e.currentTarget.style.borderStyle = 'dashed';
                            }}
                          />
                          <button
                            onClick={() => deleteSubcategory(catIndex, subIndex)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-red-50"
                            style={{ color: 'var(--boston-freedom-trail-red)' }}
                            title="Remove subcategory"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addSubcategory(catIndex)}
                      className="ml-4 flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors hover:bg-blue-50"
                      style={{ color: 'var(--boston-optimistic-blue)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 3V9M3 6H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Add subcategory
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "permit_types" && (
          <ListSection
            title="Permit Types"
            items={config.permit_types}
            onAdd={() => addListItem("permit_types")}
            onUpdate={(index, value) => updateListItem("permit_types", index, value)}
            onDelete={(index) => deleteListItem("permit_types", index)}
          />
        )}

        {activeTab === "departments" && (
          <ListSection
            title="Departments"
            items={config.departments}
            onAdd={() => addListItem("departments")}
            onUpdate={(index, value) => updateListItem("departments", index, value)}
            onDelete={(index) => deleteListItem("departments", index)}
          />
        )}

        {activeTab === "impact_types" && (
          <ListSection
            title="Impact Types"
            items={config.impact_types}
            onAdd={() => addListItem("impact_types")}
            onUpdate={(index, value) => updateListItem("impact_types", index, value)}
            onDelete={(index) => deleteListItem("impact_types", index)}
          />
        )}

        {activeTab === "urgency_levels" && (
          <ListSection
            title="Urgency Levels"
            items={config.urgency_levels}
            onAdd={() => addListItem("urgency_levels")}
            onUpdate={(index, value) => updateListItem("urgency_levels", index, value)}
            onDelete={(index) => deleteListItem("urgency_levels", index)}
          />
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--boston-charles-blue)' }}>Save Configuration Changes</h3>
            <p className="mb-4" style={{ color: 'var(--boston-gray-dark)' }}>
              This will create a new version of the configuration. Please add notes about what changed:
            </p>
            <textarea
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="E.g., Added new category for technology issues, updated permit types..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 mb-4"
              style={{ 
                borderColor: 'var(--boston-gray-medium-dark)',
                color: 'var(--boston-gray-dark)',
                backgroundColor: 'white'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--boston-optimistic-blue)';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24, 113, 189, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--boston-gray-medium-dark)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              rows={4}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setChangeNotes("");
                }}
                className="px-4 py-2 border rounded-lg transition-colors"
                style={{ 
                  borderColor: 'var(--boston-gray-medium-dark)',
                  color: 'var(--boston-gray-dark)',
                  backgroundColor: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--boston-gray-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--boston-optimistic-blue)' }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.backgroundColor = 'var(--boston-charles-blue)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.currentTarget.style.backgroundColor = 'var(--boston-optimistic-blue)';
                  }
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for list sections
function ListSection({
  title,
  items,
  onAdd,
  onUpdate,
  onDelete,
}: {
  title: string;
  items: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--boston-charles-blue)' }}>{title}</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105"
          style={{ 
            backgroundColor: 'var(--boston-green)',
            color: 'white'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1e7e1e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--boston-green)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add {title.slice(0, -1)}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 group border-b border-dashed pb-1.5 transition-all hover:border-solid" style={{ borderColor: 'var(--boston-gray-medium)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--boston-gray-medium-dark)', flexShrink: 0 }}>
              <circle cx="7" cy="7" r="2" fill="currentColor"/>
            </svg>
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(index, e.target.value)}
              placeholder={`${title.slice(0, -1)} name`}
              className="flex-1 px-2 py-1 text-sm border-0 border-b border-dashed rounded-none focus:outline-none transition-colors"
              style={{ 
                borderColor: 'var(--boston-gray-medium)',
                color: 'var(--boston-gray-dark)',
                backgroundColor: 'transparent'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--boston-optimistic-blue)';
                e.currentTarget.style.borderStyle = 'solid';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--boston-gray-medium)';
                e.currentTarget.style.borderStyle = 'dashed';
              }}
            />
            <button
              onClick={() => onDelete(index)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all hover:bg-red-50"
              style={{ color: 'var(--boston-freedom-trail-red)' }}
              title={`Delete ${title.slice(0, -1).toLowerCase()}`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

