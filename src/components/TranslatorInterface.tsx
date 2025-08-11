"use client";

import React, { useState, useEffect } from "react";
import {
  LLMConfig,
  DEFAULT_LLM_CONFIGS,
  DEFAULT_LANGUAGES,
  Language,
} from "@/types/translator";
import ConfigPanel from "./ConfigPanel";
import {
  MdSwapHoriz,
  MdTranslate,
  MdContentCopy,
  MdVolumeUp,
} from "react-icons/md";

const TranslatorInterface: React.FC = () => {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [isLoading, setIsLoading] = useState(false);
  const [configs, setConfigs] = useState<LLMConfig[]>(DEFAULT_LLM_CONFIGS);
  const [selectedConfig, setSelectedConfig] = useState<LLMConfig>(
    DEFAULT_LLM_CONFIGS[0]
  );
  const [error, setError] = useState<string | null>(null);

  // Load configs from localStorage on mount
  useEffect(() => {
    try {
      const savedConfigs = localStorage.getItem("llm-configs");
      const savedSelectedConfig = localStorage.getItem("selected-config");

      if (savedConfigs) {
        const parsedConfigs = JSON.parse(savedConfigs);
        setConfigs(parsedConfigs);

        if (savedSelectedConfig) {
          const parsedSelected = JSON.parse(savedSelectedConfig);
          const foundConfig = parsedConfigs.find(
            (c: LLMConfig) => c.id === parsedSelected.id
          );
          if (foundConfig) {
            setSelectedConfig(foundConfig);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load configs from localStorage:", error);
    }
  }, []);

  // Save configs to localStorage when they change
  useEffect(() => {
    localStorage.setItem("llm-configs", JSON.stringify(configs));
  }, [configs]);

  useEffect(() => {
    localStorage.setItem("selected-config", JSON.stringify(selectedConfig));
  }, [selectedConfig]);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sourceText,
          sourceLang,
          targetLang,
          config: selectedConfig,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Translation failed");
      }

      setTranslatedText(data.translatedText);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Translation failed";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang === "auto") return;

    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSpeakText = (text: string, lang: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MdTranslate className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Ollama Translator
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Using: <span className="font-medium">{selectedConfig.name}</span>
            </div>
            <ConfigPanel
              configs={configs}
              selectedConfig={selectedConfig}
              onConfigsChange={setConfigs}
              onSelectedConfigChange={setSelectedConfig}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Language Selection */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DEFAULT_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSwapLanguages}
            disabled={sourceLang === "auto"}
            className={`p-2 rounded-lg transition-colors ${
              sourceLang === "auto"
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:text-blue-500 hover:bg-blue-50"
            }`}
            title="Swap languages"
          >
            <MdSwapHoriz className="w-6 h-6" />
          </button>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DEFAULT_LANGUAGES.filter((lang) => lang.code !== "auto").map(
              (lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              )
            )}
          </select>
        </div>

        {/* Translation Interface */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Source Text */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium text-gray-700">
                {DEFAULT_LANGUAGES.find((l) => l.code === sourceLang)?.name ||
                  "Source"}
              </h3>
              <div className="flex gap-2">
                {sourceText && (
                  <>
                    <button
                      onClick={() => handleCopyText(sourceText)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Copy text"
                    >
                      <MdContentCopy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSpeakText(sourceText, sourceLang)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Listen"
                    >
                      <MdVolumeUp className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full h-64 p-4 resize-none focus:outline-none"
              maxLength={5000}
            />
            <div className="p-4 border-t flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {sourceText.length}/5000
              </span>
              <button
                onClick={handleTranslate}
                disabled={!sourceText.trim() || isLoading}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  !sourceText.trim() || isLoading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {isLoading ? "Translating..." : "Translate"}
              </button>
            </div>
          </div>

          {/* Translated Text */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium text-gray-700">
                {DEFAULT_LANGUAGES.find((l) => l.code === targetLang)?.name ||
                  "Translation"}
              </h3>
              <div className="flex gap-2">
                {translatedText && (
                  <>
                    <button
                      onClick={() => handleCopyText(translatedText)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Copy translation"
                    >
                      <MdContentCopy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleSpeakText(translatedText, targetLang)
                      }
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Listen"
                    >
                      <MdVolumeUp className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="h-64 p-4 overflow-y-auto">
              {error ? (
                <div className="text-red-500 text-sm">
                  <p className="font-medium">Translation Error:</p>
                  <p>{error}</p>
                </div>
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {translatedText ||
                    (isLoading
                      ? "Translating..."
                      : "Translation will appear here")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Info */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium mb-4">Current Configuration</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Name:</span>{" "}
              {selectedConfig.name}
            </div>
            <div>
              <span className="font-medium text-gray-700">Model:</span>{" "}
              {selectedConfig.model}
            </div>
            <div>
              <span className="font-medium text-gray-700">API URL:</span>{" "}
              {selectedConfig.apiUrl}
            </div>
            <div>
              <span className="font-medium text-gray-700">API Key:</span>{" "}
              {selectedConfig.apiKey ? "••••••••" : "Not set"}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TranslatorInterface;
