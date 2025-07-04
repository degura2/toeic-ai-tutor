
import React, { useState, useEffect } from 'react';
import { Level, VocabCategory, VocabType, VocabDBItem } from '../types';
import { GENERATOR_LEVELS, GENERATOR_CATEGORIES, ALL_LEVELS, ALL_CATEGORIES } from '../constants';
import CarIcon from '../components/icons/CarIcon';
import HeadphoneIcon from '../components/icons/HeadphoneIcon';
import LoadingSpinner from '../components/LoadingSpinner';
import { addVocabularyItems } from '../db';
import SentenceCompletionIcon from '../components/icons/SentenceCompletionIcon';
import TextCompletionIcon from '../components/icons/TextCompletionIcon';
import BookIcon from '../components/icons/BookIcon';
import BookOpenIcon from '../components/icons/BookOpenIcon';
import LayersIcon from '../components/icons/LayersIcon';
import SpellCheckIcon from '../components/icons/SpellCheckIcon';
import SettingsIcon from '../components/icons/SettingsIcon';
import InstallPwaInstructions from '../components/InstallPwaInstructions';
import { setApiKey as setGeminiApiKey } from '../services/geminiService';

interface HomeScreenProps {
  onStartVocabulary: (level: Level) => void;
  onStartReading: (level: Level) => void;
  onStartDrive: (level: Level) => void;
  onStartListening: (level: Level) => void;
  onStartPart5: (level: Level) => void;
  onStartPart6: (level: Level) => void;
  onStartBasicGrammar: () => void;
  onStartGrammarCheck: () => void;
  onViewWordList: () => void;
  onImportJson: () => Promise<any>;
  onAiCollect: (level: Level | typeof ALL_LEVELS, category: VocabCategory | typeof ALL_CATEGORIES, type: VocabType | 'all') => Promise<number>;
  dbWordCount: number;
  isInitializing: boolean;
  initStatus: string;
  isApiKeySet: boolean;
  onApiKeyUpdate: (isSet: boolean) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
    onStartVocabulary, 
    onStartReading, 
    onStartDrive, 
    onStartListening,
    onStartPart5,
    onStartPart6,
    onStartBasicGrammar,
    onStartGrammarCheck,
    onViewWordList,
    onImportJson,
    onAiCollect,
    dbWordCount, 
    isInitializing, 
    initStatus,
    isApiKeySet,
    onApiKeyUpdate
}) => {
  const [selectedLevel, setSelectedLevel] = useState<Level>(Level.Beginner);
  
  const [genLevel, setGenLevel] = useState<Level | typeof ALL_LEVELS>(ALL_LEVELS);
  const [genCategory, setGenCategory] = useState<VocabCategory | typeof ALL_CATEGORIES>(ALL_CATEGORIES);
  const [genType, setGenType] = useState<VocabType | 'all'>('word');
  const [batchCount, setBatchCount] = useState(20);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectStatus, setCollectStatus] = useState('');
  
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState('');
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('gemini-api-key');
    if (key) {
      setApiKeyInput(key);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
        setApiKeyStatus('API Key cannot be empty.');
        setTimeout(() => setApiKeyStatus(''), 3000);
        return;
    }
    localStorage.setItem('gemini-api-key', apiKeyInput);
    setGeminiApiKey(apiKeyInput);
    onApiKeyUpdate(true);
    setApiKeyStatus('API Key saved successfully!');
    setShowApiKeySetup(false); // Hide setup on save
    setTimeout(() => setApiKeyStatus(''), 3000);
  };
  
  const handleClearApiKey = () => {
      localStorage.removeItem('gemini-api-key');
      setGeminiApiKey('');
      onApiKeyUpdate(false);
      setApiKeyInput('');
      setShowApiKeySetup(true); // Show setup when cleared
      setApiKeyStatus('API Key cleared.');
      setTimeout(() => setApiKeyStatus(''), 3000);
  };

  const isDbReady = dbWordCount > 0 && !isInitializing;
  const isAiReady = isApiKeySet && !isInitializing;

  const dbDisabledTitle = isInitializing 
    ? "Please wait for initialization to complete." 
    : "Add vocabulary using the AI Generator or Import JSON to enable this mode.";
    
  const aiDisabledTitle = isInitializing
    ? "Please wait for initialization to complete."
    : "Please set your Gemini API Key to use this feature.";


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: VocabType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File could not be read");
        const data = JSON.parse(text);

        if (!data.vocabulary || !Array.isArray(data.vocabulary)) {
            alert('Invalid JSON format. Expected an object with a "vocabulary" array.');
            return;
        }
        
        const vocabItems: VocabDBItem[] = data.vocabulary.map((item: any) => ({...item, type}));
        const addedCount = await addVocabularyItems(vocabItems);
        alert(`Imported ${addedCount} new ${type}s. ${vocabItems.length - addedCount} duplicates were skipped.`);
        await onImportJson();

      } catch (error) {
        console.error(`Error importing ${type} JSON:`, error);
        alert(`Failed to import ${type} JSON. Please check the file format and console for errors.`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleAiCollectClick = async () => {
      setIsCollecting(true);
      let totalAdded = 0;
      for (let i = 1; i <= batchCount; i++) {
        setCollectStatus(`Batch ${i}/${batchCount}: Generating new items with AI...`);
        try {
            const addedCount = await onAiCollect(genLevel, genCategory, genType);
            totalAdded += addedCount;
            setCollectStatus(`Batch ${i}/${batchCount}: Success! Added ${addedCount} new items. Total so far: ${totalAdded}`);
        } catch (error: any) {
            console.error(`AI collection failed on batch ${i}:`, error);
            const errorMessage = error.message || "An error occurred.";
            setCollectStatus(`Batch ${i}/${batchCount}: Error - ${errorMessage}. Total added before error: ${totalAdded}`);
            setIsCollecting(false);
            return;
        }
      }
      setCollectStatus(`Finished! Added a total of ${totalAdded} new items across ${batchCount} batches.`);
      setIsCollecting(false);
  }

  const renderApiKeySection = () => {
      if (isApiKeySet && !showApiKeySetup) {
          return (
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg w-full mb-8 border border-slate-700 flex justify-between items-center">
                  <p className="text-slate-300">
                      <span className="font-bold text-green-400">✓</span> APIキーは設定済みです。
                  </p>
                  <button
                      onClick={() => setShowApiKeySetup(true)}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2"
                  >
                      <SettingsIcon className="w-5 h-5"/>
                      管理
                  </button>
              </div>
          );
      }
      
      return (
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg w-full mb-8 border border-slate-700">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2 justify-center">
                  API Key Setup
              </h2>
              <p className="text-slate-400 mb-4 text-sm">
                  {isApiKeySet 
                      ? 'Your Google Gemini API Key is set.'
                      : 'Please enter your Google Gemini API Key. Your key is stored locally and never sent to our servers.'
                  }
              </p>
              <div className="flex items-stretch gap-2 mb-3">
                  <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Enter your Gemini API Key"
                      className="flex-grow p-3 border border-slate-600 bg-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-white"
                      aria-label="API Key Input"
                  />
                  <button 
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-3 bg-slate-700 hover:bg-slate-600 rounded-md text-sm w-20"
                      aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
                  >
                      {showApiKey ? 'Hide' : 'Show'}
                  </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                      onClick={handleSaveApiKey}
                      className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed"
                      disabled={!apiKeyInput.trim()}
                  >
                      Save & Initialize
                  </button>
                  {isApiKeySet && (
                      <button 
                          onClick={handleClearApiKey}
                          className="flex-1 bg-rose-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-rose-700 transition shadow-md"
                      >
                          Clear Key
                      </button>
                  )}
              </div>
              {apiKeyStatus && <p className="text-sm text-center mt-3 text-yellow-300">{apiKeyStatus}</p>}
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <InstallPwaInstructions />
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2">TOEIC AI Tutor</h1>
        <p className="text-lg text-slate-600 mb-8">Your personal AI-powered TOEIC study partner.</p>

        {renderApiKeySection()}
        
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg w-full mb-8">
          <div className="mb-6">
            <label htmlFor="level-select" className="block text-xl font-medium text-slate-700 mb-3">
              1. Choose Your Level (For Practice Modes)
            </label>
            <select
              id="level-select"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as Level)}
              className="w-full p-4 border border-slate-300 rounded-lg bg-slate-50 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              {GENERATOR_LEVELS.filter(l => l !== ALL_LEVELS).map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="text-xl font-medium text-slate-700 mb-4">2. Choose Your Mode</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => onStartVocabulary(selectedLevel)} className="bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1" disabled={!isDbReady} title={!isDbReady ? dbDisabledTitle : ''}><LayersIcon className="w-7 h-7 mb-1"/>Vocabulary & Idioms</button>
              <button onClick={onStartBasicGrammar} className="bg-rose-500 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-rose-600 transition-transform transform hover:scale-105 shadow-md flex flex-col items-center justify-center gap-1 disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={!isAiReady} title={!isAiReady ? aiDisabledTitle : ""}><BookIcon className="w-7 h-7 mb-1"/>基礎文法</button>
              <button onClick={onStartGrammarCheck} className="bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-emerald-600 transition-transform transform hover:scale-105 shadow-md flex flex-col items-center justify-center gap-1 disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={!isAiReady} title={!isAiReady ? aiDisabledTitle : ""}><SpellCheckIcon className="w-7 h-7 mb-1"/>AI Grammar Check</button>
              <button onClick={() => onStartListening(selectedLevel)} className="bg-teal-500 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-teal-600 transition-transform transform hover:scale-105 shadow-md flex flex-col items-center justify-center gap-1 disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={!isAiReady} title={!isAiReady ? aiDisabledTitle : ''}><HeadphoneIcon className="w-7 h-7 mb-1"/>Listening Practice</button>
              <button onClick={() => onStartPart5(selectedLevel)} className="bg-amber-500 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-amber-600 transition-transform transform hover:scale-105 shadow-md flex flex-col items-center justify-center gap-1 disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={!isAiReady} title={!isAiReady ? aiDisabledTitle : ''}><SentenceCompletionIcon className="w-7 h-7 mb-1"/>Part 5: Completion</button>
              <button onClick={() => onStartPart6(selectedLevel)} className="bg-orange-500 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-orange-600 transition-transform transform hover:scale-105 shadow-md flex flex-col items-center justify-center gap-1 disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={!isAiReady} title={!isAiReady ? aiDisabledTitle : ''}><TextCompletionIcon className="w-7 h-7 mb-1"/>Part 6: Completion</button>
              <button onClick={() => onStartReading(selectedLevel)} className="bg-violet-500 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-violet-600 transition-transform transform hover:scale-105 shadow-md flex flex-col items-center justify-center gap-1 disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={!isAiReady} title={!isAiReady ? aiDisabledTitle : ''}><BookOpenIcon className="w-7 h-7 mb-1"/>Part 7: Reading</button>
              <button onClick={() => onStartDrive(selectedLevel)} className="bg-sky-500 text-white font-bold py-3 px-4 rounded-lg text-base hover:bg-sky-600 transition-transform transform hover:scale-105 shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1" disabled={!isDbReady} title={!isDbReady ? dbDisabledTitle : ''}><CarIcon className="w-7 h-7 mb-1"/>Vocabulary Drive</button>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg w-full mb-8">
            <h2 className="text-xl font-bold text-slate-700 mb-3">AI Vocabulary Generator</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 items-center">
                <select value={genLevel} onChange={e => setGenLevel(e.target.value as Level | typeof ALL_LEVELS)} className="p-2 border rounded-md bg-slate-50">
                    {GENERATOR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={genCategory} onChange={e => setGenCategory(e.target.value as VocabCategory | typeof ALL_CATEGORIES)} className="p-2 border rounded-md bg-slate-50">
                    {GENERATOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={genType} onChange={e => setGenType(e.target.value as VocabType | 'all')} className="p-2 border rounded-md bg-slate-50">
                    <option value="word">Word</option>
                    <option value="idiom">Idiom</option>
                    <option value="all">All</option>
                </select>
                <input 
                    type="number"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="p-2 border rounded-md bg-slate-50"
                    title="Number of batches (75 items per batch)"
                />
            </div>
             <button onClick={handleAiCollectClick} className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-indigo-700 transition shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={isCollecting || isInitializing || !isApiKeySet}>
                {isCollecting ? <LoadingSpinner /> : !isApiKeySet ? 'Set API Key to Generate' : `Generate ${batchCount * 75} New Items`}
            </button>
            {collectStatus && <p className="text-sm text-slate-600 mt-3">{collectStatus}</p>}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg w-full">
            <h2 className="text-xl font-bold text-slate-700 mb-2">Database Status</h2>
            {isInitializing ? (
                <p className="text-blue-600 bg-blue-100 p-3 rounded-md">{initStatus}</p>
            ) : (
                 <p className="text-lg">Total items in database: <span className="font-bold text-blue-600">{dbWordCount}</span></p>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-4">
                 <button onClick={onViewWordList} className="flex-1 bg-slate-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-slate-700 transition shadow-md disabled:bg-slate-400" disabled={!isDbReady} title={!isDbReady ? dbDisabledTitle : ""}>View Word List</button>
                 <label className={`flex-1 text-white font-bold py-3 px-6 rounded-lg text-lg text-center transition shadow-md ${isInitializing ? 'bg-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'}`}>
                    Import Words
                    <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'word')}
                        className="hidden"
                        accept=".json"
                        disabled={isInitializing}
                    />
                 </label>
                 <label className={`flex-1 text-white font-bold py-3 px-6 rounded-lg text-lg text-center transition shadow-md ${isInitializing ? 'bg-slate-400 cursor-not-allowed' : 'bg-fuchsia-600 hover:bg-fuchsia-700 cursor-pointer'}`}>
                    Import Idioms
                    <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'idiom')}
                        className="hidden"
                        accept=".json"
                        disabled={isInitializing}
                    />
                 </label>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
