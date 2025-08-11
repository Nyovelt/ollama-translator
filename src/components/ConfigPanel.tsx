"use client";

import React, { useState } from "react";
import {
  LLMConfig,
  getAllLLMConfigs,
  DEFAULT_LLM_CONFIGS,
} from "@/types/translator";
import { MdSettings, MdClose, MdAdd, MdDelete } from "react-icons/md";

interface ConfigPanelProps {
  configs: LLMConfig[];
  selectedConfig: LLMConfig;
  onConfigsChange: (configs: LLMConfig[]) => void;
  onSelectedConfigChange: (config: LLMConfig) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  configs,
  selectedConfig,
  onConfigsChange,
  onSelectedConfigChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [formData, setFormData] = useState<Partial<LLMConfig>>({});

  const handleAddConfig = () => {
    const newConfig: LLMConfig = {
      id: `custom-${Date.now()}`,
      name: "Custom LLM",
      apiUrl: "http://localhost:11434",
      model: "llama3.1",
    };
    setEditingConfig(newConfig);
    setFormData(newConfig);
  };

  const handleEditConfig = (config: LLMConfig) => {
    setEditingConfig(config);
    setFormData(config);
  };

  const handleSaveConfig = () => {
    if (!formData.name || !formData.apiUrl || !formData.model) return;

    const configToSave: LLMConfig = {
      id: editingConfig?.id || `custom-${Date.now()}`,
      name: formData.name,
      apiUrl: formData.apiUrl,
      model: formData.model,
      apiKey: formData.apiKey,
      headers: formData.headers,
    };

    let newConfigs;
    if (editingConfig && configs.find((c) => c.id === editingConfig.id)) {
      newConfigs = configs.map((c) =>
        c.id === editingConfig.id ? configToSave : c
      );
    } else {
      newConfigs = [...configs, configToSave];
    }

    onConfigsChange(newConfigs);
    if (
      selectedConfig.id === configToSave.id ||
      !configs.find((c) => c.id === selectedConfig.id)
    ) {
      onSelectedConfigChange(configToSave);
    }
    setEditingConfig(null);
    setFormData({});
  };

  const handleDeleteConfig = (configId: string) => {
    const newConfigs = configs.filter((c) => c.id !== configId);
    onConfigsChange(newConfigs);
    if (selectedConfig.id === configId && newConfigs.length > 0) {
      onSelectedConfigChange(newConfigs[0]);
    }
  };

  const resetToDefaults = () => {
    const defaultConfigs = getAllLLMConfigs();
    onConfigsChange(defaultConfigs);
    onSelectedConfigChange(defaultConfigs[0]);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        title="Configure LLM Settings"
      >
        <MdSettings className="w-5 h-5" />
        <span className="hidden sm:inline">Settings</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">LLM Configuration</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    Available Configurations
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddConfig}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      <MdAdd className="w-4 h-4" />
                      Add
                    </button>
                    <button
                      onClick={resetToDefaults}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {configs.map((config) => (
                    <div
                      key={config.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedConfig.id === config.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => onSelectedConfigChange(config)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{config.name}</div>
                          <div className="text-sm text-gray-500">
                            {config.apiUrl} - {config.model}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditConfig(config);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <MdSettings className="w-4 h-4" />
                          </button>
                          {!DEFAULT_LLM_CONFIGS.some(
                            (dc: LLMConfig) => dc.id === config.id
                          ) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConfig(config.id);
                              }}
                              className="p-1 hover:bg-red-100 text-red-500 rounded"
                            >
                              <MdDelete className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {editingConfig && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">
                    {configs.find((c) => c.id === editingConfig.id)
                      ? "Edit"
                      : "Add"}{" "}
                    Configuration
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Configuration name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API URL
                      </label>
                      <input
                        type="text"
                        value={formData.apiUrl || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, apiUrl: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="http://localhost:11434"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={formData.model || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, model: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="llama3.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key (Optional)
                      </label>
                      <input
                        type="password"
                        value={formData.apiKey || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, apiKey: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="API key if required"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveConfig}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingConfig(null);
                          setFormData({});
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfigPanel;
